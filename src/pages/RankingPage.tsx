import { useAuth } from "@/hooks/useAuth";
import { useRankingData } from "@/hooks/useRankingData";
import { 
  RankingHeader, 
  RankingTable, 
  UserRankCard, 
  RankingSkeleton 
} from "@/components/ranking";

export default function RankingPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useRankingData(50);


  if (loading) {
    return <RankingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 bg-background">
        <div className="max-w-4xl mx-auto text-center py-8">
          <p className="text-red-500 mb-4">Error al cargar el ranking: {error}</p>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reintentar
          </button>
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
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <RankingHeader 
          userPosition={userPosition}
          currentUser={currentUser}
          onRefresh={refresh}
          isRefreshing={loading}
        />

        {/* Top 3 */}
        {topThree.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topThree.map((player) => (
              <UserRankCard 
                key={player.id}
                user={player}
                isCurrentUser={player.id === user?.id}
              />
            ))}
          </div>
        )}

        {/* Rest of rankings */}
        {restOfRankings.length > 0 && (
          <RankingTable 
            users={restOfRankings}
            currentUserId={user?.id}
            title="Tabla de Clasificación"
          />
        )}

        {rankings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay usuarios en el ranking aún.</p>
            <p className="text-sm mt-2">¡Sé el primero en completar un test!</p>
          </div>
        )}
      </div>
    </div>
  );
}