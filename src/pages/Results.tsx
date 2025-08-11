import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const score = location.state?.score ?? 0;
  const total = location.state?.total ?? 10;

  useEffect(() => {
    setSEO("Resultados | Academy Quiz", "Consulta tu puntuación final y empieza un nuevo test.");
  }, []);

  return (
    <main className="min-h-screen p-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>¡Has acertado {score} de {total}!</CardTitle>
        </CardHeader>
        <CardContent className="space-x-2 space-y-4">
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate("/")}>Volver al inicio</Button>
            <Button variant="secondary" onClick={() => navigate("/test-setup")}>Realizar otro Test</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
