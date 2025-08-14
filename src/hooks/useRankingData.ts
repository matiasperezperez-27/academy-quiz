import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RankingUser {
  id: string;
  username: string;
  email: string;
  puntos: number;
  total_sessions: number;
  accuracy: number;
  position?: number;
}

interface RankingData {
  rankings: RankingUser[];
  userPosition: number | null;
  totalUsers: number;
}

export function useRankingData(limit: number = 50) {
  const { user } = useAuth();
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRankings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the get_user_rankings function
      const { data: rankingsData, error: rankingsError } = await supabase
        .rpc('get_user_rankings' as any, { limit_count: limit }) as { data: RankingUser[] | null, error: any };
      
      if (rankingsError) throw rankingsError;
      
      // Add position to each user
      const rankingsWithPosition = (rankingsData || []).map((user: RankingUser, index: number) => ({
        ...user,
        position: index + 1,
        accuracy: Number(user.accuracy) || 0 // Ensure accuracy is a number
      }));
      
      // Find current user position
      const currentUserPosition = rankingsWithPosition.findIndex(
        (r: RankingUser) => r.id === user?.id
      );
      
      setData({
        rankings: rankingsWithPosition,
        userPosition: currentUserPosition !== -1 ? currentUserPosition + 1 : null,
        totalUsers: rankingsWithPosition.length
      });
      
    } catch (error) {
      console.error("Error loading rankings:", error);
      setError(error instanceof Error ? error.message : "Error al cargar el ranking");
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  return {
    data,
    loading,
    error,
    refresh: loadRankings
  };
}