import type { ParsedMessage } from "@/hooks/useDoobotMessages";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function AudioPlayer({ audioUrl, audioId }: { audioUrl?: string; audioId?: string }) {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!audioId || (audioUrl && !audioUrl.includes("lookaside.fbsbx.com"))) {
      setSrc(audioUrl || "");
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    const loadMedia = async () => {
      try {
        const doobotCookie = localStorage.getItem("doobot_cookie") || "";
        const { data, error: invokeErr } = await supabase.functions.invoke("console-api", {
          body: { action: "meta:media", mediaId: audioId },
          headers: {
            "x-doobot-cookie": doobotCookie,
          },
        });
        if (invokeErr) throw invokeErr;
        if (data?.error) throw new Error(data.error);

        const { contentType, base64 } = data.data;
        if (!active) return;

        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: contentType });
        const objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (err) {
        console.error("Error loading Meta media audio:", err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMedia();

    return () => {
      active = false;
      if (src && src.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
    };
  }, [audioUrl, audioId]);

  if (loading) {
    return <div className="text-xs text-muted-foreground animate-pulse py-2">Cargando audio...</div>;
  }

  if (error) {
    return <div className="text-xs text-destructive py-2">Error al cargar audio</div>;
  }

  if (!src) return null;

  return (
    <audio
      src={src}
      controls
      controlsList="nodownload"
      preload="metadata"
      style={{ width: "100%", height: 40, minWidth: 220 }}
    />
  );
}

interface Props {
  message: ParsedMessage;
}

export function MessageBubble({ message }: Props) {
  const { profile } = useAuth();
  const agentName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Agente";

  const side = message.fromUser ? "from-panel" : "from-client";
  const whoLabel =
    message.who === "CLIENT"
      ? undefined
      : message.who === "BOT"
        ? "🤖 Bot"
        : message.who === "PANEL"
          ? `👤 Agente (${agentName})`
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

        {/* Audio */}
        {(message.audioUrl || message.audioId) && (
          <div className="console-msg-audio" style={{ marginBottom: 8 }}>
            <AudioPlayer audioUrl={message.audioUrl} audioId={message.audioId} />
          </div>
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
  // Try to extract dd-MM-yyyy HH:mm from formats like "dd-MM-yyyy HH:mm:ss"
  const match = raw.match(/(\d{2}-\d{2}-\d{4} \d{2}:\d{2})/);
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
