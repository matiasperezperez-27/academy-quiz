import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface RankingUser {
  id: string;
  username: string;
  email: string;
  puntos: number;
  total_sessions: number;
  accuracy: number;
  position: number;
}

export default function RankingPage() {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, [user]);

  const loadRankings = async () => {
    try {
      setLoading(true);
      
      // Cargar top usuarios
      const { data, error } = await supabase
        .rpc('get_user_rankings' as any, { limit_count: 50 });
      
      if (error) throw error;
      
      const rankingData = (data || []).map((user: any, index: number) => ({
        ...user,
        position: index + 1
      }));
      
      setRankings(rankingData);
      
      // Encontrar posición del usuario actual
      const currentUserPosition = rankingData.findIndex((r: RankingUser) => r.id === user?.id);
      setUserPosition(currentUserPosition !== -1 ? currentUserPosition + 1 : null);
      
    } catch (error) {
      console.error("Error loading rankings:", error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen p-4 bg-background">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">🏆 Ranking Global</h1>
          <p className="text-muted-foreground">Los mejores estudiantes de Academy Quiz</p>
        </div>

        {/* Tu posición */}
        {userPosition && (
          <Card className="bg-primary/5 border-primary/20">
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
                    {rankings.find(r => r.id === user?.id)?.puntos || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rankings.slice(0, 3).map((player) => (
            <Card 
              key={player.id}
              className={cn(
                "relative overflow-hidden",
                player.position === 1 && "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300",
                player.position === 2 && "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300",
                player.position === 3 && "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {getRankIcon(player.position)}
                  {getRankBadge(player.position)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-bold truncate">{player.username || player.email}</p>
                  <p className="text-2xl font-bold text-primary">{player.puntos} pts</p>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{player.total_sessions} tests</span>
                  <span>{player.accuracy}% precisión</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resto del ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Tabla de Clasificación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rankings.slice(3).map((player) => (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors",
                    player.id === user?.id && "bg-primary/5 border border-primary/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center font-bold text-muted-foreground">
                      {player.position}
                    </div>
                    <div>
                      <p className="font-medium">{player.username || player.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.total_sessions} tests • {player.accuracy}% precisión
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{player.puntos}</p>
                    <p className="text-xs text-muted-foreground">puntos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}