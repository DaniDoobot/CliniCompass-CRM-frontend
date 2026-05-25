import { useState } from "react";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { BotCatalog, getTranslation, getTemplatesForCompany } from "@/lib/doobotConfig";
import { sendTemplateMessage, sendTextMessage, buildSaveBody, formatMetaError } from "@/lib/metaApi";
import { saveMessage } from "@/lib/doobotApi";
import { useCreateManualSend, useUpdateSendStatus } from "@/hooks/useSends";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const LANGUAGES = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
  { id: "ca", label: "Català" },
];

export function ManualSendTab() {
  const { profile } = useAuth();
  const companyName = profile?.company?.name || "";
  const templates = getTemplatesForCompany(companyName);

  const [phone, setPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [botId, setBotId] = useState(BotCatalog.entries[0]?.id || "");
  const [language, setLanguage] = useState("es");
  const [templateName, setTemplateName] = useState("");
  const [tplVars, setTplVars] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const createSend = useCreateManualSend();
  const updateStatus = useUpdateSendStatus();

  const selectedTemplate = templates.find((t) => t.name === templateName) || null;

  const handleTemplateChange = (name: string) => {
    setTemplateName(name);
    const tpl = templates.find((t) => t.name === name);
    if (tpl) {
      const trans = getTranslation(tpl, language);
      setTplVars(trans.exampleValues.map(() => ""));
    } else {
      setTplVars([]);
    }
  };

  // Template preview
  const preview = selectedTemplate
    ? (() => {
        const trans = getTranslation(selectedTemplate, language);
        let text = trans.bodyText;
        tplVars.forEach((v, i) => {
          text = text.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`);
        });
        return text;
      })()
    : "";

  const handleSend = async () => {
    if (!phone.trim()) {
      toast.error("El teléfono es obligatorio");
      return;
    }
    if (!botId) {
      toast.error("Selecciona un bot");
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // 1. Create DB record
      const record = await createSend.mutateAsync({
        phone: phone.trim(),
        client_name: clientName.trim(),
        bot_id: botId,
        language,
        template_name: templateName || undefined,
        template_vars: tplVars.length > 0 ? tplVars : undefined,
      });

      // 2. Send via Meta API
      try {
        let saveBody: string;

        if (selectedTemplate) {
          const { metaResponse, saveBody: tplSaveBody } = await sendTemplateMessage(phone.trim(), selectedTemplate, language, tplVars);
          saveBody = tplSaveBody;
        } else {
          const msgText = `Hola${clientName ? ` ${clientName}` : ""}`;
          await sendTextMessage(phone.trim(), msgText);
          saveBody = buildSaveBody(phone.trim(), "text", { text: { body: msgText } });
        }

        // 3. Also save in Doobot conversations table
        try {
          await saveMessage({
            conversationId: phone.trim(), // will match or create by phone
            who: "PANEL",
            type: selectedTemplate ? "template" : "text",
            body: saveBody,
          });
        } catch (dbErr) {
          console.warn("Could not save to Doobot conversations:", dbErr);
        }

        // 4. Update status to sent
        await updateStatus.mutateAsync({ id: record.id, status: "sent" });
        setResult({ ok: true, msg: "Mensaje enviado correctamente" });
        toast.success("Mensaje enviado");

        // Reset form
        setPhone("");
        setClientName("");
        setTplVars(selectedTemplate ? getTranslation(selectedTemplate, language).exampleValues.map(() => "") : []);
      } catch (sendErr: any) {
        const readableError = formatMetaError(sendErr.message);
        await updateStatus.mutateAsync({
          id: record.id,
          status: "failed",
          error_message: readableError,
        });
        setResult({ ok: false, msg: readableError });
        toast.error("Error al enviar: " + readableError);
      }
    } catch (err: any) {
      setResult({ ok: false, msg: err.message });
      toast.error("Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sends-tab-content">
      <div className="sends-form">
        {/* Phone */}
        <div className="sends-field">
          <label>Teléfono *</label>
          <input
            type="tel"
            placeholder="34612345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <span className="sends-field-hint">Con prefijo de país, sin + ni espacios</span>
        </div>

        {/* Client Name */}
        <div className="sends-field">
          <label>Nombre del cliente</label>
          <input
            placeholder="Juan García"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
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

        {/* Template (optional) */}
        <div className="sends-field">
          <label>Plantilla <span className="sends-optional">(opcional)</span></label>
          <select value={templateName} onChange={(e) => handleTemplateChange(e.target.value)}>
            <option value="">Sin plantilla (mensaje libre)</option>
            {templates.map((t) => (
              <option key={t.name} value={t.name}>{t.displayName}</option>
            ))}
          </select>
        </div>

        {/* Template variables */}
        {selectedTemplate &&
          Array.from({ length: selectedTemplate.variableCount }).map((_, i) => (
            <div className="sends-field" key={i}>
              <label>
                Variable {`{{${i + 1}}}`}
                <span className="sends-field-hint" style={{ marginLeft: 8 }}>
                  Ej: {getTranslation(selectedTemplate, language).exampleValues[i]}
                </span>
              </label>
              <input
                placeholder={getTranslation(selectedTemplate, language).exampleValues[i]}
                value={tplVars[i] ?? ""}
                onChange={(e) => {
                  const copy = [...tplVars];
                  copy[i] = e.target.value;
                  setTplVars(copy);
                }}
              />
            </div>
          ))}

        {/* Preview */}
        {preview && (
          <div className="sends-preview">
            <label>Vista previa</label>
            <div className="sends-preview-box">{preview}</div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`sends-result ${result.ok ? "success" : "error"}`}>
            {result.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{result.msg}</span>
          </div>
        )}

        {/* Send Button */}
        <button className="sends-submit-btn" onClick={handleSend} disabled={sending}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          <span>Enviar mensaje</span>
        </button>
      </div>
    </div>
  );
}
