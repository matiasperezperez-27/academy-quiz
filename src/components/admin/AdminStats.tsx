import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, MessageSquare, PlayCircle, TrendingUp } from 'lucide-react';

interface AdminStatsData {
  total_users: number;
  total_questions_answered: number;
  total_sessions: number;
  active_users_last_week: number;
}

export default function AdminStats() {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_admin_stats' as any);
        if (error) throw error;
        
        if (data && Array.isArray(data) && data.length > 0) {
          setStats(data[0] as AdminStatsData);
        }
      } catch (error) {
        console.error('Error loading admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No se pudieron cargar las estadísticas
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: "Total Usuarios",
      value: stats.total_users,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Preguntas Respondidas",
      value: stats.total_questions_answered,
      icon: MessageSquare,
      color: "text-green-600"
    },
    {
      title: "Sesiones Totales",
      value: stats.total_sessions,
      icon: PlayCircle,
      color: "text-purple-600"
    },
    {
      title: "Usuarios Activos (7d)",
      value: stats.active_users_last_week,
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}