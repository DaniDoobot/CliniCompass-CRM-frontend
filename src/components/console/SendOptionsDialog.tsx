import { useState } from "react";
import { useDoobotMessages } from "@/hooks/useDoobotMessages";
import {
  getTranslation,
  getTemplatesForCompany,
  type TemplateDefinition,
} from "@/lib/doobotConfig";
import type { ChatItem } from "@/lib/doobotApi";
import { useAuth } from "@/hooks/useAuth";
import { X, Send, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  chat: ChatItem;
  onClose: () => void;
}

type Tab = "image" | "video" | "document" | "buttons" | "template";

export function SendOptionsDialog({ chat, onClose }: Props) {
  const { profile } = useAuth();
  const companyName = profile?.company?.name || "";
  const templates = getTemplatesForCompany(companyName);

  const [tab, setTab] = useState<Tab>("image");
  const { sendImage, sendVideo, sendDocument, sendButtons, sendTemplate } = useDoobotMessages(
    chat.ConversationID
  );

  const phone = chat.ClientPhone ?? "";

  // File upload state
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "document") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const randomId = Math.random().toString(36).substring(2, 15);
      const safeName = `${Date.now()}-${randomId}.${fileExt}`;
      const filePath = `${chat.ConversationID}/${safeName}`;

      const { data, error } = await supabase.storage
        .from("chat-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("chat-media")
        .getPublicUrl(filePath);

      if (type === "image") {
        setImgUrl(publicUrl);
      } else if (type === "video") {
        setVidUrl(publicUrl);
      } else if (type === "document") {
        setDocUrl(publicUrl);
        if (!docFilename) {
          setDocFilename(file.name);
        }
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      alert("Error al subir archivo: " + (error.message || error));
    } finally {
      setUploading(false);
    }
  };

  // Image state
  const [imgUrl, setImgUrl] = useState("");

  const [imgCaption, setImgCaption] = useState("");

  // Video state
  const [vidUrl, setVidUrl] = useState("");
  const [vidCaption, setVidCaption] = useState("");

  // Document state
  const [docUrl, setDocUrl] = useState("");
  const [docCaption, setDocCaption] = useState("");
  const [docFilename, setDocFilename] = useState("");

  // Buttons state
  const [btnBody, setBtnBody] = useState("");
  const [buttons, setButtons] = useState([
    { id: "btn_1", text: "" },
    { id: "btn_2", text: "" },
  ]);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(null);
  const [tplVars, setTplVars] = useState<string[]>([]);
  const [tplLang] = useState("es");

  const isPending =
    sendImage.isPending ||
    sendVideo.isPending ||
    sendDocument.isPending ||
    sendButtons.isPending ||
    sendTemplate.isPending;

  const handleSend = () => {
    const onSuccess = () => onClose();

    switch (tab) {
      case "image":
        if (!imgUrl) return;
        sendImage.mutate({ phone, url: imgUrl, caption: imgCaption }, { onSuccess });
        break;
      case "video":
        if (!vidUrl) return;
        sendVideo.mutate({ phone, url: vidUrl, caption: vidCaption }, { onSuccess });
        break;
      case "document":
        if (!docUrl) return;
        sendDocument.mutate(
          { phone, url: docUrl, caption: docCaption, filename: docFilename },
          { onSuccess }
        );
        break;
      case "buttons":
        if (!btnBody || buttons.every((b) => !b.text)) return;
        sendButtons.mutate(
          { phone, bodyText: btnBody, buttons: buttons.filter((b) => b.text.trim()) },
          { onSuccess }
        );
        break;
      case "template":
        if (!selectedTemplate) return;
        sendTemplate.mutate(
          { phone, template: selectedTemplate, languageCode: tplLang, variables: tplVars },
          { onSuccess }
        );
        break;
    }
  };

  const handleTemplateSelect = (name: string) => {
    const tpl = templates.find((t) => t.name === name);
    setSelectedTemplate(tpl ?? null);
    if (tpl) {
      const trans = getTranslation(tpl, tplLang);
      setTplVars(trans.exampleValues.map(() => ""));
    }
  };

  // Template preview
  const tplPreview = selectedTemplate
    ? (() => {
        const trans = getTranslation(selectedTemplate, tplLang);
        let text = trans.bodyText;
        tplVars.forEach((v, i) => {
          text = text.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`);
        });
        return text;
      })()
    : "";

  const tabs: { key: Tab; label: string }[] = [
    { key: "image", label: "🖼️ Imagen" },
    { key: "video", label: "🎬 Vídeo" },
    { key: "document", label: "📄 Documento" },
    { key: "buttons", label: "🔘 Botones" },
    { key: "template", label: "📋 Plantilla" },
  ];

  return (
    <div className="console-send-dialog-overlay" onClick={onClose}>
      <div className="console-send-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="console-send-dialog-header">
          <h3>Envío avanzado</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="console-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`console-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="console-send-dialog-body">
          {tab === "image" && (
            <>
              <div className="console-send-field">
                <label>URL de la imagen *</label>
                <div className="console-upload-btn-container">
                  <input
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={imgUrl}
                    onChange={(e) => setImgUrl(e.target.value)}
                  />
                  <label className={`console-upload-label-btn ${uploading ? "disabled" : ""}`}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Subir
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "image")}
                      disabled={uploading}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
              <div className="console-send-field">
                <label>Caption (opcional)</label>
                <input
                  placeholder="Texto debajo de la imagen"
                  value={imgCaption}
                  onChange={(e) => setImgCaption(e.target.value)}
                />
              </div>
            </>
          )}

          {tab === "video" && (
            <>
              <div className="console-send-field">
                <label>URL del vídeo *</label>
                <div className="console-upload-btn-container">
                  <input
                    placeholder="https://ejemplo.com/video.mp4"
                    value={vidUrl}
                    onChange={(e) => setVidUrl(e.target.value)}
                  />
                  <label className={`console-upload-label-btn ${uploading ? "disabled" : ""}`}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Subir
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileUpload(e, "video")}
                      disabled={uploading}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
              <div className="console-send-field">
                <label>Caption (opcional)</label>
                <input
                  placeholder="Pie de vídeo"
                  value={vidCaption}
                  onChange={(e) => setVidCaption(e.target.value)}
                />
              </div>
            </>
          )}

          {tab === "document" && (
            <>
              <div className="console-send-field">
                <label>URL del documento *</label>
                <div className="console-upload-btn-container">
                  <input
                    placeholder="https://ejemplo.com/documento.pdf"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                  />
                  <label className={`console-upload-label-btn ${uploading ? "disabled" : ""}`}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Subir
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      onChange={(e) => handleFileUpload(e, "document")}
                      disabled={uploading}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>
              <div className="console-send-field">
                <label>Nombre del archivo</label>
                <input
                  placeholder="presupuesto.pdf"
                  value={docFilename}
                  onChange={(e) => setDocFilename(e.target.value)}
                />
              </div>
              <div className="console-send-field">
                <label>Caption (opcional)</label>
                <input
                  placeholder="Descripción del documento"
                  value={docCaption}
                  onChange={(e) => setDocCaption(e.target.value)}
                />
              </div>
            </>
          )}

          {tab === "buttons" && (
            <>
              <div className="console-send-field">
                <label>Texto del cuerpo *</label>
                <textarea
                  placeholder="¿Puedes confirmar tu cita?"
                  value={btnBody}
                  onChange={(e) => setBtnBody(e.target.value)}
                />
              </div>
              {buttons.map((btn, i) => (
                <div className="console-send-field" key={i}>
                  <label>Botón {i + 1}</label>
                  <input
                    placeholder={`Texto del botón ${i + 1}`}
                    value={btn.text}
                    onChange={(e) => {
                      const copy = [...buttons];
                      copy[i] = { ...copy[i], text: e.target.value };
                      setButtons(copy);
                    }}
                  />
                </div>
              ))}
              {buttons.length < 3 && (
                <button
                  className="console-info-btn"
                  onClick={() =>
                    setButtons([...buttons, { id: `btn_${buttons.length + 1}`, text: "" }])
                  }
                >
                  + Añadir botón
                </button>
              )}
            </>
          )}

          {tab === "template" && (
            <>
              <div className="console-send-field">
                <label>Plantilla verificada *</label>
                <select
                  value={selectedTemplate?.name ?? ""}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                >
                  <option value="">Seleccionar plantilla...</option>
                  {templates.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate &&
                Array.from({ length: selectedTemplate.variableCount }).map((_, i) => (
                  <div className="console-send-field" key={i}>
                    <label>
                      Variable {`{{${i + 1}}}`}
                      <span style={{ fontWeight: 400, marginLeft: 8, color: "hsl(var(--muted-foreground))" }}>
                        Ej: {getTranslation(selectedTemplate, tplLang).exampleValues[i] ?? ""}
                      </span>
                    </label>
                    <input
                      placeholder={getTranslation(selectedTemplate, tplLang).exampleValues[i] ?? ""}
                      value={tplVars[i] ?? ""}
                      onChange={(e) => {
                        const copy = [...tplVars];
                        copy[i] = e.target.value;
                        setTplVars(copy);
                      }}
                    />
                  </div>
                ))}

              {tplPreview && (
                <>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 6 }}>
                    Vista previa
                  </label>
                  <div className="console-send-preview">{tplPreview}</div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="console-send-dialog-footer">
          <button
            className="console-info-btn"
            onClick={onClose}
            style={{ color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }}
          >
            Cancelar
          </button>
          <button
            className="console-send-btn"
            onClick={handleSend}
            disabled={isPending}
            style={{ borderRadius: 8, width: "auto", height: "auto", padding: "8px 20px", gap: 6 }}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span style={{ fontSize: 13, fontWeight: 600 }}>Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
