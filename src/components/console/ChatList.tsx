import { useState, useMemo } from "react";
import { useDoobotChats, useNewActivity, clearNewActivity, addNewActivity } from "@/hooks/useDoobotChats";
import { useUnreadBadge } from "@/hooks/useUnreadBadge";
import { ChatListItem } from "./ChatListItem";
import { Search, Loader2, MessageSquare, CheckCircle } from "lucide-react";
import type { ChatItem } from "@/lib/doobotApi";

type Tab = "no_leidos" | "entrantes" | "archivadas";

interface Props {
  selectedId: string | null;
  onSelect: (chat: ChatItem) => void;
  onModeToggled?: (conversationId: string, newMode: string) => void;
}

/** Parse a chat timestamp to epoch-ms for sorting. Avoids JS Date confusing dd-mm with mm-dd. */
export function parseDoobotTimestamp(ts: string | null): number {
  if (!ts) return 0;
  // Always try strict dd-MM-yyyy HH:mm:ss first
  const m = ts.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || '00'}`).getTime();
  }
  // Fallback
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d.getTime();
  return 0;
}

export function ChatList({ selectedId, onSelect, onModeToggled }: Props) {
  const [tab, setTab] = useState<Tab>("no_leidos");
  const [search, setSearch] = useState("");

  // Local detection of new messages (independent of API's MessagesNoRead)
  const newActivity = useNewActivity();

  // Always keep active chats polling
  const activeHook = useDoobotChats(false);
  // Only fetch archived when on that tab
  const isArchived = tab === "archivadas";
  const archivedHook = useDoobotChats(true, isArchived);

  const { chats, isLoading, toggleMode, setStatus, archive, unarchive, markRead, markUnread } =
    isArchived ? archivedHook : activeHook;

  /** Check if a conversation has unread: either API says so OR we locally detected new activity */
  const hasUnread = (c: ChatItem) => {
    const apiUnread = parseInt(c.MessagesNoRead ?? "0") > 0;
    const localUnread = c.ConversationID ? newActivity.has(c.ConversationID) : false;
    return apiUnread || localUnread;
  };

  const filtered = useMemo(() => {
    let list = [...chats];

    // Sort: unread first, then by most-recent activity
    list.sort((a, b) => {
      const aUnread = hasUnread(a) ? 1 : 0;
      const bUnread = hasUnread(b) ? 1 : 0;
      if (bUnread !== aUnread) return bUnread - aUnread;
      return parseDoobotTimestamp(b.LastMessageTimestamp) - parseDoobotTimestamp(a.LastMessageTimestamp);
    });

    // For "No leídos" filter conversations with unread messages (API or local)
    if (tab === "no_leidos") {
      list = list.filter(hasUnread);
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        (c.ClientAlias ?? "").toLowerCase().includes(q) ||
        (c.ClientPhone ?? "").includes(q) ||
        (c.Campaign ?? "").toLowerCase().includes(q) ||
        (c.Manager ?? "").toLowerCase().includes(q)
    );
  }, [chats, search, tab, newActivity]);

  // Count unread — always from active chats, using both API and local detection
  const unreadCount = useMemo(
    () => activeHook.chats.filter(hasUnread).length,
    [activeHook.chats, newActivity]
  );

  // Update favicon & document title with unread count
  useUnreadBadge(unreadCount);

  const handleSelect = (chat: ChatItem) => {
    // Clear local new-activity flag when user opens this conversation
    if (chat.ConversationID) clearNewActivity(chat.ConversationID);
    onSelect(chat);
  };

  const handleMarkUnread = (chat: ChatItem) => {
    if (chat.ConversationID) {
      markUnread.mutate(chat.ConversationID);
      addNewActivity(chat.ConversationID);
    }
  };

  const emptyMessage = () => {
    if (search) return "Sin resultados";
    if (tab === "no_leidos") return "No hay conversaciones sin leer";
    if (tab === "archivadas") return "No hay conversaciones archivadas";
    return "No hay conversaciones";
  };

  return (
    <div className="console-chat-list">
      {/* Header */}
      <div className="console-chat-list-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={20} style={{ color: 'hsl(var(--primary))' }} />
          Consola
        </h2>
        <div className="console-search">
          <Search size={16} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs: No leídos | Entrantes | Archivadas */}
      <div className="console-tabs">
        <button
          className={`console-tab ${tab === "no_leidos" ? "active" : ""}`}
          onClick={() => setTab("no_leidos")}
        >
          No leídos
          {unreadCount > 0 && (
            <span className="console-tab-badge">{unreadCount}</span>
          )}
        </button>
        <button
          className={`console-tab ${tab === "entrantes" ? "active" : ""}`}
          onClick={() => setTab("entrantes")}
        >
          Entrantes
        </button>
        <button
          className={`console-tab ${tab === "archivadas" ? "active" : ""}`}
          onClick={() => setTab("archivadas")}
        >
          Archivadas
        </button>
      </div>

      {/* List */}
      <div className="console-chat-items">
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            {emptyMessage()}
          </div>
        ) : (
          filtered.map((chat) => (
            <ChatListItem
              key={chat.ConversationID}
              chat={chat}
              isSelected={selectedId === chat.ConversationID}
              isArchived={isArchived}
              hasNewActivity={chat.ConversationID ? newActivity.has(chat.ConversationID) : false}
              onClick={() => handleSelect(chat)}
              onArchive={() => chat.ConversationID && archive.mutate(chat.ConversationID)}
              onUnarchive={() => chat.ConversationID && unarchive.mutate(chat.ConversationID)}
              onToggleMode={() => {
                if (chat.ConversationID) {
                  const currentMode = chat.Mode ?? "auto";
                  toggleMode.mutate(
                    { id: chat.ConversationID, currentMode },
                    {
                      onSuccess: () => {
                        const newMode = currentMode.toUpperCase() === "AUTO" ? "MANUAL" : "AUTO";
                        onModeToggled?.(chat.ConversationID!, newMode);
                      },
                    }
                  );
                }
              }}
              onChangeStatus={(status) =>
                chat.ConversationID && setStatus.mutate({ id: chat.ConversationID, status })
              }
              onMarkRead={() => {
                if (chat.ConversationID) {
                  markRead.mutate(chat.ConversationID);
                  clearNewActivity(chat.ConversationID);
                }
              }}
              onMarkUnread={() => handleMarkUnread(chat)}
            />
          ))
        )}
      </div>
    </div>
  );
}
