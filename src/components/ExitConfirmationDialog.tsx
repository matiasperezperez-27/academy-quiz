import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ArrowLeft, CheckCircle2, X } from "lucide-react";

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

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border-0">

        {/* Warning strip */}
        <div className="border-l-4 border-l-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{title}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {description || "Si sales ahora, perderás tu progreso actual."}
            </p>
          </div>
        </div>

        {/* Progress stats */}
        {totalQuestions > 0 && (
          <div className="px-4 py-3 space-y-3 border-b">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progreso del test</span>
              <span className="font-semibold text-foreground">{currentQuestion} / {totalQuestions}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{progress}% completado</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {score} aciertos
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
          >
            Continuar test
          </button>
          <button
            onClick={onConfirm}
            className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-card hover:bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Salir sin guardar
          </button>
        </div>

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