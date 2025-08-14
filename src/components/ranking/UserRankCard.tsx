import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankingUser } from "@/hooks/useRankingData";
interface UserRankCardProps {
  user: RankingUser;
  isCurrentUser?: boolean;
}
export function UserRankCard({
  user,
  isCurrentUser = false
}: UserRankCardProps) {
  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />;
      case 2:
        return <Medal className="h-8 w-8 text-gray-400 dark:text-gray-300" />;
      case 3:
        return <Trophy className="h-8 w-8 text-orange-600 dark:text-orange-400" />;
      default:
        return <Star className="h-5 w-5 text-muted-foreground" />;
    }
  };
  const getRankBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="text-white bg-yellow-500">🥇 1º</Badge>;
      case 2:
        return <Badge className="bg-gray-400 dark:bg-gray-500 text-white">🥈 2º</Badge>;
      case 3:
        return <Badge className="bg-orange-600 dark:bg-orange-500 text-white">🥉 3º</Badge>;
      default:
        return <Badge variant="outline">{position}º</Badge>;
    }
  };
  const getCardClassName = (position: number) => {
    const baseClass = "relative overflow-hidden transition-all hover:scale-[1.02]";
    // El "baseClass" no se toca, solo las clases de estilo
    if (position === 1) return `${baseClass} bg-gradient-to-br from-amber-400 via-yellow-200 to-amber-400 dark:from-yellow-800 dark:via-yellow-600 dark:to-yellow-800 border-yellow-500 dark:border-yellow-600`;
    if (position === 2) return `${baseClass} bg-gradient-to-br from-slate-400 via-slate-100 to-slate-400 dark:from-slate-600 dark:via-slate-400 dark:to-slate-600 border-slate-400 dark:border-slate-500`;
    if (position === 3) return `${baseClass} bg-gradient-to-br from-orange-500 via-amber-300 to-orange-500 dark:from-orange-800 dark:via-amber-700 dark:to-orange-800 border-orange-600 dark:border-orange-700`;
    return baseClass;
  };
  return <Card className={cn(getCardClassName(user.position || 0), isCurrentUser && "ring-2 ring-primary/20 bg-primary/5")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {getRankIcon(user.position || 0)}
          {getRankBadge(user.position || 0)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="font-bold truncate" title={user.username || user.email}>
            {user.username || user.email}
            {isCurrentUser && <span className="ml-2 text-xs text-primary">(Tú)</span>}
          </p>
          <p className="text-2xl font-bold text-primary">{user.puntos} pts</p>
        </div>
        <div className="flex justify-between text-xs text-black">
          <span>{user.total_sessions} tests</span>
          <span>{Math.round(user.accuracy)}% precisión</span>
        </div>
      </CardContent>
    </Card>;
}