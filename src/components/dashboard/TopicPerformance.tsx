import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TopicPerformanceProps {
  bestTopics: Array<{ name: string; accuracy: number; questionsAnswered: number }>;
  worstTopics: Array<{ name: string; accuracy: number; questionsAnswered: number }>;
}

export function TopicPerformance({ bestTopics, worstTopics }: TopicPerformanceProps) {
  const TopicCard = ({ topic, isPositive }: { topic: any; isPositive: boolean }) => (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-full",
          isPositive ? "bg-green-100" : "bg-red-100"
        )}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </div>
        <div>
          <div className="font-medium text-sm">{topic.name}</div>
          <div className="text-xs text-muted-foreground">
            {topic.questionsAnswered} preguntas
          </div>
        </div>
      </div>
      <Badge
        variant={isPositive ? "default" : "secondary"}
        className={cn(
          isPositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        )}
      >
        {topic.accuracy}%
      </Badge>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          Rendimiento por Tema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {bestTopics.length > 0 && (
          <div>
            <h4 className="font-medium text-green-600 mb-3">🏆 Mejores Temas</h4>
            <div className="space-y-2">
              {bestTopics.map((topic, index) => (
                <TopicCard key={index} topic={topic} isPositive={true} />
              ))}
            </div>
          </div>
        )}

        {worstTopics.length > 0 && (
          <div>
            <h4 className="font-medium text-red-600 mb-3">📚 Temas a Mejorar</h4>
            <div className="space-y-2">
              {worstTopics.map((topic, index) => (
                <TopicCard key={index} topic={topic} isPositive={false} />
              ))}
            </div>
          </div>
        )}

        {bestTopics.length === 0 && worstTopics.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2" />
            <p>Completa más tests para ver tu rendimiento por tema</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
