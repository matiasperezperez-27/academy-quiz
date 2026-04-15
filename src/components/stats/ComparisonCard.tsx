import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
interface ComparisonCardProps {
  userAverage: number;
  globalAverage: number;
}
export const ComparisonCard = ({
  userAverage,
  globalAverage
}: ComparisonCardProps) => {
  const difference = userAverage - globalAverage;
  const isAbove = difference > 0;
  const isEqual = Math.abs(difference) < 1;
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Comparación con el promedio global
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Tu precisión</span>
            <span className={`text-sm font-bold ${isAbove ? 'text-teal-600 dark:text-teal-400' : isEqual ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{userAverage}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${isAbove ? 'bg-teal-500' : isEqual ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${userAverage}%` }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Promedio global</span>
            <span className="text-sm font-medium text-muted-foreground">{globalAverage}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gray-400 dark:bg-gray-500" style={{ width: `${globalAverage}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-1 border-t">
        {isEqual
          ? <><Minus className="h-4 w-4 text-amber-500" /><span className="text-sm font-medium text-amber-600 dark:text-amber-400">Estás en el promedio</span></>
          : isAbove
          ? <><ArrowUp className="h-4 w-4 text-teal-500" /><span className="text-sm font-medium text-teal-600 dark:text-teal-400">{Math.abs(difference).toFixed(1)}% sobre el promedio</span></>
          : <><ArrowDown className="h-4 w-4 text-red-500" /><span className="text-sm font-medium text-red-600 dark:text-red-400">{Math.abs(difference).toFixed(1)}% bajo el promedio</span></>
        }
      </div>
    </div>
  );
};
export default ComparisonCard;