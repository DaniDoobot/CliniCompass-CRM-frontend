import type { ParsedMessage } from "@/hooks/useDoobotMessages";
import { FileText, Image, Video } from "lucide-react";

interface Props {
  message: ParsedMessage;
}

function formatTime(time: string): string {
  if (!time) return "";
  const d = new Date(time.trim().replace(/^(\d{2})-(\d{2})-(\d{4})/, "$3-$2-$1"));
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  const match = time.match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

export function MessageBubble({ message }: Props) {
  const { text, fromUser, time, buttons, isDocument, imageUrl, videoUrl, status, who } = message;

  return (
    <div className={`console-msg-row ${fromUser ? "from-panel" : "from-client"}`}>
      <div className="console-msg-bubble">
        {/* Indicador de quién envió */}
        {fromUser && who && who.toUpperCase() !== "BOT" && (
          <div className="console-msg-who">{who}</div>
        )}

        {/* Contenido */}
        {imageUrl ? (
          <div>
            <Image size={14} style={{ marginRight: 4 }} />
            <span style={{ fontSize: 12, opacity: 0.7 }}>Imagen</span>
            {text && <p style={{ marginTop: 4 }}>{text}</p>}
          </div>
        ) : videoUrl ? (
          <div>
            <Video size={14} style={{ marginRight: 4 }} />
            <span style={{ fontSize: 12, opacity: 0.7 }}>Vídeo</span>
            {text && <p style={{ marginTop: 4 }}>{text}</p>}
          </div>
        ) : isDocument ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={16} />
            <span>{text || "Documento"}</span>
          </div>
        ) : (
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{text}</p>
        )}

        {/* Botones */}
        {buttons && buttons.length > 0 && (
          <div className="console-msg-buttons">
            {buttons.map((b) => (
              <div key={b.id} className="console-msg-btn">{b.text}</div>
            ))}
          </div>
        )}

        {/* Footer: hora */}
        <div className="console-msg-time">
          <span>{formatTime(time)}</span>
          {fromUser && status && (
            <span style={{ marginLeft: 4, opacity: 0.7 }}>{status}</span>
          )}
        </div>
      </div>
    </div>
  );
}
