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
  { title: "Contactos", url: "/contactos", icon: Contact },
  { title: "Leads", url: "/leads", icon: UserPlus },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Negocios", url: "/negocios", icon: Briefcase },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Speech Analytics", url: "/speech-analytics", icon: Activity },
  { title: "Centros", url: "/centros", icon: Building2 },
  { title: "Consola", url: "/consola", icon: MessageSquare },
];

const managementNav = [
  { title: "Campañas", url: "/campanas", icon: Megaphone },
  { title: "Presupuestos", url: "/presupuestos", icon: FileText },
  { title: "Facturación", url: "/facturacion", icon: Receipt },
  { title: "Documentos", url: "/documentos", icon: FileText },
  { title: "Configuración", url: "/configuracion", icon: Settings },
];

type NavItem = { title: string; url: string; icon: LucideIcon };

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
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"} 
                      className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200" 
                      activeClassName="bg-blue-50 text-blue-600 font-semibold"
                    >
                      <item.icon className={cn("h-4 w-4", location.pathname === item.url ? "text-blue-600" : "")} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
  const { profile, roles, signOut } = useAuth();
  const { data: specialties } = useSpecialties();

  const clinicalNav: NavItem[] = (specialties || []).map((s: any) => ({
    title: s.name,
    url: `/especialidad/${s.slug}`,
    icon: ICON_MAP[s.icon_name] || Activity,
  }));

  const initials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase()
    : "??";
  const displayName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Usuario";
  const displayRole = roles.length > 0 ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1) : "Sin rol";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-white dark:bg-slate-950 transition-all duration-300">
      <SidebarHeader className={cn("mb-2 transition-all duration-300 flex items-center justify-center", collapsed ? "p-0 h-20" : "p-6 pt-10")}>
        <div className="flex items-center justify-center w-full">
          {collapsed ? (
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/40 transition-all duration-300">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
          ) : (
            <img src={nweeLogo} alt="nwee" className="h-20 w-auto object-contain transition-all duration-300" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 pt-0">
        <NavGroup label="Principal" items={mainNav} />
        <NavGroup label="Especialidades" items={clinicalNav} />
        <NavGroup label="Gestión" items={managementNav} />
      </SidebarContent>

      <SidebarFooter className="p-6 flex flex-col items-center gap-2 border-t border-sidebar-border/30">
        {!collapsed && (
          <>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Powered by</span>
            <img src={doobotLogo} alt="doobot.ai_" className="h-8 w-auto opacity-90 transition-all duration-300" />
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
