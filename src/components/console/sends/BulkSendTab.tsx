import { useState, useCallback, useEffect } from "react";
import { Upload, Send, Loader2, FileSpreadsheet, X, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { BotCatalog, getTranslation, getTemplatesForCompany } from "@/lib/doobotConfig";
import { sendTemplateMessage, formatMetaError } from "@/lib/metaApi";
import { saveMessage } from "@/lib/doobotApi";
import { useCreateBatch, useUpdateBatch, useUpdateSendStatus } from "@/hooks/useSends";
import { useAuth } from "@/hooks/useAuth";
import { useDoobotBots } from "@/hooks/useDoobotInfo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LANGUAGES = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
  { id: "ca", label: "Català" },
];

interface ParsedRow {
  phone: string;
  clientName?: string;
  vars: string[];
}

export function BulkSendTab() {
  const { profile } = useAuth();
  const companyName = profile?.company?.name || "";
  const templates = getTemplatesForCompany(companyName);

  const { data: botsData } = useDoobotBots();
  const dynamicBots = botsData?.map(b => ({
    id: b.BotProjectID || b.id || "",
    display: b.Name || b.display || b.id || ""
  })).filter(b => b.id) || [];
  const displayBots = dynamicBots.length > 0 ? dynamicBots : BotCatalog.entries;

  const [botId, setBotId] = useState("");

  useEffect(() => {
    if (displayBots.length > 0 && !botId) {
      setBotId(displayBots[0].id);
    }
  }, [displayBots, botId]);
  const [language, setLanguage] = useState("es");
  const [templateName, setTemplateName] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const updateSend = useUpdateSendStatus();

  // Set default template when the filtered list loads
  useEffect(() => {
    if (templates.length > 0 && !templateName) {
      setTemplateName(templates[0].name);
    }
  }, [templates, templateName]);

  const selectedTemplate = templates.find((t) => t.name === templateName) || null;
  const varCount = selectedTemplate?.variableCount ?? 0;

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array", cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

          // Helper para parsear números decimales de Excel (ej: 0.5 -> "12:00") o fechas
          const formatCell = (val: any) => {
            if (val instanceof Date) {
              return val.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
            }
            if (typeof val === "number" && val > 0 && val < 1) {
              const totalMinutes = Math.round(val * 24 * 60);
              const h = Math.floor(totalMinutes / 60);
              const m = totalMinutes % 60;
              return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
            }
            return String(val ?? "").trim();
          };

          // Skip header row, parse phone + clientName + variables starting at index 4
          const parsed: ParsedRow[] = [];
          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (!row || !row[0]) continue;
            const phone = String(row[0]).replace(/\D/g, "");
            if (!phone) continue;
            const clientName = formatCell(row[1]);
            const vars: string[] = [];
            for (let j = 0; j < varCount; j++) {
              vars.push(formatCell(row[4 + j]));
            }
            parsed.push({ phone, clientName, vars });
          }
          setRows(parsed);
          toast.success(`${parsed.length} destinatarios cargados`);
        } catch (err) {
          toast.error("Error al leer el archivo Excel");
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [varCount]
  );

  const [isDragging, setIsDragging] = useState(false);

  const handleClearFile = () => {
    setRows([]);
    setFileName("");
  };

  const handleSend = async () => {
    if (!rows.length) {
      toast.error("Sube un archivo Excel primero");
      return;
    }
    if (!selectedTemplate) {
      toast.error("Selecciona una plantilla");
      return;
    }

    setSending(true);
    setProgress({ sent: 0, failed: 0, total: rows.length });

    try {
      // 1. Create batch + all send records in DB
      const batch = await createBatch.mutateAsync({
        batch_type: "bulk",
        name: `Envío masivo — ${fileName || "Sin archivo"}`,
        bot_id: botId,
        language,
        template_name: templateName,
        file_name: fileName,
        total_count: rows.length,
        rows,
      });

      // 2. Fetch the created send records
      const { data: sendRecords } = await supabase
        .from("whatsapp_sends" as any)
        .select("id, phone, template_vars")
        .eq("batch_id", batch.id)
        .order("created_at");

      if (!sendRecords) throw new Error("No se pudieron cargar los registros de envío");

      // 3. Update batch to "sending"
      await updateBatch.mutateAsync({
        id: batch.id,
        updates: { status: "sending" } as any,
      });

      // 4. Send each one
      let sent = 0;
      let failed = 0;

      for (const record of sendRecords as any[]) {
        try {
          const vars = (record.template_vars as string[]) || [];
          const { saveBody } = await sendTemplateMessage(record.phone, selectedTemplate, language, vars);
          
          // Also save in Doobot conversations table
          try {
            await saveMessage({
              conversationId: record.phone,
              who: "PANEL",
              type: "template",
              body: saveBody,
            });
          } catch (dbErr) {
            console.warn("Could not save to Doobot conversations:", dbErr);
          }

          await updateSend.mutateAsync({ id: record.id, status: "sent" });
          sent++;
        } catch (err: any) {
          const readableError = formatMetaError(err.message);
          console.log("Raw error object:", err);
          console.error("Error en fila:", record.phone, readableError);
          await updateSend.mutateAsync({
            id: record.id,
            status: "failed",
            error_message: readableError,
          });
          failed++;
        }
        setProgress({ sent, failed, total: rows.length });

        // Rate limit: wait 1s between sends
        await new Promise((r) => setTimeout(r, 1000));
      }

      // 5. Update batch to completed
      await updateBatch.mutateAsync({
        id: batch.id,
        updates: { status: "completed", sent_count: sent, failed_count: failed } as any,
      });

      toast.success(`Envío masivo completado: ${sent} enviados, ${failed} fallidos`);
    } catch (err: any) {
      toast.error("Error en envío masivo: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sends-tab-content">
      <div className="sends-form">
        {/* Bot */}
        <div className="sends-field">
          <label>Bot *</label>
          <select value={botId} onChange={(e) => setBotId(e.target.value)}>
            {displayBots.map((b) => (
              <option key={b.id} value={b.id}>{b.display}</option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div className="sends-field">
          <label>Idioma</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Template (required for bulk) */}
        <div className="sends-field">
          <label>Plantilla *</label>
          <select value={templateName} onChange={(e) => {
            setTemplateName(e.target.value);
            setRows([]); setFileName(""); // reset file when template changes
          }}>
            {templates.map((t) => (
              <option key={t.name} value={t.name}>{t.displayName}</option>
            ))}
          </select>
        </div>

        {/* Template preview + variable mapping */}
        {selectedTemplate && (() => {
          const trans = getTranslation(selectedTemplate, language);
          let previewText = trans.bodyText;
          trans.exampleValues.forEach((val, i) => {
            previewText = previewText.replace(`{{${i + 1}}}`, val || `{{${i + 1}}}`);
          });
          return (
            <div className="sends-tpl-info">
              <div className="sends-tpl-vars">
                <label>Variables de la plantilla</label>
                <div className="sends-tpl-vars-list">
                  {Array.from({ length: selectedTemplate.variableCount }).map((_, i) => (
                    <div key={i} className="sends-tpl-var-row">
                      <span className="sends-tpl-var-tag">{`{{${i + 1}}}`}</span>
                      <span className="sends-tpl-var-arrow">→</span>
                      <span className="sends-tpl-var-example">{trans.exampleValues[i] ?? "—"}</span>
                      <span className="sends-tpl-var-col">Columna Excel: {String.fromCharCode(69 + i)} (col {5 + i})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sends-preview">
                <label>Vista previa de la plantilla</label>
                <div className="sends-preview-box">{previewText}</div>
              </div>
              {trans.buttons.length > 0 && (
                <div className="sends-tpl-buttons-preview">
                  <label>Botones</label>
                  <div className="sends-tpl-buttons-list">
                    {trans.buttons.map((btn, i) => (
                      <span key={i} className="sends-tpl-button-badge">
                        {btn.type === "URL" ? "🔗" : "↩️"} {btn.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* File upload */}
        <div className="sends-field">
          <label>
            Archivo Excel *
            <span className="sends-field-hint" style={{ marginLeft: 8 }}>
              Columnas: Teléfono (A), Nombre (B), Campaña (C), Fecha (D){varCount > 0 ? `, Var1 (E)...Var${varCount}` : ""}
            </span>
          </label>
          {fileName ? (
            <div className="sends-file-badge">
              <FileSpreadsheet size={16} />
              <span>{fileName}</span>
              <span className="sends-file-count">{rows.length} filas</span>
              <button onClick={handleClearFile} className="sends-file-remove">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label 
              className={`sends-file-upload ${isDragging ? "dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
            >
              <Upload size={18} />
              <span>{isDragging ? "Suelta el archivo aquí" : "Seleccionar o arrastrar archivo .xlsx"}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFile(e.target.files?.[0])}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

        {/* Preview rows */}
        {rows.length > 0 && (
          <div className="sends-preview">
            <label>Vista previa ({Math.min(5, rows.length)} de {rows.length})</label>
            <div className="sends-preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Teléfono</th>
                    <th>Nombre</th>
                    {Array.from({ length: varCount }).map((_, i) => (
                      <th key={i}>Var {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td>+{r.phone}</td>
                      <td>{r.clientName || "-"}</td>
                      {r.vars.map((v, j) => (
                        <td key={j}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Progress */}
        {sending && (
          <div className="sends-progress">
            <div className="sends-progress-bar">
              <div
                className="sends-progress-fill"
                style={{ width: `${((progress.sent + progress.failed) / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
            <div className="sends-progress-stats">
              <span className="sends-stat-sent">
                <CheckCircle2 size={12} /> {progress.sent} enviados
              </span>
              <span className="sends-stat-failed">
                <AlertCircle size={12} /> {progress.failed} fallidos
              </span>
              <span className="sends-stat-total">
                de {progress.total}
              </span>
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          className="sends-submit-btn"
          onClick={handleSend}
          disabled={sending || rows.length === 0}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          <span>{sending ? "Enviando..." : `Enviar a ${rows.length} destinatarios`}</span>
        </button>
      </div>
    </div>
  );
}
