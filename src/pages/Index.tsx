import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setSEO("Dashboard | Academy Quiz", "Empieza un nuevo test o practica tus preguntas falladas.");
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Hola{user?.email ? `, ${user.email}` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={() => navigate("/test-setup")}>Nuevo Test</Button>
          <Button className="w-full" variant="secondary" onClick={() => navigate("/practice")}>Practicar Preguntas Falladas</Button>
          <Button className="w-full" variant="ghost" onClick={signOut}>Cerrar sesión</Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default Index;
