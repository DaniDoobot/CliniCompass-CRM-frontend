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
            <span style={{ marginLeft: 4, display: "inline-flex", alignItems: "center" }}>
              <StatusIcon status={message.status} />
            </span>
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

/** SVG double-check icon used for delivered/read */
function DoubleCheck({ blue }: { blue?: boolean }) {
  const color = blue ? "#4fc3f7" : "currentColor";
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ display: "inline", verticalAlign: "middle" }}>
      {/* first check */}
      <polyline points="1,5 4,8 9,2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* second check shifted right */}
      <polyline points="5,5 8,8 13,2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function SingleCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ display: "inline", verticalAlign: "middle" }}>
      <polyline points="1,5 4,8 9,2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status?.toLowerCase()) {
    case "sent":
      return <SingleCheck />;
    case "delivered":
      return <DoubleCheck />;
    case "read":
      return <DoubleCheck blue />;
    case "failed":
      return (
        <span style={{
          fontSize: 10,
          color: "#ef4444",
          fontWeight: 600,
          background: "rgba(239,68,68,0.1)",
          borderRadius: 4,
          padding: "1px 4px",
          marginLeft: 2,
          letterSpacing: 0.2,
        }}>
          Envío fallido
        </span>
      );
    default:
      return null;
  }
}
