import { useState, useCallback } from "react";
import {
  Upload, Clock, Loader2, FileSpreadsheet, X, Play, Pause,
  Trash2, Edit3, CheckCircle2, AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { BotCatalog, TemplateCatalog } from "@/lib/doobotConfig";
import { useBatches, useCreateBatch, useUpdateBatch, useDeleteBatch } from "@/hooks/useSends";
import { toast } from "sonner";

const LANGUAGES = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
  { id: "ca", label: "Català" },
];

interface ParsedRow {
  phone: string;
  vars: string[];
}

export function ScheduledSendTab() {
  const [botId, setBotId] = useState(BotCatalog.entries[0]?.id || "");
  const [language, setLanguage] = useState("es");
  const [templateName, setTemplateName] = useState(TemplateCatalog[0]?.name || "");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [batchName, setBatchName] = useState("");
  const [saving, setSaving] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: batches, isLoading: loadingBatches } = useBatches();
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();

  const selectedTemplate = TemplateCatalog.find((t) => t.name === templateName) || null;
  const varCount = selectedTemplate?.variableCount ?? 0;

  const scheduledBatches = (batches || []).filter((b) => b.batch_type === "scheduled");

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

          const parsed: ParsedRow[] = [];
          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (!row || !row[0]) continue;
            const phone = String(row[0]).replace(/\D/g, "");
            if (!phone) continue;
            const vars: string[] = [];
            for (let j = 1; j <= varCount; j++) {
              vars.push(String(row[j] ?? ""));
            }
            parsed.push({ phone, vars });
          }
          setRows(parsed);
          toast.success(`${parsed.length} destinatarios cargados`);
        } catch (err) {
          toast.error("Error al leer el archivo Excel");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [varCount]
  );

  const handleSave = async () => {
    if (!rows.length) {
      toast.error("Sube un archivo Excel");
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      toast.error("Selecciona fecha y hora de envío");
      return;
    }
    if (!templateName) {
      toast.error("Selecciona una plantilla");
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    setSaving(true);
    try {
      if (editingId) {
        // Update existing batch
        await updateBatch.mutateAsync({
          id: editingId,
          updates: {
            name: batchName || `Programado — ${fileName}`,
            bot_id: botId,
            language,
            template_name: templateName,
            file_name: fileName,
            total_count: rows.length,
            scheduled_at: scheduledAt,
          } as any,
        });
        toast.success("Envío programado actualizado");
        setEditingId(null);
      } else {
        await createBatch.mutateAsync({
          batch_type: "scheduled",
          name: batchName || `Programado — ${fileName}`,
          bot_id: botId,
          language,
          template_name: templateName,
          file_name: fileName,
          total_count: rows.length,
          scheduled_at: scheduledAt,
          rows,
        });
        toast.success("Envío programado creado");
      }

      // Reset form
      setRows([]);
      setFileName("");
      setScheduledDate("");
      setScheduledTime("");
      setBatchName("");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (batch: any) => {
    await updateBatch.mutateAsync({
      id: batch.id,
      updates: { is_active: !batch.is_active } as any,
    });
    toast.success(batch.is_active ? "Envío desactivado" : "Envío activado");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este envío programado?")) return;
    await deleteBatch.mutateAsync(id);
  };

  const handleEdit = (batch: any) => {
    setEditingId(batch.id);
    setBotId(batch.bot_id);
    setLanguage(batch.language);
    setTemplateName(batch.template_name);
    setBatchName(batch.name);
    if (batch.scheduled_at) {
      const d = new Date(batch.scheduled_at);
      setScheduledDate(d.toISOString().split("T")[0]);
      setScheduledTime(d.toISOString().split("T")[1].slice(0, 5));
    }
    setFileName(batch.file_name || "");
    setRows([]); // Can't reload rows from DB easily, user will re-upload
  };

  return (
    <div className="sends-tab-content">
      <div className="sends-form">
        {/* Batch name */}
        <div className="sends-field">
          <label>Nombre del envío</label>
          <input
            placeholder="Ej: Recordatorios Lunes"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
          />
        </div>

        {/* Bot */}
        <div className="sends-field">
          <label>Bot *</label>
          <select value={botId} onChange={(e) => setBotId(e.target.value)}>
            {BotCatalog.entries.map((b) => (
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

        {/* Template */}
        <div className="sends-field">
          <label>Plantilla *</label>
          <select value={templateName} onChange={(e) => {
            setTemplateName(e.target.value);
            setRows([]); setFileName("");
          }}>
            {TemplateCatalog.map((t) => (
              <option key={t.name} value={t.name}>{t.displayName}</option>
            ))}
          </select>
        </div>

        {/* Schedule */}
        <div className="sends-field-row">
          <div className="sends-field" style={{ flex: 1 }}>
            <label>Fecha *</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <div className="sends-field" style={{ flex: 1 }}>
            <label>Hora *</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
        </div>

        {/* File upload */}
        <div className="sends-field">
          <label>
            Archivo Excel *
            <span className="sends-field-hint" style={{ marginLeft: 8 }}>
              Columnas: teléfono{varCount > 0 ? `, var1...var${varCount}` : ""}
            </span>
          </label>
          {fileName && rows.length > 0 ? (
            <div className="sends-file-badge">
              <FileSpreadsheet size={16} />
              <span>{fileName}</span>
              <span className="sends-file-count">{rows.length} filas</span>
              <button onClick={() => { setRows([]); setFileName(""); }} className="sends-file-remove">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="sends-file-upload">
              <Upload size={18} />
              <span>Seleccionar archivo .xlsx</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                style={{ display: "none" }}
              />
            </label>
          )}
        </div>

        {/* Save Button */}
        <button
          className="sends-submit-btn"
          onClick={handleSave}
          disabled={saving || rows.length === 0}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
          <span>{editingId ? "Actualizar programación" : "Programar envío"}</span>
        </button>

        {editingId && (
          <button
            className="sends-cancel-btn"
            onClick={() => {
              setEditingId(null);
              setRows([]); setFileName(""); setScheduledDate(""); setScheduledTime(""); setBatchName("");
            }}
          >
            Cancelar edición
          </button>
        )}
      </div>

      {/* Scheduled batches list */}
      <div className="sends-scheduled-list">
        <h4 className="sends-section-title">Envíos programados</h4>
        {loadingBatches ? (
          <div className="sends-loading">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : scheduledBatches.length === 0 ? (
          <p className="sends-empty">No hay envíos programados</p>
        ) : (
          <div className="sends-batch-list">
            {scheduledBatches.map((batch) => (
              <div key={batch.id} className={`sends-batch-card ${!batch.is_active ? "inactive" : ""}`}>
                <div className="sends-batch-info">
                  <div className="sends-batch-name">{batch.name || "Sin nombre"}</div>
                  <div className="sends-batch-meta">
                    <span>{BotCatalog.displayFromId(batch.bot_id)}</span>
                    <span>·</span>
                    <span>{batch.total_count} dest.</span>
                    <span>·</span>
                    <span>
                      {batch.scheduled_at
                        ? new Date(batch.scheduled_at).toLocaleString("es-ES", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="sends-batch-status">
                    {batch.status === "completed" ? (
                      <span className="sends-badge sent"><CheckCircle2 size={12} /> Completado ({batch.sent_count}/{batch.total_count})</span>
                    ) : batch.is_active ? (
                      <span className="sends-badge active">Activo</span>
                    ) : (
                      <span className="sends-badge paused">Pausado</span>
                    )}
                  </div>
                </div>
                {batch.status !== "completed" && (
                  <div className="sends-batch-actions">
                    <button onClick={() => handleToggleActive(batch)} title={batch.is_active ? "Pausar" : "Activar"}>
                      {batch.is_active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => handleEdit(batch)} title="Editar">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(batch.id)} title="Eliminar" className="sends-batch-delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
