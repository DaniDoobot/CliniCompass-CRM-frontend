import { useState } from "react";
import { X, Send, Upload, Clock, History } from "lucide-react";
import { ManualSendTab } from "./ManualSendTab";
import { BulkSendTab } from "./BulkSendTab";
import { ScheduledSendTab } from "./ScheduledSendTab";
import { SendHistoryTable } from "./SendHistoryTable";

type Tab = "manual" | "bulk" | "scheduled";

interface Props {
  onClose: () => void;
}

export function SendsPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("manual");
  const [showHistory, setShowHistory] = useState(false);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "manual", label: "Manual", icon: Send },
    { key: "bulk", label: "Masivo", icon: Upload },
    { key: "scheduled", label: "Programado", icon: Clock },
  ];

  return (
    <div className="sends-panel">
      {/* Header */}
      <div className="sends-panel-header">
        <div className="sends-panel-title">
          <Send size={18} />
          <h3>Envíos WhatsApp</h3>
        </div>
        <div className="sends-panel-header-actions">
          <button
            className={`sends-history-toggle ${showHistory ? "active" : ""}`}
            onClick={() => setShowHistory(!showHistory)}
            title="Historial de envíos"
          >
            <History size={16} />
          </button>
          <button className="sends-panel-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>

      {showHistory ? (
        <>
          <div className="sends-history-header">
            <h4>Historial de envíos</h4>
            <button className="sends-back-btn" onClick={() => setShowHistory(false)}>
              ← Volver
            </button>
          </div>
          <SendHistoryTable />
        </>
      ) : (
        <>
          {/* Tabs */}
          <div className="sends-tabs">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  className={`sends-tab ${tab === t.key ? "active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {tab === "manual" && <ManualSendTab />}
          {tab === "bulk" && <BulkSendTab />}
          {tab === "scheduled" && <ScheduledSendTab />}
        </>
      )}
    </div>
  );
}
