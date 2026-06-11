import { Loader2, CheckCircle2, AlertCircle, Clock, Send as SendIcon } from "lucide-react";
import { useSendHistory } from "@/hooks/useSends";
import { BotCatalog } from "@/lib/doobotConfig";
import { useDoobotBots } from "@/hooks/useDoobotInfo";

const STATUS_MAP: Record<string, { label: string; icon: any; cls: string }> = {
  pending: { label: "Pendiente", icon: Clock, cls: "pending" },
  sending: { label: "Enviando", icon: SendIcon, cls: "sending" },
  sent: { label: "Enviado", icon: CheckCircle2, cls: "sent" },
  failed: { label: "Error", icon: AlertCircle, cls: "failed" },
};

export function SendHistoryTable() {
  const { data: sends, isLoading } = useSendHistory(50);
  const { data: botsData } = useDoobotBots();

  const dynamicBots = botsData?.map(b => ({
    id: b.BotProjectID || b.id || "",
    display: b.Name || b.display || b.id || ""
  })).filter(b => b.id) || [];
  const displayBots = dynamicBots.length > 0 ? dynamicBots : BotCatalog.entries;

  const getBotDisplay = (id: string | null | undefined) => {
    if (!id) return "";
    const found = displayBots.find(b => b.id.toLowerCase() === id.toLowerCase());
    return found ? found.display : id;
  };

  if (isLoading) {
    return (
      <div className="sends-loading">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  if (!sends || sends.length === 0) {
    return <p className="sends-empty">No hay envíos registrados</p>;
  }

  return (
    <div className="sends-history">
      <div className="sends-preview-table">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Teléfono</th>
              <th>Nombre</th>
              <th>Bot</th>
              <th>Plantilla</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {sends.map((s) => {
              const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
              const Icon = st.icon;
              return (
                <tr key={s.id}>
                  <td>
                    <span className={`sends-type-badge ${s.send_type}`}>
                      {s.send_type === "manual" ? "Manual" : s.send_type === "bulk" ? "Masivo" : "Programado"}
                    </span>
                  </td>
                  <td className="sends-phone">{s.phone}</td>
                  <td>{s.client_name || "—"}</td>
                  <td>{getBotDisplay(s.bot_id)}</td>
                  <td>{s.template_name || "—"}</td>
                  <td>
                    <span className={`sends-status-badge ${st.cls}`}>
                      <Icon size={12} />
                      {st.label}
                    </span>
                  </td>
                  <td className="sends-date">
                    {new Date(s.created_at).toLocaleString("es-ES", {
                      day: "2-digit", month: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
