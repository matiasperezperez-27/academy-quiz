import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Trophy } from "lucide-react";
import type { RankingUser } from "@/hooks/useRankingData";
interface RankingHeaderProps {
  userPosition?: number | null;
  currentUser?: RankingUser | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}
export function RankingHeader({
  userPosition,
  currentUser,
  onRefresh,
  isRefreshing = false
}: RankingHeaderProps) {
  const getRankIcon = (position?: number | null) => {
    if (!position) return <Trophy className="h-6 w-6 text-muted-foreground" />;
    if (position <= 3) return <Trophy className="h-8 w-8 text-yellow-500" />;
    return <Trophy className="h-6 w-6 text-muted-foreground" />;
  };
  return <div className="space-y-6">
      {/* Main Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-3xl font-bold">🏆 Ranking Global</h1>
          {onRefresh && <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing} className="ml-2">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>}
        </div>
        <p className="text-muted-foreground">Los mejores estudiantes de Academy Quiz</p>
      </div>

      {/* User Position Card */}
      {userPosition && currentUser && <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getRankIcon(userPosition)}
                <div>
                  <p className="text-sm text-muted-foreground">Tu posición</p>
                  <p className="text-2xl font-bold">#{userPosition}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Tus puntos</p>
                <p className="text-2xl font-bold text-primary">
                  {currentUser.puntos}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
              <span>{currentUser.total_sessions} tests completados</span>
              <span>{Math.round(currentUser.accuracy)}% de precisión</span>
            </div>
          </CardContent>
        </Card>}
    </div>;
}