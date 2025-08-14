import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ComparisonCardProps {
  userAverage: number;
  globalAverage: number;
}

export const ComparisonCard = ({ userAverage, globalAverage }: ComparisonCardProps) => {
  const difference = userAverage - globalAverage;
  const isAbove = difference > 0;
  const isEqual = Math.abs(difference) < 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparación con el Promedio Global</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Tu promedio</span>
            <span className="text-2xl font-bold text-primary">{userAverage}%</span>
          </div>
          <Progress value={userAverage} className="h-3" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Promedio global</span>
            <span className="text-lg font-semibold text-muted-foreground">{globalAverage}%</span>
          </div>
          <Progress value={globalAverage} className="h-2" />
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-center gap-2">
            {isEqual ? (
              <>
                <Minus className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-600 font-medium">
                  Estás en el promedio
                </span>
              </>
            ) : isAbove ? (
              <>
                <ArrowUp className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">
                  {Math.abs(difference).toFixed(1)}% sobre el promedio
                </span>
              </>
            ) : (
              <>
                <ArrowDown className="h-5 w-5 text-red-600" />
                <span className="text-red-600 font-medium">
                  {Math.abs(difference).toFixed(1)}% bajo el promedio
                </span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComparisonCard;