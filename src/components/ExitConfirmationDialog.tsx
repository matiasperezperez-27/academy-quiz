import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";

interface ExitConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  currentQuestion?: number;
  totalQuestions?: number;
  score?: number;
}

export function ExitConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "¿Salir del Test?",
  description,
  currentQuestion = 0,
  totalQuestions = 0,
  score = 0,
}: ExitConfirmationDialogProps) {
  const progress = totalQuestions > 0 ? Math.round((currentQuestion / totalQuestions) * 100) : 0;
  
  const defaultDescription = totalQuestions > 0 
    ? `Has completado ${currentQuestion} de ${totalQuestions} preguntas (${progress}%). Si sales ahora, perderás tu progreso actual.`
    : "Si sales ahora, perderás tu progreso actual.";

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Progress info if available */}
        {totalQuestions > 0 && (
          <div className="py-4 space-y-3">
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progreso:</span>
                  <span className="font-medium">{currentQuestion}/{totalQuestions} ({progress}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aciertos:</span>
                  <span className="font-medium text-green-600">{score}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              💡 <strong>Sugerencia:</strong> Completar el test te dará una puntuación final y guardará tu progreso.
            </p>
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onClose} className="flex-1">
            Continuar Test
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Salir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook para manejar la confirmación de salida
export function useExitConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const showConfirmation = (onConfirm: () => void) => {
    setOnConfirmCallback(() => onConfirm);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    onConfirmCallback?.();
    setIsOpen(false);
    setOnConfirmCallback(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setOnConfirmCallback(null);
  };

  return {
    isOpen,
    showConfirmation,
    handleConfirm,
    handleClose,
  };
}