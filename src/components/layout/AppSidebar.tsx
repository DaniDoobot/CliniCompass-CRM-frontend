import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarDays,
  Building2,
  FileText,
  TrendingUp,
  Megaphone,
  Receipt,
  Activity,
  Apple,
  Brain,
  Settings,
  ChevronDown,
  LogOut,
  Briefcase,
  Contact,
  Stethoscope,
  Heart,
  Zap,
  Dumbbell,
  Leaf,
  Eye,
  type LucideIcon,
  MessageSquare,
} from "lucide-react";
import nweeLogo from "@/assets/nwee-logo-crm.png";
import doobotLogo from "@/assets/doobot-logo.png";
import nIcon from "@/assets/nwee-n-clean.png";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSpecialties } from "@/hooks/useSpecialties";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ICON_MAP: Record<string, LucideIcon> = {
  Activity, Apple, Brain, Heart, Zap, Dumbbell, Leaf, Eye, Stethoscope,
};

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contactos", url: "/contactos", icon: Contact, module: "contactos" },
  { title: "Leads", url: "/leads", icon: UserPlus, module: "leads" },
  { title: "Clientes", url: "/clientes", icon: Users, module: "pacientes" },
  { title: "Negocios", url: "/negocios", icon: Briefcase, module: "negocios" },
  { title: "Agenda", url: "/agenda", icon: CalendarDays, module: "agenda" },
  { title: "Speech Analytics", url: "/speech-analytics", icon: Activity, module: "speech_analytics" },
  { title: "Centros", url: "/centros", icon: Building2, module: "centros" },
  { title: "Consola", url: "/consola", icon: MessageSquare, module: "consola" },
];

const managementNav = [
  { title: "Campañas", url: "/campanas", icon: Megaphone, module: "campanas" },
  { title: "Presupuestos", url: "/presupuestos", icon: FileText, module: "facturacion" },
  { title: "Facturación", url: "/facturacion", icon: Receipt, module: "facturacion" },
  { title: "Documentos", url: "/documentos", icon: FileText, module: "pacientes" },
  { title: "Configuración", url: "/configuracion", icon: Settings, module: "configuracion" },
];

type NavItem = { title: string; url: string; icon: LucideIcon; module?: string };

function NavGroup({ label, items, defaultOpen = true }: { label: string; items: NavItem[]; defaultOpen?: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer text-sidebar-muted uppercase text-[10px] tracking-widest font-semibold flex items-center justify-between hover:text-sidebar-foreground transition-colors">
            {!collapsed && label}
            {!collapsed && <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className={cn(collapsed ? "items-center" : "")}>
              {items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive} 
                      tooltip={item.title}
                    >
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/"} 
                        className={cn(
                          "relative flex items-center w-full h-full transition-all duration-200 overflow-hidden",
                          collapsed ? "justify-center" : "gap-3 px-3 py-2",
                          isActive && !collapsed ? "pl-5" : ""
                        )}
                        activeClassName={cn(
                          "!bg-blue-50/90 dark:!bg-blue-950/30 !text-slate-900 dark:!text-slate-100 font-semibold rounded-xl",
                          collapsed ? "!bg-blue-100/90" : ""
                        )}
                      >
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-blue-600 rounded-l-xl" />
                        )}
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-colors", 
                          isActive ? "text-blue-600 dark:text-blue-400" : "text-sidebar-foreground/70"
                        )} />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, roles, hasPermission } = useAuth();
  const { data: specialties } = useSpecialties();

  const clinicalNav: NavItem[] = (specialties || []).map((s: any) => ({
    title: s.name,
    url: `/especialidad/${s.slug}`,
    icon: ICON_MAP[s.icon_name] || Activity,
  }));

  const displayName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Usuario";
  const displayRole = roles.length > 0 ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1) : "Sin rol";

  const filteredMainNav = mainNav.filter(
    (item) => !item.module || hasPermission(item.module, "read")
  );
  
  const filteredManagementNav = managementNav.filter(
    (item) => !item.module || hasPermission(item.module, "read")
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-white dark:bg-slate-950 transition-all duration-300">
      <SidebarHeader className="h-16 flex items-center justify-center p-0 border-b border-sidebar-border/30 transition-all duration-300 overflow-hidden">
        <div className="flex items-center justify-center w-full h-full">
          {collapsed ? (
            <div className="h-10 w-10 flex items-center justify-center flex-shrink-0 transition-all duration-300">
              <img src={nIcon} alt="n" className="h-8 w-8 object-contain" />
            </div>
          ) : (
            <div className="relative w-full flex justify-center p-0">
              <img src={nweeLogo} alt="nwee" className="h-20 w-auto object-contain transition-all duration-300 -mb-2" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 pt-0">
        {filteredMainNav.length > 0 && <NavGroup label="Principal" items={filteredMainNav} />}
        {clinicalNav.length > 0 && hasPermission("pacientes", "read") && (
          <NavGroup label="Especialidades" items={clinicalNav} />
        )}
        {filteredManagementNav.length > 0 && <NavGroup label="Gestión" items={filteredManagementNav} />}
      </SidebarContent>

      <SidebarFooter className="p-3 flex flex-col items-center gap-1 border-t border-sidebar-border/30">
        {!collapsed && (
          <>
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400">Powered by</span>
            <img src={doobotLogo} alt="doobot.ai_" className="h-7 w-auto opacity-90 transition-all duration-300" />
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
