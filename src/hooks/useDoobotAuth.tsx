/**
 * Hook para gestionar la sesión con la API de doobot.
 * Auto-login con credenciales del .env al montar el provider.
 *
 * ⚠️  DOOBOT_USER y DOOBOT_PASS son credenciales de desarrollo.
 *     En producción mover a Edge Function proxy (Fase 4).
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { doobotLogin } from "@/lib/doobotApi";
import { DOOBOT_USER, DOOBOT_PASS } from "@/lib/doobotConfig";

interface DoobotAuthContextType {
  isLoggedIn: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  userName: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

const DoobotAuthContext = createContext<DoobotAuthContextType | undefined>(undefined);

export function DoobotAuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const login = useCallback(async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await doobotLogin(DOOBOT_USER, DOOBOT_PASS);
      setIsLoggedIn(true);
      setUserName(res.current_user?.name ?? DOOBOT_USER);
    } catch (e: any) {
      // 403/422 = sesión ya activa — tratar como logueado
      if (e.message?.includes("422") || e.message?.includes("403") || e.message?.includes("anonymous users")) {
        setIsLoggedIn(true);
        setUserName(DOOBOT_USER);
      } else {
        setLoginError(e.message ?? "Error de login con doobot");
        setIsLoggedIn(false);
      }
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUserName(null);
  }, []);

  // Auto-login al montar
  useEffect(() => {
    login();
  }, [login]);

  return (
    <DoobotAuthContext.Provider value={{ isLoggedIn, isLoggingIn, loginError, userName, login, logout }}>
      {children}
    </DoobotAuthContext.Provider>
  );
}

export function useDoobotAuth() {
  const ctx = useContext(DoobotAuthContext);
  if (!ctx) throw new Error("useDoobotAuth must be inside DoobotAuthProvider");
  return ctx;
}
