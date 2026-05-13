import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CenterSelector } from "./CenterSelector";
import { useAuth } from "@/hooks/useAuth";
import { Moon, Sun, Bell, LogOut, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import clientLogo from "@/assets/client-logo.png";

export function AppLayout({ children, consoleMode = false }: { children: React.ReactNode; consoleMode?: boolean }) {
  const { profile, signOut } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const initials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase()
    : "??";

  return (
    <SidebarProvider>
      <div className={cn(
        "flex w-full bg-slate-50/50 dark:bg-slate-950/50 transition-colors duration-300",
        consoleMode ? "h-screen overflow-hidden" : "min-h-screen"
      )}>
        <AppSidebar />
        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          consoleMode ? "overflow-hidden" : ""
        )}>
          <header className="h-16 flex items-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 gap-4 sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800/60">
            <SidebarTrigger className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors" />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
            <CenterSelector />
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-4">
              {/* Client Logo Image */}
              <div className="hidden md:flex items-center px-4 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm transition-all hover:shadow-md cursor-pointer group">
                <img src={clientLogo} alt="Boston Medical" className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                <button 
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all duration-200 shadow-sm hover:shadow"
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all duration-200 shadow-sm hover:shadow relative">
                  <Bell size={18} />
                  <span className="absolute top-2 right-2 h-2 w-2 bg-blue-600 rounded-full border-2 border-white dark:border-slate-800" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-600/20 ring-2 ring-white dark:ring-slate-900">
                  {initials}
                </div>
                <button 
                  onClick={signOut}
                  className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all duration-200"
                  title="Cerrar sesión"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </header>
          <main className={cn(
            "flex-1 transition-all duration-300",
            consoleMode ? "flex flex-col overflow-hidden" : "p-8 overflow-auto"
          )}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
