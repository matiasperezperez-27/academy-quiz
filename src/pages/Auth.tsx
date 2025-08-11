import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthForm {
  email: string;
  password: string;
  confirmPassword: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

type AuthMode = "login" | "signup";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Mínimo 8 caracteres");
  if (!/[A-Z]/.test(password)) errors.push("Una mayúscula");
  if (!/[a-z]/.test(password)) errors.push("Una minúscula");
  if (!/\d/.test(password)) errors.push("Un número");
  return errors;
};

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthForm>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as any;

  useEffect(() => {
    setSEO(
      mode === "login" ? "Iniciar Sesión | Academy Quiz" : "Registro | Academy Quiz",
      mode === "login" 
        ? "Inicia sesión para acceder a tus tests y progreso personalizado."
        : "Crea tu cuenta gratuita y comienza a estudiar con tests personalizados."
    );
  }, [mode]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Email validation
    if (!form.email) {
      newErrors.email = "El email es requerido";
    } else if (!validateEmail(form.email)) {
      newErrors.email = "Formato de email inválido";
    }

    // Password validation
    if (!form.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (mode === "signup") {
      const passwordErrors = validatePassword(form.password);
      if (passwordErrors.length > 0) {
        newErrors.password = `Falta: ${passwordErrors.join(", ")}`;
      }
    }

    // Confirm password validation (only for signup)
    if (mode === "signup") {
      if (!form.confirmPassword) {
        newErrors.confirmPassword = "Confirma tu contraseña";
      } else if (form.password !== form.confirmPassword) {
        newErrors.confirmPassword = "Las contraseñas no coinciden";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof AuthForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      if (mode === "login") {
        const { data, error } = await (supabase.auth as any).signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (error) throw error;

        toast({
          title: "¡Bienvenido de vuelta!",
          description: `Has iniciado sesión como ${data.user?.email}`,
        });

        const redirectTo = location.state?.from?.pathname || "/";
        navigate(redirectTo, { replace: true });

      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { data, error } = await (supabase.auth as any).signUp({
          email: form.email.trim(),
          password: form.password,
          options: { 
            emailRedirectTo: redirectUrl,
            data: {
              email_confirm: true,
            }
          },
        });

        if (error) throw error;

        if (data.user && !data.user.email_confirmed_at) {
          toast({
            title: "¡Registro exitoso!",
            description: "Revisa tu email para confirmar tu cuenta antes de continuar.",
          });
        } else {
          toast({
            title: "¡Cuenta creada!",
            description: "Ya puedes comenzar a usar Academy Quiz.",
          });
          navigate("/", { replace: true });
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      
      let errorMessage = "Ha ocurrido un error inesperado";
      
      if (err.message?.includes("Invalid login credentials")) {
        errorMessage = "Email o contraseña incorrectos";
      } else if (err.message?.includes("User already registered")) {
        errorMessage = "Este email ya está registrado. ¿Quieres iniciar sesión?";
      } else if (err.message?.includes("Password should be at least")) {
        errorMessage = "La contraseña debe tener al menos 6 caracteres";
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        title: "Error de autenticación",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setForm({ email: "", password: "", confirmPassword: "" });
    setErrors({});
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Academy Quiz</h1>
          <p className="text-muted-foreground">
            {mode === "login" 
              ? "Inicia sesión en tu cuenta" 
              : "Crea tu cuenta gratuita"
            }
          </p>
        </div>

        {/* Auth Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">
              {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                    disabled={isLoading}
                    autoComplete="email"
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "login" ? "Tu contraseña" : "Mínimo 8 caracteres"}
                    value={form.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                    disabled={isLoading}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field (only for signup) */}
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repite tu contraseña"
                      value={form.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className={`pl-10 pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                      disabled={isLoading}
                      autoComplete="new-password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "login" ? "Iniciando sesión..." : "Creando cuenta..."}
                  </>
                ) : (
                  mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"
                )}
              </Button>
            </form>

            {/* Mode Switch */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
              </p>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={switchMode}
                disabled={isLoading}
              >
                {mode === "login" ? "Crear una cuenta" : "Iniciar sesión"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        {mode === "signup" && (
          <Alert>
            <AlertDescription className="text-sm text-center">
              Al crear una cuenta, aceptas nuestros términos de servicio y política de privacidad.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
};

export default Auth;
