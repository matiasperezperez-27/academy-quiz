import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, AlertTriangle } from "lucide-react";

export default function ResetProgress() {
  const [userId, setUserId] = useState("");
  const [temaId, setTemaId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resetType, setResetType] = useState<"total" | "tema">("total");
  const { toast } = useToast();

  const handleReset = async () => {
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "Debes introducir un ID de usuario",
        variant: "destructive"
      });
      return;
    }

    if (resetType === "tema" && !temaId.trim()) {
      toast({
        title: "Error",
        description: "Debes introducir un ID de tema para reset parcial",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.rpc("reset_user_progress" as any, {
        p_user_id: userId.trim(),
        p_tema_id: resetType === "tema" ? temaId.trim() : null
      });

      if (error) throw error;

      toast({
        title: "✅ Progreso Reseteado",
        description: resetType === "tema" 
          ? `Progreso del tema ${temaId} eliminado para usuario ${userId}`
          : `Todo el progreso eliminado para usuario ${userId}`,
      });

      setUserId("");
      setTemaId("");
      setShowConfirmDialog(false);

    } catch (error: any) {
      console.error("Error resetting progress:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo resetear el progreso",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <AlertTriangle className="h-5 w-5" />
          Reset de Progreso de Usuario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userId">ID del Usuario *</Label>
          <Input
            id="userId"
            placeholder="ej: 123e4567-e89b-12d3-a456-426614174000"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-3">
          <Label>Tipo de Reset</Label>
          <div className="flex flex-col space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="resetType"
                value="total"
                checked={resetType === "total"}
                onChange={(e) => setResetType(e.target.value as "total" | "tema")}
              />
              <span className="text-sm">Reset Total (todas las preguntas)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="resetType"
                value="tema"
                checked={resetType === "tema"}
                onChange={(e) => setResetType(e.target.value as "total" | "tema")}
              />
              <span className="text-sm">Reset por Tema (solo un tema)</span>
            </label>
          </div>
        </div>

        {resetType === "tema" && (
          <div className="space-y-2">
            <Label htmlFor="temaId">ID del Tema *</Label>
            <Input
              id="temaId"
              placeholder="ej: tema-matematicas-123"
              value={temaId}
              onChange={(e) => setTemaId(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        )}

        <Button
          onClick={() => setShowConfirmDialog(true)}
          variant="destructive"
          disabled={isLoading || !userId.trim()}
          className="w-full"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          {resetType === "tema" ? "Reset Tema" : "Reset Total"}
        </Button>

        <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
          ⚠️ <strong>Acción irreversible:</strong> El progreso eliminado no se puede recuperar.
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Confirmar Reset de Progreso
              </AlertDialogTitle>
              <AlertDialogDescription>
                {resetType === "tema" ? (
                  <>
                    ¿Estás seguro de que quieres eliminar el progreso del tema{" "}
                    <code className="bg-muted px-1 rounded">{temaId}</code> para el usuario{" "}
                    <code className="bg-muted px-1 rounded">{userId}</code>?
                  </>
                ) : (
                  <>
                    ¿Estás seguro de que quieres eliminar <strong>TODO</strong> el progreso del usuario{" "}
                    <code className="bg-muted px-1 rounded">{userId}</code>?
                  </>
                )}
                <br /><br />
                <strong>Esta acción no se puede deshacer.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? "Eliminando..." : "Sí, Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}