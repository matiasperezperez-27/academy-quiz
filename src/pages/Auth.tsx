import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as any;

  useEffect(() => {
    setSEO(
      mode === "login" ? "Login | Academy Quiz" : "Registro | Academy Quiz",
      "Inicia sesión o regístrate para realizar tests y practicar preguntas falladas."
    );
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Bienvenido", description: "Has iniciado sesión correctamente." });
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast({
          title: "Registro completado",
          description: "Revisa tu email para confirmar la cuenta y volver a la app.",
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">
              {mode === "login" ? "Entrar" : "Registrarme"}
            </Button>
          </form>
          <div className="mt-4 text-sm text-center">
            {mode === "login" ? (
              <button className="underline" onClick={() => setMode("signup")}>¿No tienes cuenta? Regístrate</button>
            ) : (
              <button className="underline" onClick={() => setMode("login")}>¿Ya tienes cuenta? Inicia sesión</button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default Auth;
