import { useState, useRef, useEffect } from "react";
import type { ChatItem } from "@/lib/doobotApi";
import { StatusCatalog } from "@/lib/doobotConfig";
import { Archive, ArchiveRestore, Eye, EyeOff, Tag } from "lucide-react";
import { parseDoobotTimestamp } from "./ChatList";

interface Props {
  chat: ChatItem;
  isSelected: boolean;
  isArchived: boolean;
  hasNewActivity?: boolean;
  onClick: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onToggleMode: () => void;
  onChangeStatus: (status: string) => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
}

export function ChatListItem({
  chat,
  isSelected,
  isArchived,
  hasNewActivity = false,
  onClick,
  onArchive,
  onUnarchive,
  onToggleMode,
  onChangeStatus,
  onMarkRead,
  onMarkUnread,
}: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const name = chat.ClientAlias || chat.ClientPhone || "Desconocido";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const unread = parseInt(chat.MessagesNoRead ?? "0") || 0;
  const mode = (chat.Mode ?? "auto").toLowerCase();
  const statusDisplay = StatusCatalog.displayFromId(chat.Status);

  const time = formatChatTime(chat.LastMessageTimestamp);

  // Close context menu on outside click
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

  const handleModeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMode();
  };

  return (
    <>
      <div
        className={`console-chat-item ${isSelected ? "selected" : ""} ${hasNewActivity ? "new-activity" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        {/* Avatar */}
        <div className="console-chat-avatar">
          {initials}
          {hasNewActivity && <span className="console-new-dot" />}
        </div>

        {/* Info */}
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
            {statusDisplay}
            {chat.Campaign && ` · ${chat.Campaign}`}
          </div>
        </div>

        {/* Meta — time, mode pill, unread badge */}
        <div className="console-chat-meta">
          <span className="console-chat-time">{time}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <button
              className={`console-mode-pill ${mode}`}
              onClick={handleModeClick}
              title={`Cambiar a ${mode === "auto" ? "manual" : "auto"}`}
            >
              {mode === "auto" ? "Auto" : "Manual"}
            </button>
            {(unread > 0 || hasNewActivity) && (
              <span className="console-unread-badge">{unread > 0 ? unread : "●"}</span>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="console-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x, position: "fixed" }}
        >
          <button className="console-context-item" onClick={(e) => { e.stopPropagation(); onMarkRead(); setContextMenu(null); }}>
            <Eye size={14} /> Marcar como leída
          </button>
          <button className="console-context-item" onClick={(e) => { e.stopPropagation(); onMarkUnread(); setContextMenu(null); }}>
            <EyeOff size={14} /> Marcar como no leída
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
          {/* Status sub-options */}
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
  const timeMs = parseDoobotTimestamp(timestamp);
  if (!timeMs) return "";
  
  const d = new Date(timeMs);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  if (isToday) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
