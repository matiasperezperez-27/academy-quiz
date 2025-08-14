import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface RankingSkeletonProps {
  showTopThree?: boolean;
}

export function RankingSkeleton({ showTopThree = true }: RankingSkeletonProps) {
  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="text-center space-y-2">
          <div className="h-8 bg-muted rounded-lg w-64 mx-auto animate-pulse" />
          <div className="h-4 bg-muted rounded-lg w-96 mx-auto animate-pulse" />
        </div>

        {/* User position skeleton */}
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-6 w-6 bg-muted rounded" />
                <div>
                  <div className="h-4 w-20 bg-muted rounded mb-2" />
                  <div className="h-6 w-12 bg-muted rounded" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 w-16 bg-muted rounded mb-2" />
                <div className="h-6 w-20 bg-muted rounded" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 3 skeleton */}
        {showTopThree && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-6 bg-muted rounded" />
                    <div className="h-6 w-12 bg-muted rounded" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <div className="h-5 w-32 bg-muted rounded mb-2" />
                    <div className="h-6 w-20 bg-muted rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-16 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table skeleton */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-4 bg-muted rounded" />
                    <div>
                      <div className="h-4 w-32 bg-muted rounded mb-1" />
                      <div className="h-3 w-48 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-16 bg-muted rounded mb-1" />
                    <div className="h-3 w-12 bg-muted rounded" />
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