import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DoobotAuthProvider, useDoobotAuth } from "@/hooks/useDoobotAuth";
import { ChatList } from "@/components/console/ChatList";
import { ChatView } from "@/components/console/ChatView";
import { ConversationInfo } from "@/components/console/ConversationInfo";
import { SendOptionsDialog } from "@/components/console/SendOptionsDialog";
import { useDoobotChats } from "@/hooks/useDoobotChats";
import type { ChatItem } from "@/lib/doobotApi";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import "@/components/console/console.css";

function ConsoleContent() {
  const { isLoggedIn, isLoggingIn, loginError, login } = useDoobotAuth();
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);

  const { toggleMode } = useDoobotChats(false);

  if (isLoggingIn) {
    return (
      <AppLayout>
        <div className="console-root">
          <div className="console-login-state">
            <div className="spinner" />
            <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>
              Conectando con doobot...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <AppLayout>
        <div className="console-root">
          <div className="console-login-state">
            <AlertCircle size={48} style={{ color: "hsl(var(--destructive))", opacity: 0.6 }} />
            <p style={{ fontSize: 14, color: "hsl(var(--foreground))" }}>
              No se pudo conectar con doobot
            </p>
            {loginError && (
              <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", maxWidth: 400, textAlign: "center" }}>
                {loginError}
              </p>
            )}
            <button className="console-info-btn" onClick={login} style={{ marginTop: 8 }}>
              <RefreshCw size={14} /> Reintentar
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleToggleMode = () => {
    if (!selectedChat?.ConversationID) return;
    toggleMode.mutate(
      { id: selectedChat.ConversationID, currentMode: selectedChat.Mode ?? "auto" },
      {
        onSuccess: () => {
          setSelectedChat((prev) =>
            prev
              ? { ...prev, Mode: (prev.Mode ?? "auto").toUpperCase() === "AUTO" ? "MANUAL" : "AUTO" }
              : null
          );
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="console-root">
        {/* Izquierda — Lista de conversaciones */}
        <ChatList
          selectedId={selectedChat?.ConversationID ?? null}
          onSelect={(chat) => {
            setSelectedChat(chat);
            setShowInfo(false);
          }}
        />

        {/* Centro — Vista de mensajes */}
        <ChatView
          chat={selectedChat}
          onToggleInfo={() => setShowInfo((v) => !v)}
          onToggleMode={handleToggleMode}
          onOpenSendOptions={() => setShowSendOptions(true)}
        />

        {/* Derecha — Panel de info del contacto */}
        {showInfo && selectedChat && (
          <ConversationInfo
            chat={selectedChat}
            onClose={() => setShowInfo(false)}
          />
        )}

        {/* Diálogo de envío avanzado */}
        {showSendOptions && selectedChat && (
          <SendOptionsDialog
            chat={selectedChat}
            onClose={() => setShowSendOptions(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}

export default function ConsolePage() {
  return (
    <DoobotAuthProvider>
      <ConsoleContent />
    </DoobotAuthProvider>
  );
}
