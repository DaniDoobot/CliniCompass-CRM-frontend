import { useState } from "react";
import type { ChatItem } from "@/lib/doobotApi";
import { useDoobotConversationActions, useDoobotManagers } from "@/hooks/useDoobotInfo";
import { useConsoleContactLink } from "@/hooks/useConsoleContactLink";
import {
  StatusCatalog,
  BotCatalog,
  ContactCatalog,
  TimeZoneCatalog,
  CampaignCatalog,
} from "@/lib/doobotConfig";
import { X, UserCheck, Check, Loader2, ExternalLink, UserPlus, Phone, Mail, Building2, Tag, User } from "lucide-react";
import { Link } from "react-router-dom";

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

  // Vinculación con contacto CRM
  const {
    isLoading: isLinkLoading,
    contact,
    hasLink,
    createContactAndLink,
  } = useConsoleContactLink(
    chat.ConversationID,
    chat.ClientPhone,
    chat.ClientAlias
  );

  const name = chat.ClientAlias || chat.ClientPhone || "Desconocido";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

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
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}>
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

      {/* ===================== CONTACTO CRM ===================== */}
      <div className="console-info-section" style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: 12, marginTop: 4 }}>
        <div className="console-info-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <User size={13} /> Contacto CRM
        </div>

        {isLinkLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "hsl(var(--muted-foreground))", fontSize: 12 }}>
            <Loader2 size={14} className="animate-spin" /> Buscando...
          </div>
        ) : contact ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Nombre */}
            <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
              {contact.first_name} {contact.last_name ?? ""}
            </div>

            {/* Teléfono */}
            {contact.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                <Phone size={11} /> {contact.phone}
              </div>
            )}

            {/* Email */}
            {contact.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                <Mail size={11} /> {contact.email}
              </div>
            )}

            {/* Centro */}
            {contact.center && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                <Building2 size={11} /> {contact.center.name}
              </div>
            )}

            {/* Categoría */}
            {contact.category && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                <Tag size={11} /> {contact.category.label}
              </div>
            )}

            {/* Profesional */}
            {contact.professional && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                <User size={11} /> {contact.professional.first_name} {contact.professional.last_name}
              </div>
            )}

            {/* Notas */}
            {contact.notes && (
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontStyle: "italic", marginTop: 2 }}>
                {contact.notes.slice(0, 120)}{contact.notes.length > 120 ? "…" : ""}
              </div>
            )}

            {/* Enlace a ficha completa */}
            <Link
              to={`/contactos/${contact.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "hsl(var(--primary))",
                marginTop: 4,
                textDecoration: "none",
              }}
            >
              <ExternalLink size={12} /> Ver ficha completa
            </Link>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 8 }}>
              No hay contacto CRM vinculado a esta conversación.
            </p>
            <button
              className="console-info-btn"
              onClick={() => createContactAndLink.mutate({})}
              disabled={createContactAndLink.isPending}
              style={{ width: "100%" }}
            >
              {createContactAndLink.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <UserPlus size={13} />
              )}
              Crear contacto (Lead)
            </button>
            {createContactAndLink.isError && (
              <p style={{ fontSize: 11, color: "hsl(var(--destructive))", marginTop: 4 }}>
                Error al crear contacto. Inténtalo de nuevo.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ===================== DATOS DE DOOBOT ===================== */}

      {/* Alias */}
      <div className="console-info-section">
        <div className="console-info-label">Nombre / Alias (doobot)</div>
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
        <div className="console-info-value">{StatusCatalog.displayFromId(chat.Status)}</div>
      </div>

      {/* Modo */}
      <div className="console-info-section">
        <div className="console-info-label">Modo</div>
        <div className="console-info-value">
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
          {assignManager.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
          Asignármela
        </button>
        {managers && managers.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
            Gestores: {managers.map((m) => m.Name).join(", ")}
          </div>
        )}
      </div>

      {/* Campaña */}
      {CampaignCatalog.entries.length > 0 && (
        <div className="console-info-section">
          <div className="console-info-label">Campaña</div>
          <select
            className="console-info-select"
            value={chat.Campaign ?? ""}
            onChange={(e) => setCampaign.mutate(e.target.value)}
          >
            <option value="">Sin campaña</option>
            {CampaignCatalog.entries.map((c) => (
              <option key={c.id} value={c.id}>{c.display}</option>
            ))}
          </select>
        </div>
      )}

      {/* Bot */}
      {BotCatalog.entries.filter(e => e.id).length > 0 && (
        <div className="console-info-section">
          <div className="console-info-label">Bot</div>
          <select
            className="console-info-select"
            value={chat.BotProjectID ?? ""}
            onChange={(e) => setBot.mutate(e.target.value)}
          >
            <option value="">Sin bot</option>
            {BotCatalog.entries.filter(e => e.id).map((b) => (
              <option key={b.id} value={b.id}>{b.display}</option>
            ))}
          </select>
        </div>
      )}

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
            <option key={t.id} value={t.id}>{t.display}</option>
          ))}
        </select>
      </div>

      {/* Intento de contacto */}
      <div className="console-info-section">
        <div className="console-info-label">Intento de contacto</div>
        <select
          className="console-info-select"
          value={chat.Contact ?? ""}
          onChange={(e) => setContact.mutate(e.target.value)}
        >
          <option value="">Sin definir</option>
          {ContactCatalog.entries.map((c) => (
            <option key={c.id} value={c.id}>{c.display}</option>
          ))}
        </select>
      </div>

      {/* Intent (solo lectura) */}
      <div className="console-info-section">
        <div className="console-info-label">Intent</div>
        <div className="console-info-value">{chat.Intent || "—"}</div>
      </div>

      {/* ID Conversación */}
      <div className="console-info-section">
        <div className="console-info-label">ID Conversación</div>
        <div className="console-info-value" style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>
          {chat.ConversationID}
        </div>
      </div>
    </div>
  );
}
