import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DoobotAuthProvider, useDoobotAuth } from "@/hooks/useDoobotAuth";
import { ChatList } from "@/components/console/ChatList";
import { ChatView } from "@/components/console/ChatView";
import { ConversationInfo } from "@/components/console/ConversationInfo";
import { SendOptionsDialog } from "@/components/console/SendOptionsDialog";
import { useDoobotChats, clearNewActivity, setViewedConversation } from "@/hooks/useDoobotChats";
import type { ChatItem } from "@/lib/doobotApi";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import "@/components/console/console.css";

function ConsoleContent() {
  const { isLoggedIn, isLoggingIn, loginError, login } = useDoobotAuth();
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);

  const { toggleMode } = useDoobotChats(false);

  // Login state
  if (isLoggingIn) {
    return (
      <AppLayout consoleMode>
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
      <AppLayout consoleMode>
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
            <button
              className="console-info-btn"
              onClick={login}
              style={{ marginTop: 8 }}
            >
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
          // Update local state
          setSelectedChat((prev) =>
            prev
              ? {
                  ...prev,
                  Mode: (prev.Mode ?? "auto").toUpperCase() === "AUTO" ? "MANUAL" : "AUTO",
                }
              : null
          );
        },
      }
    );
  };

  /** Switch to manual mode when user sends a message from console */
  const handleSwitchToManual = () => {
    if (!selectedChat?.ConversationID) return;
    if ((selectedChat.Mode ?? "auto").toUpperCase() === "AUTO") {
      toggleMode.mutate(
        { id: selectedChat.ConversationID, currentMode: "auto" },
        {
          onSuccess: () => {
            setSelectedChat((prev) =>
              prev ? { ...prev, Mode: "MANUAL" } : null
            );
          },
        }
      );
    }
  };

  return (
    <AppLayout consoleMode>
      <div className="console-root">
        {/* Left — Chat List */}
        <ChatList
          selectedId={selectedChat?.ConversationID ?? null}
          onSelect={(chat) => {
            setSelectedChat(chat);
            setViewedConversation(chat.ConversationID);
            setShowInfo(false);
          }}
          onModeToggled={(convId, newMode) => {
            // Sync selectedChat if the toggled chat is the currently viewed one
            setSelectedChat((prev) =>
              prev && prev.ConversationID === convId
                ? { ...prev, Mode: newMode }
                : prev
            );
          }}
        />

        {/* Center — Chat View */}
        <ChatView
          chat={selectedChat}
          onToggleInfo={() => setShowInfo((v) => !v)}
          onToggleMode={handleToggleMode}
          onSwitchToManual={handleSwitchToManual}
          onOpenSendOptions={() => setShowSendOptions(true)}
        />

        {/* Right — Info Panel */}
        {showInfo && selectedChat && (
          <ConversationInfo
            chat={selectedChat}
            onClose={() => setShowInfo(false)}
            onUpdate={(partial) => setSelectedChat(prev => prev ? { ...prev, ...partial } : null)}
          />
        )}

        {/* Send Options Dialog */}
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
