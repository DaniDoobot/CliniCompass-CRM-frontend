/**
 * Contexto de autenticación para la consola WhatsApp.
 *
 * La única autenticación válida es la sesión del CRM (Supabase Auth).
 * No existe login separado de Doobot desde el frontend.
 * La Edge Function `console-api` verifica el JWT del CRM y accede
 * a Doobot/Meta con credenciales server-side.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

interface DoobotAuthContextType {
  isLoggedIn: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  userName: string | null;
}

const DoobotAuthContext = createContext<DoobotAuthContextType | undefined>(undefined);

export function DoobotAuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(true);
  const [loginError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // La consola está disponible mientras el usuario del CRM esté autenticado.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setUserName(session?.user?.email ?? null);
      setIsLoggingIn(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setUserName(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <DoobotAuthContext.Provider value={{ isLoggedIn, isLoggingIn, loginError, userName }}>
      {children}
    </DoobotAuthContext.Provider>
  );
}

export function useDoobotAuth() {
  const ctx = useContext(DoobotAuthContext);
  if (!ctx) throw new Error("useDoobotAuth must be inside DoobotAuthProvider");
  return ctx;
}
