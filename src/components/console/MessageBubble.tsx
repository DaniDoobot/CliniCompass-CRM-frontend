import type { ParsedMessage } from "@/hooks/useDoobotMessages";

interface Props {
  message: ParsedMessage;
}

export function MessageBubble({ message }: Props) {
  const side = message.fromUser ? "from-panel" : "from-client";
  const whoLabel =
    message.who === "CLIENT"
      ? undefined
      : message.who === "BOT"
        ? "🤖 Bot"
        : message.who === "PANEL"
          ? "👤 Agente"
          : message.who ?? undefined;

  return (
    <div className={`console-msg-row ${side}`}>
      <div className={`console-msg-bubble ${message.isDocument ? "document" : ""}`}>
        {/* Who label for outgoing messages */}
        {message.fromUser && whoLabel && (
          <div className="console-msg-who">{whoLabel}</div>
        )}

        {/* Image */}
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Imagen"
            className="console-msg-image"
            loading="lazy"
          />
        )}

        {/* Video */}
        {message.videoUrl && (
          <video
            src={message.videoUrl}
            controls
            className="console-msg-video"
            preload="metadata"
          />
        )}

        {/* Text */}
        {message.text && (
          <div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div>
        )}

        {/* Buttons */}
        {message.buttons && message.buttons.length > 0 && (
          <div className="console-msg-buttons">
            {message.buttons.map((btn, i) => (
              <div key={i} className="console-msg-btn">
                {btn.text}
              </div>
            ))}
          </div>
        )}

        {/* Time */}
        <div className="console-msg-time">
          {formatTime(message.time)}
          {message.fromUser && message.status && (
            <span style={{ marginLeft: 4 }}>{statusIcon(message.status)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(raw: string): string {
  if (!raw) return "";
  // Try to extract HH:mm from formats like "dd-MM-yyyy HH:mm:ss"
  const match = raw.match(/(\d{2}:\d{2})/);
  return match ? match[1] : raw;
}

function statusIcon(status: string): string {
  switch (status?.toLowerCase()) {
    case "sent":
      return "✓";
    case "delivered":
      return "✓✓";
    case "read":
      return "✓✓"; // would be blue in a real impl
    case "failed":
      return "⚠️";
    default:
      return "";
  }
}
