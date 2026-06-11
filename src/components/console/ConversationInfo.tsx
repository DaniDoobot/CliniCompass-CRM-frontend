import { useState, useEffect } from "react";
import type { ChatItem } from "@/lib/doobotApi";
import { useDoobotConversationActions, useDoobotManagers, useDoobotBots } from "@/hooks/useDoobotInfo";
import {
  StatusCatalog,
  BotCatalog,
  CampaignCatalog,
} from "@/lib/doobotConfig";
import { X, UserCheck, Check, Loader2 } from "lucide-react";

interface Props {
  chat: ChatItem;
  onClose: () => void;
  onUpdate?: (partial: Partial<ChatItem>) => void;
}

export function ConversationInfo({ chat, onClose, onUpdate }: Props) {
  const { data: managers } = useDoobotManagers();
  const { data: botsData } = useDoobotBots();
  const { assignManager, setCampaign, setBot, setAlias } =
    useDoobotConversationActions(chat.ConversationID);

  const dynamicBots = botsData?.map(b => ({
    id: b.BotProjectID || b.id || "",
    display: b.Name || b.display || b.id || ""
  })).filter(b => b.id) || [];
  const displayBots = dynamicBots.length > 0 ? dynamicBots : BotCatalog.entries;

  const [aliasValue, setAliasValue] = useState(chat.ClientAlias ?? "");
  const [aliasSaved, setAliasSaved] = useState(false);

  const [localCampaign, setLocalCampaign] = useState(chat.Campaign ?? "");
  const [localBot, setLocalBot] = useState(chat.BotProjectID ?? "");

  useEffect(() => {
    setLocalCampaign(chat.Campaign ?? "");
    setLocalBot(chat.BotProjectID ?? "");
  }, [chat.ConversationID, chat.Campaign, chat.BotProjectID]);

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
          onUpdate?.({ ClientAlias: aliasValue.trim() });
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

      {/* Intent (solo lectura) */}
      <div className="console-info-section">
        <div className="console-info-label">Intent</div>
        <div className="console-info-value">{chat.Intent || "—"}</div>
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
          value={localCampaign}
          onChange={(e) => {
            const val = e.target.value;
            setLocalCampaign(val);
            setCampaign.mutate(val, { 
              onSuccess: () => onUpdate?.({ Campaign: val }),
              onError: () => setLocalCampaign(chat.Campaign ?? "")
            });
          }}
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
          value={localBot}
          onChange={(e) => {
            const val = e.target.value;
            setLocalBot(val);
            setBot.mutate(val, { 
              onSuccess: () => onUpdate?.({ BotProjectID: val }),
              onError: () => setLocalBot(chat.BotProjectID ?? "")
            });
          }}
        >
          <option value="">Sin bot</option>
          {displayBots.map((b) => (
            <option key={b.id} value={b.id}>
              {b.display}
            </option>
          ))}
        </select>
      </div>


    </div>
  );
}
