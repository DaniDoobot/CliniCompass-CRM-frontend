import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import nweeLogo from "@/assets/nwee-logo-crm.png";
import doobotLogo from "@/assets/doobot-logo.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loginEmail = email.includes("@") ? email : `${email}@doobot.ai`;
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;

      // Log into Doobot console API using the same credentials (raw username)
      try {
        const { data, error: doobotErr } = await supabase.functions.invoke("console-api", {
          body: { action: "doobot:login", email, password },
        });
        if (doobotErr) throw doobotErr;
        if (data?.data?.cookie) {
          localStorage.setItem("doobot_cookie", data.data.cookie);
        }
      } catch (doobotLoginErr: any) {
        console.warn("No se pudo sincronizar la sesión de Doobot:", doobotLoginErr);
      }

      toast.success("Sesión iniciada correctamente");
    } catch (err: any) {
      toast.error(err.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={nweeLogo} alt="nwee — Health IA Management" className="h-40 w-auto object-contain mx-auto" />
        </div>

        <div className="bg-card rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold font-heading text-foreground mb-4">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Usuario</Label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9"
                placeholder="tu_usuario"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-9"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Acceso exclusivo para personal autorizado
        </p>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Powered by</span>
          <img src={doobotLogo} alt="doobot.ai" className="h-6 w-auto object-contain" />
        </div>
      </div>
    </div>
  );
}
