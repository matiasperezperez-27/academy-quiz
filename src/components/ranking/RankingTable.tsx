import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RankingUser } from "@/hooks/useRankingData";

interface RankingTableProps {
  users: RankingUser[];
  currentUserId?: string;
  title?: string;
}

export function RankingTable({ 
  users, 
  currentUserId, 
  title = "Tabla de Clasificación" 
}: RankingTableProps) {
  if (!users || users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay usuarios para mostrar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors",
                user.id === currentUserId && "bg-primary/5 border border-primary/20"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 text-center font-bold text-muted-foreground">
                  {user.position}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate" title={user.username || user.email}>
                    {user.username || user.email}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-primary font-normal">(Tú)</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user.total_sessions} tests • {Math.round(user.accuracy)}% precisión
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{user.puntos}</p>
                <p className="text-xs text-muted-foreground">puntos</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}