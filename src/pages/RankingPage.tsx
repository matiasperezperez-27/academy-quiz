import { useAuth } from "@/hooks/useAuth";
import { useRankingData } from "@/hooks/useRankingData";
import { 
  RankingHeader, 
  RankingTable, 
  UserRankCard, 
  RankingSkeleton 
} from "@/components/ranking";
import { Trophy, Star, Sparkles, Target } from "lucide-react";
import { useEffect } from "react";

export default function RankingPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useRankingData(50);

  // SOLUCIÓN 1: Carga inicial automática
  useEffect(() => {
    if (!data && !loading && !error) {
      refresh();
    }
  }, []);

  if (loading) {
    return <RankingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-red-950/20 dark:via-gray-900 dark:to-red-950/20">
        <div className="max-w-4xl mx-auto text-center py-8">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-red-200 dark:border-red-800 rounded-2xl p-8 shadow-2xl shadow-red-500/10">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <p className="text-red-600 dark:text-red-400 mb-6 text-lg font-medium">Error al cargar el ranking: {error}</p>
            <button 
              onClick={refresh}
              className="min-h-[44px] md:min-h-[48px] px-6 py-4 md:px-8 md:py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-200 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Reintentar
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <RankingSkeleton />;
  }

  const { rankings, userPosition } = data;
  const currentUser = rankings.find(r => r.id === user?.id) || null;
  const topThree = rankings.slice(0, 3);
  const restOfRankings = rankings.slice(3);

  return (
    <div className="min-h-screen p-3 md:p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-sm md:max-w-7xl mx-auto space-y-3 md:space-y-8">
        
        {/* SOLUCIÓN 3: Enhanced Header más compacto en móvil */}
        <div className="relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl md:rounded-3xl shadow-2xl shadow-blue-500/10 dark:shadow-blue-500/5">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:via-purple-400/5 dark:to-indigo-400/5"></div>
          <div className="absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-16 md:w-24 h-16 md:h-24 bg-gradient-to-tr from-blue-400/20 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
          <div className="relative">
            <RankingHeader 
              userPosition={userPosition}
              currentUser={currentUser}
              onRefresh={refresh}
              isRefreshing={loading}
            />
          </div>
        </div>

        {/* Visual Podium Section for Top 3 */}
        {topThree.length > 0 && (
          <div className="space-y-4">
            {/* Podium Title */}
            <div className="text-center">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 text-white px-6 py-3 rounded-full shadow-lg shadow-yellow-500/25">
                <Trophy className="w-5 h-5" />
                <span className="font-bold text-lg">🏆 Podio de Honor</span>
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            {/* Mobile Podium (Stacked) - más compacto */}
            <div className="md:hidden space-y-2">
              {topThree.map((player, index) => (
                <div key={player.id} className="relative">
                  {/* Podium Platform for Mobile - más delgada */}
                  <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-full h-3 rounded-b-lg ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30' :
                    index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500 shadow-lg shadow-gray-400/30' :
                    'bg-gradient-to-r from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30'
                  }`}></div>
                  
                  {/* Enhanced Card with Podium Effects */}
                  <div className="relative transform hover:scale-[1.02] transition-all duration-300">
                    <UserRankCard 
                      user={player}
                      isCurrentUser={player.id === user?.id}
                    />
                    
                    {/* Floating Elements */}
                    {index === 0 && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Podium (Side by Side with Heights) */}
            <div className="hidden md:block">
              <div className="flex items-end justify-center gap-6 max-w-4xl mx-auto">
                {/* 2nd Place */}
                {topThree[1] && (
                  <div className="flex-1 max-w-sm">
                    <div className="relative mb-4">
                      <div className="h-16 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-xl shadow-xl shadow-gray-400/40 flex items-end justify-center pb-2">
                        <span className="text-white font-bold text-lg">2°</span>
                      </div>
                      <div className="transform -translate-y-2 hover:scale-[1.02] transition-all duration-300">
                        <UserRankCard 
                          user={topThree[1]}
                          isCurrentUser={topThree[1].id === user?.id}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st Place (Highest) */}
                {topThree[0] && (
                  <div className="flex-1 max-w-sm">
                    <div className="relative mb-4">
                      <div className="h-24 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-xl shadow-2xl shadow-yellow-500/50 flex items-end justify-center pb-3 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        <span className="text-white font-bold text-xl relative z-10">1°</span>
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-white/30 rounded-full animate-bounce"></div>
                      </div>
                      <div className="transform -translate-y-2 hover:scale-[1.05] transition-all duration-300">
                        <UserRankCard 
                          user={topThree[0]}
                          isCurrentUser={topThree[0].id === user?.id}
                        />
                        {/* SOLUCIÓN 2: Winner Celebration mejorada */}
<div className="absolute -top-6 -right-3 z-10">
  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-xl shadow-yellow-500/40 animate-pulse">
    <Star className="w-5 h-5 text-white fill-white" />
  </div>
</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <div className="flex-1 max-w-sm">
                    <div className="relative mb-4">
                      <div className="h-12 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-xl shadow-lg shadow-orange-500/40 flex items-end justify-center pb-2">
                        <span className="text-white font-bold">3°</span>
                      </div>
                      <div className="transform -translate-y-2 hover:scale-[1.02] transition-all duration-300">
                        <UserRankCard 
                          user={topThree[2]}
                          isCurrentUser={topThree[2].id === user?.id}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Ranking Table */}
        {restOfRankings.length > 0 && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl shadow-gray-500/10 overflow-hidden">
            <RankingTable 
              users={restOfRankings}
              currentUserId={user?.id}
              title="Tabla de Clasificación"
            />
          </div>
        )}

        {/* Enhanced Empty State */}
        {rankings.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-3xl p-12 shadow-2xl shadow-gray-500/10 max-w-2xl mx-auto">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-full flex items-center justify-center">
                  <Target className="w-12 h-12 text-blue-500 dark:text-blue-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">¡El ranking está vacío!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">No hay usuarios en el ranking aún.</p>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white min-h-[44px] md:min-h-[48px] px-6 py-4 md:px-8 md:py-4 rounded-xl font-medium shadow-lg shadow-blue-500/25">
                <Star className="w-5 h-5" />
                <span>¡Sé el primero en completar un test!</span>
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}