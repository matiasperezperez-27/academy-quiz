import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankingUser } from "@/hooks/useRankingData";

interface UserRankCardProps {
  user: RankingUser;
  isCurrentUser?: boolean;
}

export function UserRankCard({ user, isCurrentUser = false }: UserRankCardProps) {
  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2: return <Medal className="h-6 w-6 text-gray-400" />;
      case 3: return <Trophy className="h-6 w-6 text-orange-600" />;
      default: return <Star className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankBadge = (position: number) => {
    switch (position) {
      case 1: return <Badge className="bg-yellow-500 text-white">🥇 1º</Badge>;
      case 2: return <Badge className="bg-gray-400 text-white">🥈 2º</Badge>;
      case 3: return <Badge className="bg-orange-600 text-white">🥉 3º</Badge>;
      default: return <Badge variant="outline">{position}º</Badge>;
    }
  };

  const getCardClassName = (position: number) => {
    const baseClass = "relative overflow-hidden transition-all hover:scale-[1.02]";
    if (position === 1) return `${baseClass} bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300`;
    if (position === 2) return `${baseClass} bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300`;
    if (position === 3) return `${baseClass} bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300`;
    return baseClass;
  };

  return (
    <Card 
      className={cn(
        getCardClassName(user.position || 0),
        isCurrentUser && "ring-2 ring-primary/20 bg-primary/5"
      )}
    >
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
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{user.total_sessions} tests</span>
          <span>{Math.round(user.accuracy)}% precisión</span>
        </div>
      </CardContent>
    </Card>
  );
}