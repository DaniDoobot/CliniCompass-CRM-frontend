import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Permission {
  module_name: string;
  can_read: boolean;
  can_write: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    center_id: string | null;
    company_id: string;
    company: {
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
  permissions: Permission[];
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  hasPermission: (module: string, action: "read" | "write") => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes, permissionsRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("staff_profiles").select("id, first_name, last_name, email, center_id, company_id, company:companies(name, logo_url)").eq("user_id", userId).single(),
      supabase.from("user_permissions" as any).select("module_name, can_read, can_write").eq("user_id", userId),
    ]);

    if (rolesRes.data) {
      setRoles(rolesRes.data.map((r) => r.role) as AppRole[]);
    }
    if (profileRes.data) {
      setProfile(profileRes.data as any);
    }
    if (permissionsRes.data) {
      setPermissions(permissionsRes.data as Permission[]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer data fetch to avoid Supabase deadlock
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRoles([]);
          setProfile(null);
          setPermissions([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasAnyRole = (r: AppRole[]) => r.some((role) => roles.includes(role));

  const hasPermission = (module: string, action: "read" | "write") => {
    // Admins and legacy roles have unrestricted access
    if (
      roles.includes("super_admin" as any) ||
      roles.includes("company_admin" as any) ||
      roles.includes("gerencia") ||
      roles.includes("administracion")
    ) {
      return true;
    }
    const perm = permissions.find((p) => p.module_name === module);
    if (!perm) return false;
    return action === "read" ? perm.can_read : perm.can_write;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, profile, permissions, hasRole, hasAnyRole, hasPermission, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
