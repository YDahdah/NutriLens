/**
 * MealList Component - Displays list of meals for a selected meal type
 * Extracted from CalorieTracker for better code organization
 */
import React, { useState, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trash2, Clock } from 'lucide-react';
import { Meal, FoodItem } from '@/types';

interface MealListProps {
  meals: Meal[];
  selectedMeal: string;
  onFoodRemove: (mealId: string, foodId: string) => void;
}

export const MealList: React.FC<MealListProps> = memo(({
  meals,
  selectedMeal,
  onFoodRemove,
}) => {
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const normalizedSelectedMeal = selectedMeal.toLowerCase();
  const currentMeal = meals.find(m => m.name.toLowerCase() === normalizedSelectedMeal);

  if (!currentMeal || currentMeal.foods.length === 0) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm sm:text-base">No foods logged for {selectedMeal} yet.</p>
          <p className="text-xs sm:text-sm mt-2">Add foods using the form below.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold capitalize">{selectedMeal}</h3>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>{currentMeal.time}</span>
        </div>
      </div>

      <ScrollArea className="h-[300px] sm:h-[400px] pr-4">
        <div className="space-y-3">
          {currentMeal.foods.map((food: FoodItem) => (
            <div
              key={food.id}
              onClick={() => setSelectedFood(food)}
              className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer active:scale-[0.98]"
              title="Click to view detailed macros"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm sm:text-base truncate">{food.name}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {food.amount} {food.unit}
                  </Badge>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {Math.round(food.calories)} kcal
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                  <span>P: {food.protein.toFixed(1)}g</span>
                  <span>•</span>
                  <span>C: {food.carbs.toFixed(1)}g</span>
                  <span>•</span>
                  <span>F: {food.fat.toFixed(1)}g</span>
                  {food.fiber > 0 && (
                    <>
                      <span>•</span>
                      <span>Fiber: {food.fiber.toFixed(1)}g</span>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onFoodRemove(currentMeal.id, food.id);
                }}
                className="ml-2 flex-shrink-0"
                aria-label={`Remove ${food.name} from ${selectedMeal}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Food Macros Dialog */}
      <Dialog open={selectedFood !== null} onOpenChange={(open) => !open && setSelectedFood(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedFood?.name}</DialogTitle>
            <DialogDescription>
              Nutritional information for {selectedFood?.amount} {selectedFood?.unit}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFood && (
            <div className="space-y-4 mt-4">
              {/* Calories - Highlighted */}
              <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-900 dark:text-orange-200">Calories</span>
                  <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {Math.round(selectedFood.calories)}
                  </span>
                </div>
                <span className="text-xs text-orange-700 dark:text-orange-400">kcal</span>
              </div>

              {/* Macros Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Protein */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                  <div className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1">Protein</div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {selectedFood.protein.toFixed(1)}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">g</div>
                </div>

                {/* Carbs */}
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="text-xs font-medium text-green-900 dark:text-green-200 mb-1">Carbs</div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {selectedFood.carbs.toFixed(1)}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">g</div>
                </div>

                {/* Fat */}
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900">
                  <div className="text-xs font-medium text-purple-900 dark:text-purple-200 mb-1">Fat</div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {selectedFood.fat.toFixed(1)}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">g</div>
                </div>
              </div>

              {/* Additional Info */}
              {selectedFood.fiber > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Fiber</span>
                    <span className="text-base font-semibold">{selectedFood.fiber.toFixed(1)} g</span>
                  </div>
                </div>
              )}

              {/* Serving Info */}
              <div className="pt-3 border-t text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Serving Size:</span>
                  <span className="font-medium">{selectedFood.amount} {selectedFood.unit}</span>
                </div>
                {selectedFood.serving && (
                  <div className="flex items-center justify-between mt-1">
                    <span>Standard Serving:</span>
                    <span className="font-medium">{selectedFood.serving}</span>
                  </div>
                )}
                {selectedFood.category && (
                  <div className="flex items-center justify-between mt-1">
                    <span>Category:</span>
                    <Badge variant="outline" className="font-medium capitalize">
                      {selectedFood.category}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">Total for {selectedMeal}:</span>
          <div className="flex items-center gap-4">
            <span>{Math.round(currentMeal.totalCalories)} cal</span>
            <span className="text-muted-foreground">
              P: {currentMeal.totalProtein.toFixed(1)}g
            </span>
            <span className="text-muted-foreground">
              C: {currentMeal.totalCarbs.toFixed(1)}g
            </span>
            <span className="text-muted-foreground">
              F: {currentMeal.totalFat.toFixed(1)}g
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

MealList.displayName = 'MealList';

