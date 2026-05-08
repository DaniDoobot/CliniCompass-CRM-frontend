import { useState, useRef, useEffect } from "react";
import type { ChatItem } from "@/lib/doobotApi";
import { StatusCatalog } from "@/lib/doobotConfig";
import { Archive, ArchiveRestore, Eye, ToggleLeft, ToggleRight, Tag } from "lucide-react";

interface Props {
  chat: ChatItem;
  isSelected: boolean;
  isArchived: boolean;
  onClick: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onToggleMode: () => void;
  onChangeStatus: (status: string) => void;
  onMarkRead: () => void;
}

export function ChatListItem({
  chat,
  isSelected,
  isArchived,
  onClick,
  onArchive,
  onUnarchive,
  onToggleMode,
  onChangeStatus,
  onMarkRead,
}: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const name = chat.ClientAlias || chat.ClientPhone || "Desconocido";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const unread = parseInt(chat.MessagesNoRead ?? "0") || 0;
  const mode = (chat.Mode ?? "auto").toLowerCase();
  const statusDisplay = StatusCatalog.displayFromId(chat.Status);
  const time = formatChatTime(chat.LastMessageTimestamp);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        className={`console-chat-item ${isSelected ? "selected" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        <div className="console-chat-avatar">{initials}</div>
        <div className="console-chat-info">
          <div className="console-chat-name">
            {name}
            {chat.Manager && (
              <span style={{ fontSize: 11, fontWeight: 400, color: "hsl(var(--muted-foreground))", marginLeft: 6 }}>
                · {chat.Manager}
              </span>
            )}
          </div>
          <div className="console-chat-preview">
            <span className={`console-mode-badge ${mode}`}>{mode === "auto" ? "🤖" : "👤"}</span>
            {" "}{statusDisplay}
            {chat.Campaign && ` · ${chat.Campaign}`}
          </div>
        </div>
        <div className="console-chat-meta">
          <span className="console-chat-time">{time}</span>
          {unread > 0 && <span className="console-unread-badge">{unread}</span>}
        </div>
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="console-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x, position: "fixed" }}
        >
          <button className="console-context-item" onClick={(e) => { e.stopPropagation(); onMarkRead(); setContextMenu(null); }}>
            <Eye size={14} /> Marcar como leída
          </button>
          <button className="console-context-item" onClick={(e) => { e.stopPropagation(); onToggleMode(); setContextMenu(null); }}>
            {mode === "auto" ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            Cambiar a {mode === "auto" ? "Manual" : "Auto"}
          </button>
          {!isArchived ? (
            <button className="console-context-item" onClick={(e) => { e.stopPropagation(); onArchive(); setContextMenu(null); }}>
              <Archive size={14} /> Archivar
            </button>
          ) : (
            <button className="console-context-item" onClick={(e) => { e.stopPropagation(); onUnarchive(); setContextMenu(null); }}>
              <ArchiveRestore size={14} /> Desarchivar
            </button>
          )}
          {StatusCatalog.entries.map((s) => (
            <button
              key={s.id}
              className="console-context-item"
              onClick={(e) => { e.stopPropagation(); onChangeStatus(s.id); setContextMenu(null); }}
            >
              <Tag size={14} /> {s.display}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function formatChatTime(timestamp: string | null): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (!isNaN(d.getTime())) {
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  }
  const match = timestamp.match(/(\d{2}:\d{2})/);
  return match ? match[1] : timestamp.slice(0, 10);
}
