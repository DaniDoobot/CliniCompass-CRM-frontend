import { useState } from "react";
import type { ChatItem } from "@/lib/doobotApi";
import { useDoobotConversationActions, useDoobotManagers } from "@/hooks/useDoobotInfo";
import {
  StatusCatalog,
  BotCatalog,
  ContactCatalog,
  TimeZoneCatalog,
  CampaignCatalog,
} from "@/lib/doobotConfig";
import { X, UserCheck, Check, Loader2 } from "lucide-react";

interface Props {
  chat: ChatItem;
  onClose: () => void;
}

export function ConversationInfo({ chat, onClose }: Props) {
  const { data: managers } = useDoobotManagers();
  const { assignManager, setCampaign, setBot, setTimeZone, setContact, setAlias } =
    useDoobotConversationActions(chat.ConversationID);

  const [aliasValue, setAliasValue] = useState(chat.ClientAlias ?? "");
  const [aliasSaved, setAliasSaved] = useState(false);

  const name = chat.ClientAlias || chat.ClientPhone || "Desconocido";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleAliasBlur = () => {
    if (aliasValue.trim() && aliasValue !== chat.ClientAlias) {
      setAlias.mutate(aliasValue.trim(), {
        onSuccess: () => {
          setAliasSaved(true);
          setTimeout(() => setAliasSaved(false), 2000);
        },
      });
    }
  };

  return (
    <div className="console-info-panel">
      {/* Header */}
      <div className="console-info-header">
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}
        >
          <X size={18} />
        </button>
        <h3>Información</h3>
      </div>

      {/* Avatar & Name */}
      <div className="console-info-avatar">{initials}</div>
      <div style={{ textAlign: "center", paddingBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "hsl(var(--foreground))" }}>{name}</div>
        <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>{chat.ClientPhone}</div>
      </div>

      {/* Alias */}
      <div className="console-info-section">
        <div className="console-info-label">Nombre / Alias</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="console-info-input"
            value={aliasValue}
            onChange={(e) => setAliasValue(e.target.value)}
            onBlur={handleAliasBlur}
            onKeyDown={(e) => e.key === "Enter" && handleAliasBlur()}
            placeholder="Nombre del cliente"
          />
          {setAlias.isPending && <Loader2 size={14} className="animate-spin" />}
          {aliasSaved && <Check size={14} style={{ color: "hsl(142 76% 36%)" }} />}
        </div>
      </div>

      {/* Estado */}
      <div className="console-info-section">
        <div className="console-info-label">Estado</div>
        <div className="console-info-value">
          {StatusCatalog.displayFromId(chat.Status)}
        </div>
      </div>

      {/* Modo */}
      <div className="console-info-section">
        <div className="console-info-label">Modo</div>
        <div className="console-info-value" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`console-mode-badge ${(chat.Mode ?? "auto").toLowerCase()}`}>
            {(chat.Mode ?? "auto").toLowerCase() === "auto" ? "🤖 Auto" : "👤 Manual"}
          </span>
        </div>
      </div>

      {/* Gestor */}
      <div className="console-info-section">
        <div className="console-info-label">Gestor</div>
        <div className="console-info-value">{chat.Manager || "Sin asignar"}</div>
        <button
          className="console-info-btn"
          onClick={() => assignManager.mutate()}
          disabled={assignManager.isPending}
          style={{ marginTop: 8 }}
        >
          {assignManager.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <UserCheck size={14} />
          )}
          Asignármela
        </button>
        {managers && managers.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
            Gestores: {managers.map((m) => m.Name).join(", ")}
          </div>
        )}
      </div>

      {/* Campaña */}
      <div className="console-info-section">
        <div className="console-info-label">Campaña</div>
        <select
          className="console-info-select"
          value={chat.Campaign ?? ""}
          onChange={(e) => setCampaign.mutate(e.target.value)}
        >
          <option value="">Sin campaña</option>
          {CampaignCatalog.entries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display}
            </option>
          ))}
        </select>
      </div>

      {/* Bot */}
      <div className="console-info-section">
        <div className="console-info-label">Bot</div>
        <select
          className="console-info-select"
          value={chat.BotProjectID ?? ""}
          onChange={(e) => setBot.mutate(e.target.value)}
        >
          <option value="">Sin bot</option>
          {BotCatalog.entries.map((b) => (
            <option key={b.id} value={b.id}>
              {b.display}
            </option>
          ))}
        </select>
      </div>

      {/* Horario */}
      <div className="console-info-section">
        <div className="console-info-label">Horario de contacto</div>
        <select
          className="console-info-select"
          value={chat.TimeZone ?? ""}
          onChange={(e) => setTimeZone.mutate(e.target.value)}
        >
          <option value="">Sin definir</option>
          {TimeZoneCatalog.entries.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display}
            </option>
          ))}
        </select>
      </div>

      {/* Contacto */}
      <div className="console-info-section">
        <div className="console-info-label">Intento de contacto</div>
        <select
          className="console-info-select"
          value={chat.Contact ?? ""}
          onChange={(e) => setContact.mutate(e.target.value)}
        >
          <option value="">Sin definir</option>
          {ContactCatalog.entries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display}
            </option>
          ))}
        </select>
      </div>

      {/* Intent (solo lectura) */}
      <div className="console-info-section">
        <div className="console-info-label">Intent</div>
        <div className="console-info-value">{chat.Intent || "—"}</div>
      </div>

      {/* ConversationID */}
      <div className="console-info-section">
        <div className="console-info-label">ID Conversación</div>
        <div className="console-info-value" style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>
          {chat.ConversationID}
        </div>
      </div>
    </div>
  );
}
