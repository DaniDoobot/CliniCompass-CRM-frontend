import { useState, useMemo } from "react";
import { useDoobotChats } from "@/hooks/useDoobotChats";
import { ChatListItem } from "./ChatListItem";
import { Search, Loader2 } from "lucide-react";
import type { ChatItem } from "@/lib/doobotApi";

interface Props {
  selectedId: string | null;
  onSelect: (chat: ChatItem) => void;
}

export function ChatList({ selectedId, onSelect }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const { chats, isLoading, toggleMode, setStatus, archive, unarchive, markRead } =
    useDoobotChats(showArchived);

  const filtered = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter(
      (c) =>
        (c.ClientAlias ?? "").toLowerCase().includes(q) ||
        (c.ClientPhone ?? "").includes(q) ||
        (c.Campaign ?? "").toLowerCase().includes(q) ||
        (c.Manager ?? "").toLowerCase().includes(q)
    );
  }, [chats, search]);

  return (
    <div className="console-chat-list">
      <div className="console-chat-list-header">
        <h2>💬 Consola</h2>
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

      <div className="console-tabs">
        <button className={`console-tab ${!showArchived ? "active" : ""}`} onClick={() => setShowArchived(false)}>
          Activas
        </button>
        <button className={`console-tab ${showArchived ? "active" : ""}`} onClick={() => setShowArchived(true)}>
          Archivadas
        </button>
      </div>

      <div className="console-chat-items">
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            {search ? "Sin resultados" : showArchived ? "No hay conversaciones archivadas" : "No hay conversaciones"}
          </div>
        ) : (
          filtered.map((chat) => (
            <ChatListItem
              key={chat.ConversationID}
              chat={chat}
              isSelected={selectedId === chat.ConversationID}
              isArchived={showArchived}
              onClick={() => onSelect(chat)}
              onArchive={() => chat.ConversationID && archive.mutate(chat.ConversationID)}
              onUnarchive={() => chat.ConversationID && unarchive.mutate(chat.ConversationID)}
              onToggleMode={() =>
                chat.ConversationID &&
                toggleMode.mutate({ id: chat.ConversationID, currentMode: chat.Mode ?? "auto" })
              }
              onChangeStatus={(status) =>
                chat.ConversationID && setStatus.mutate({ id: chat.ConversationID, status })
              }
              onMarkRead={() => chat.ConversationID && markRead.mutate(chat.ConversationID)}
            />
          ))
        )}
      </div>
    </div>
  );
}
