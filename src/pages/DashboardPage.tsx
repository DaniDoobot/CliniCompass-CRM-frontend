import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  UserPlus, Users, CalendarDays, TrendingUp,
  AlertCircle, Receipt, Activity, ArrowUpRight, Loader2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusMap: Record<string, "success" | "warning" | "info"> = {
  confirmada: "success",
  pendiente: "warning",
  realizada: "info",
};

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData();
  const [activeTab, setActiveTab] = useState<"summary" | "analytics">("summary");
  const [selectedLookerId, setSelectedLookerId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const { data: allowedLookers, isLoading: lookersLoading } = useQuery({
    queryKey: ["allowed-lookers"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("lookers" as any)
          .select("*")
          .order("name");
        if (error) throw error;
        return data && data.length > 0 ? data : [
          {
            id: "b101b282-36b8-4720-ae69-23ade2746611",
            name: "Llamadas Doobot",
            url: "https://datastudio.google.com/embed/reporting/b101b282-36b8-4720-ae69-23ade2746611",
            pages: [
              { id: "mxcmF", name: "Llamadas Realizadas" },
              { id: "anotherPage", name: "Desempeño de Agentes" },
              { id: "thirdPage", name: "Análisis de Sentimiento" }
            ]
          }
        ];
      } catch (err) {
        console.warn("Error loading lookers from database, using fallback default:", err);
        return [
          {
            id: "b101b282-36b8-4720-ae69-23ade2746611",
            name: "Llamadas Doobot",
            url: "https://datastudio.google.com/embed/reporting/b101b282-36b8-4720-ae69-23ade2746611",
            pages: [
              { id: "mxcmF", name: "Llamadas Realizadas" },
              { id: "anotherPage", name: "Desempeño de Agentes" },
              { id: "thirdPage", name: "Análisis de Sentimiento" }
            ]
          }
        ];
      }
    }
  });

  const activeLooker = allowedLookers?.find(l => l.id === selectedLookerId) || allowedLookers?.[0];
  const pages = activeLooker?.pages as { id: string, name: string }[] || [];
  const activePage = pages.find(p => p.id === selectedPageId) || pages[0];
  const iframeSrc = activeLooker 
    ? `${activeLooker.url}${activePage?.id ? `/page/${activePage.id}` : ""}`
    : "";

  if (isLoading || !data) {
    return (
      <AppLayout>
        <PageHeader title="Dashboard" description="Resumen general de actividad y métricas" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </AppLayout>
    );
  }

  const fmtChange = (val: number, suffix = "vs mes anterior") =>
    `${val >= 0 ? "+" : ""}${val}% ${suffix}`;

  return (
    <AppLayout>
      <PageHeader title="Dashboard" description="Resumen general de actividad y métricas">
        <div className="flex bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "summary"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Vista Rápida
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "analytics"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Informes Completos
          </button>
        </div>
      </PageHeader>

      {activeTab === "summary" ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-slide-in">
            <StatCard title="Leads nuevos" value={data.leadsNew}
              change={fmtChange(data.leadsChange)} changeType={data.leadsChange >= 0 ? "positive" : "negative"}
              icon={UserPlus} iconColor="text-primary" />
            <StatCard title="Pacientes activos" value={data.activePatients}
              change={fmtChange(data.patientsChange)} changeType={data.patientsChange >= 0 ? "positive" : "negative"}
              icon={Users} iconColor="text-accent" />
            <StatCard title="Citas hoy" value={data.todayAppts.length}
              change={`${data.pendingToday} pendientes de confirmar`} changeType="neutral"
              icon={CalendarDays} iconColor="text-warning" />
            <StatCard title="Facturación mes" value={`€${data.invoiceTotal.toLocaleString("es-ES")}`}
              change={fmtChange(data.invoiceChange)} changeType={data.invoiceChange >= 0 ? "positive" : "negative"}
              icon={Receipt} iconColor="text-success" />
          </div>

          {/* Second row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Conversión" value={`${data.conversionRate}%`}
              change="Leads convertidos este mes" changeType="neutral"
              icon={TrendingUp} iconColor="text-primary" />
            <StatCard title="No shows" value={data.noShows}
              change={`${data.noShowsDiff >= 0 ? "-" : "+"}${Math.abs(data.noShowsDiff)} vs semana anterior`}
              changeType={data.noShowsDiff >= 0 ? "positive" : "negative"}
              icon={AlertCircle} iconColor="text-warning" />
            <StatCard title="Bonos activos" value={data.activePacks}
              change={`${data.packsExpiringSoon} próximos a vencer`} changeType="neutral"
              icon={Activity} iconColor="text-accent" />
            <StatCard title="Sesiones realizadas" value={data.sessionsWeek}
              change="Esta semana" changeType="neutral"
              icon={ArrowUpRight} iconColor="text-success" />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Today's Appointments */}
            <div className="stat-card lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold font-heading text-foreground">Citas de hoy</h3>
                <span className="text-xs text-muted-foreground">{data.todayAppts.length} citas</span>
              </div>
              {data.todayAppts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay citas hoy</p>
              ) : (
                <div className="space-y-2">
                  {data.todayAppts.map((apt: any) => (
                    <div key={apt.id} className="flex items-center gap-4 p-2.5 rounded-lg table-row-hover">
                      <span className="text-sm font-mono font-medium text-primary w-12">
                        {format(parseISO(apt.start_time), "HH:mm")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {apt.patient?.first_name} {apt.patient?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.service?.name ?? "—"} · {apt.center?.name ?? "—"}
                        </p>
                      </div>
                      <StatusBadge variant={statusMap[apt.status] ?? "info"}>
                        {apt.status}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Pie chart */}
              <div className="stat-card">
                <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Distribución por servicio</h3>
                {data.pieData.every((d: any) => d.value === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin datos este mes</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" stroke="none">
                          {data.pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {data.pieData.map((d: any) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-semibold text-foreground">{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Recent leads */}
              <div className="stat-card">
                <h3 className="text-sm font-semibold font-heading text-foreground mb-3">Últimos leads</h3>
                {data.recentLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin leads recientes</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.recentLeads.map((lead: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {lead.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{lead.name}</p>
                          <p className="text-[10px] text-muted-foreground">{lead.service} · {lead.source}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(parseISO(lead.time), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4 h-full flex flex-col">
          {/* Controls row */}
          {allowedLookers && allowedLookers.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium block">Informe</span>
                  <Select 
                    value={activeLooker?.id || ""} 
                    onValueChange={(val) => {
                      setSelectedLookerId(val);
                      setSelectedPageId(null);
                    }}
                  >
                    <SelectTrigger className="w-[240px] h-9">
                      <SelectValue placeholder="Seleccionar informe..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedLookers.map((looker) => (
                        <SelectItem key={looker.id} value={looker.id}>
                          {looker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {pages.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium block">Página / Vista</span>
                    <Select 
                      value={activePage?.id || ""} 
                      onValueChange={(val) => setSelectedPageId(val)}
                    >
                      <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder="Seleccionar página..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pages.map((page) => (
                          <SelectItem key={page.id} value={page.id}>
                            {page.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground hidden sm:block">
                Viendo: <span className="font-semibold text-foreground">{activeLooker?.name || "—"}</span> &gt; <span className="font-semibold text-foreground">{activePage?.name || "—"}</span>
              </div>
            </div>
          )}

          {/* Iframe container */}
          {lookersLoading ? (
            <div className="flex items-center justify-center p-12 min-h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : iframeSrc ? (
            <div className="relative w-full overflow-hidden rounded-xl bg-white border border-border shadow-sm" style={{ height: "calc(100vh - 280px)", minHeight: "600px" }}>
              <iframe 
                src={iframeSrc} 
                style={{ border: 0, width: "100%", height: "calc(100% + 36px)", marginBottom: "-36px" }}
                allowFullScreen 
                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/20 min-h-[300px]">
              <p className="text-sm text-muted-foreground">No tienes acceso a ningún informe de Looker Studio.</p>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
