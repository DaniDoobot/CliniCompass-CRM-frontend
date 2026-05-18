import { useState, useRef, useEffect } from "react";
import { useDoobotMessages } from "@/hooks/useDoobotMessages";
import { MessageBubble } from "./MessageBubble";
import type { ChatItem } from "@/lib/doobotApi";
import { Send, Plus, Loader2, Info, MessageSquare } from "lucide-react";

interface Props {
  chat: ChatItem | null;
  onToggleInfo: () => void;
  onToggleMode: () => void;
  onSwitchToManual: () => void;
  onOpenSendOptions: () => void;
}

export function ChatView({ chat, onToggleInfo, onToggleMode, onSwitchToManual, onOpenSendOptions }: Props) {
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMsgCount = useRef(0);

  const { messages, isLoading, sendText } = useDoobotMessages(chat?.ConversationID ?? null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length === 0) return;
    const isNew = messages.length !== prevMsgCount.current;
    prevMsgCount.current = messages.length;
    if (isNew) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages]);

  // Focus input when chat changes, reset msg count but do NOT auto-scroll
  useEffect(() => {
    prevMsgCount.current = 0;
    inputRef.current?.focus();
  }, [chat?.ConversationID]);

  const handleSend = () => {
    if (!text.trim() || !chat?.ClientPhone || !chat?.ConversationID) return;

    // Auto-switch to manual when sending a message from console
    const currentMode = (chat.Mode ?? "auto").toLowerCase();
    if (currentMode === "auto") {
      onSwitchToManual();
    }

    sendText.mutate(
      { phone: chat.ClientPhone, text: text.trim() },
      { onSuccess: () => setText("") }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state
  if (!chat) {
    return (
      <div className="console-chat-view">
        <div className="console-empty-state">
          <MessageSquare size={64} strokeWidth={1} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4 }} />
          <p>Selecciona una conversación para empezar</p>
        </div>
      </div>
    );
  }

  const name = chat.ClientAlias || chat.ClientPhone || "Desconocido";
  const mode = (chat.Mode ?? "auto").toLowerCase();
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="console-chat-view">
      {/* Header */}
      <div className="console-chat-view-header">
        <div className="console-chat-avatar" style={{ width: 38, height: 38, fontSize: 13 }}>
          {initials}
        </div>
        <div className="console-chat-view-header-info">
          <h3>{name}</h3>
          <p>{chat.ClientPhone}</p>
        </div>
        <div
          className={`console-mode-toggle ${mode}`}
          onClick={onToggleMode}
          title={`Cambiar a ${mode === "auto" ? "manual" : "auto"}`}
        >
          <span className={`console-mode-label ${mode === "auto" ? "active" : ""}`}>Auto</span>
          <span className={`console-mode-label ${mode === "manual" ? "active" : ""}`}>Manual</span>
          <div className="console-mode-slider" />
        </div>
        <button className="console-attach-btn" onClick={onToggleInfo} title="Información">
          <Info size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="console-messages-area">
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            No hay mensajes en esta conversación
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="console-input-area">
        <button className="console-attach-btn" onClick={onOpenSendOptions} title="Envío avanzado">
          <Plus size={20} />
        </button>
        <input
          ref={inputRef}
          type="text"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sendText.isPending}
        />
        <button
          className="console-send-btn"
          onClick={handleSend}
          disabled={!text.trim() || sendText.isPending}
        >
          {sendText.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
