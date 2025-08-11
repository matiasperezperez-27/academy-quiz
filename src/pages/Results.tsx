import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  RotateCcw, 
  Home, 
  BookOpen,
  Award,
  AlertCircle
} from "lucide-react";

interface ResultsState {
  score: number;
  total: number;
  mode?: "test" | "practice";
  timeSpent?: number;
  questionsCorrect?: string[];
  questionsIncorrect?: string[];
}

interface PerformanceLevel {
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  bgColor: string;
}

function setSEO(title: string, description: string) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
  meta.setAttribute("name", "description");
  meta.setAttribute("content", description);
  document.head.appendChild(meta);
}

const getPerformanceLevel = (percentage: number): PerformanceLevel => {
  if (percentage >= 90) {
    return {
      title: "¡Excelente!",
      description: "Dominas completamente este tema",
      color: "text-green-600",
      icon: <Trophy className="h-6 w-6" />,
      bgColor: "bg-green-50 border-green-200"
    };
  } else if (percentage >= 75) {
    return {
      title: "¡Muy Bien!",
      description: "Tienes un buen dominio del tema",
      color: "text-blue-600",
      icon: <Award className="h-6 w-6" />,
      bgColor: "bg-blue-50 border-blue-200"
    };
  } else if (percentage >= 60) {
    return {
      title: "Bien",
      description: "Vas por buen camino, sigue practicando",
      color: "text-yellow-600",
      icon: <Target className="h-6 w-6" />,
      bgColor: "bg-yellow-50 border-yellow-200"
    };
  } else if (percentage >= 40) {
    return {
      title: "Puedes Mejorar",
      description: "Necesitas repasar algunos conceptos",
      color: "text-orange-600",
      icon: <TrendingUp className="h-6 w-6" />,
      bgColor: "bg-orange-50 border-orange-200"
    };
  } else {
    return {
      title: "Sigue Estudiando",
      description: "Te recomendamos repasar este tema",
      color: "text-red-600",
      icon: <AlertCircle className="h-6 w-6" />,
      bgColor: "bg-red-50 border-red-200"
    };
  }
};

const getEncouragementMessage = (percentage: number, mode: string): string => {
  if (mode === "practice") {
    if (percentage >= 80) {
      return "¡Excelente! Has mejorado significativamente en tus preguntas falladas.";
    } else if (percentage >= 60) {
      return "Buen progreso. Sigue practicando para dominar completamente estos temas.";
    } else {
      return "No te desanimes. La práctica constante es la clave del éxito.";
    }
  } else {
    if (percentage >= 80) {
      return "¡Impresionante! Tienes un excelente dominio de este tema.";
    } else if (percentage >= 60) {
      return "¡Bien hecho! Estás en el camino correcto hacia el dominio del tema.";
    } else {
      return "Cada error es una oportunidad de aprender. ¡No te rindas!";
    }
  }
};

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: ResultsState };
  
  const {
    score = 0,
    total = 10,
    mode = "test",
    timeSpent,
    questionsCorrect = [],
    questionsIncorrect = []
  } = location.state || {};

  useEffect(() => {
    setSEO(
      "Resultados del Quiz | Academy Quiz", 
      `Has completado el ${mode === "practice" ? "modo práctica" : "test"} con ${score} aciertos de ${total} preguntas.`
    );
  }, [score, total, mode]);

  const percentage = useMemo(() => 
    total > 0 ? Math.round((score / total) * 100) : 0, 
    [score, total]
  );

  const performance = useMemo(() => 
    getPerformanceLevel(percentage), 
    [percentage]
  );

  const encouragementMessage = useMemo(() => 
    getEncouragementMessage(percentage, mode), 
    [percentage, mode]
  );

  const incorrectCount = total - score;

  // If no state data, redirect to home
  useEffect(() => {
    if (!location.state) {
      navigate("/", { replace: true });
    }
  }, [location.state, navigate]);

  if (!location.state) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Main Results Card */}
        <Card className="w-full">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${performance.bgColor} border-2`}>
                <div className={performance.color}>
                  {performance.icon}
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">
              {performance.title}
            </CardTitle>
            <p className="text-muted-foreground text-base">
              {performance.description}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <div className="text-4xl sm:text-6xl font-bold">
                  <span className="text-primary">{score}</span>
                  <span className="text-2xl sm:text-3xl text-muted-foreground">/{total}</span>
                </div>
                <div className="space-y-2">
                  <Progress value={percentage} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0%</span>
                    <span className="font-medium">{percentage}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{score}</div>
                <div className="text-sm text-green-700">Correctas</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
                <div className="text-sm text-red-700">Incorrectas</div>
              </div>
            </div>

            {/* Mode Badge */}
            <div className="flex justify-center">
              <Badge variant="outline" className="px-3 py-1">
                <BookOpen className="h-3 w-3 mr-1" />
                {mode === "practice" ? "Modo Práctica" : "Modo Test"}
              </Badge>
            </div>

            {/* Encouragement Message */}
            <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-primary">
              <p className="text-sm text-center italic">
                {encouragementMessage}
              </p>
            </div>

            {/* Time Spent (if available) */}
            {timeSpent && (
              <div className="text-center text-sm text-muted-foreground">
                Tiempo empleado: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button 
                onClick={() => navigate("/")}
                variant="default"
                className="w-full"
                size="lg"
              >
                <Home className="mr-2 h-4 w-4" />
                Ir al Inicio
              </Button>
              
              <Button 
                onClick={() => navigate("/test-setup")}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Nuevo Test
              </Button>
            </div>

            {/* Practice Button (if there are incorrect answers and it's test mode) */}
            {mode === "test" && incorrectCount > 0 && (
              <div className="mt-3">
                <Button 
                  onClick={() => navigate("/practice")}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Practicar Preguntas Falladas ({incorrectCount})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Stats (if available) */}
        {(questionsCorrect.length > 0 || questionsIncorrect.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles del Quiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionsCorrect.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 mb-2">
                    Preguntas Correctas ({questionsCorrect.length})
                  </h4>
                  <div className="space-y-1">
                    {questionsCorrect.slice(0, 3).map((q, index) => (
                      <p key={index} className="text-sm text-muted-foreground truncate">
                        • {q}
                      </p>
                    ))}
                    {questionsCorrect.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ... y {questionsCorrect.length - 3} más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {questionsIncorrect.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2">
                    Preguntas a Repasar ({questionsIncorrect.length})
                  </h4>
                  <div className="space-y-1">
                    {questionsIncorrect.slice(0, 3).map((q, index) => (
                      <p key={index} className="text-sm text-muted-foreground truncate">
                        • {q}
                      </p>
                    ))}
                    {questionsIncorrect.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ... y {questionsIncorrect.length - 3} más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>¡Sigue practicando para mejorar tus resultados!</p>
        </div>
      </div>
    </main>
  );
}
