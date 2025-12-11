/**
 * Custom hook for managing meals state and operations
 * Extracts complex meal management logic from CalorieTracker
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { Meal, FoodItem } from '@/types';
import UserDataService from '@/services/UserDataService';

interface UseMealsOptions {
  isAuthenticated: boolean;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export function useMeals({ isAuthenticated, onSaveSuccess, onSaveError }: UseMealsOptions) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const isSavingRef = useRef(false);
  // Use useMemo to ensure stable reference for singleton
  const userDataService = useMemo(() => UserDataService.getInstance(), []);

  // Helper function to ensure meal totals are valid numbers
  const normalizeMealTotals = useCallback((meal: Meal): Meal => {
    // Always recalculate totals from foods to ensure accuracy
    // This ensures totals match the actual foods in the meal
    const totals = meal.foods.reduce(
      (acc, food) => ({
        calories: acc.calories + (food.calories || 0),
        protein: acc.protein + (food.protein || 0),
        carbs: acc.carbs + (food.carbs || 0),
        fat: acc.fat + (food.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Check if foods have nutritional data
    const hasNutritionalData = meal.foods.length > 0 && meal.foods.some(f => 
      (f.calories && f.calories > 0) || 
      (f.protein && f.protein > 0) || 
      (f.carbs && f.carbs > 0) || 
      (f.fat && f.fat > 0)
    );

    // Use recalculated totals if foods have nutritional data, otherwise preserve stored totals (if valid)
    return {
      ...meal,
      totalCalories: hasNutritionalData ? totals.calories : (isNaN(meal.totalCalories) ? 0 : (meal.totalCalories || 0)),
      totalProtein: hasNutritionalData ? totals.protein : (isNaN(meal.totalProtein) ? 0 : (meal.totalProtein || 0)),
      totalCarbs: hasNutritionalData ? totals.carbs : (isNaN(meal.totalCarbs) ? 0 : (meal.totalCarbs || 0)),
      totalFat: hasNutritionalData ? totals.fat : (isNaN(meal.totalFat) ? 0 : (meal.totalFat || 0)),
    };
  }, []);

  const loadMeals = useCallback(async () => {
    if (!isAuthenticated || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const savedMeals = await userDataService.getTodayMeals();
      if (savedMeals && savedMeals.length > 0) {
        setMeals((currentMeals) => {
          // Merge saved meals with current meals, preserving all foods
          const mergedMeals: Meal[] = currentMeals.length > 0 
            ? currentMeals.map(meal => ({
                ...meal,
                foods: [...meal.foods]
              }))
            : [];
          
          savedMeals.forEach((savedMeal: Meal) => {
            const existingMeal = mergedMeals.find(
              m => m.name.toLowerCase() === savedMeal.name.toLowerCase()
            );
            if (existingMeal) {
              // Merge foods that don't exist - ensure foods have all nutritional fields
              savedMeal.foods.forEach((savedFood: FoodItem) => {
                const foodExists = existingMeal.foods.some(f => f.id === savedFood.id);
                if (!foodExists) {
                  // Ensure food has all required nutritional fields
                  const normalizedFood: FoodItem = {
                    ...savedFood,
                    calories: savedFood.calories || 0,
                    protein: savedFood.protein || 0,
                    carbs: savedFood.carbs || 0,
                    fat: savedFood.fat || 0,
                  };
                  existingMeal.foods.push(normalizedFood);
                }
              });
              // Recalculate totals from all foods after merging
              const normalizedIndex = mergedMeals.findIndex(m => m.id === existingMeal.id);
              if (normalizedIndex >= 0) {
                mergedMeals[normalizedIndex] = normalizeMealTotals(existingMeal);
              }
            } else {
              // Ensure all foods in saved meal have nutritional fields
              const foodsWithNutrition = savedMeal.foods.map((food: FoodItem) => ({
                ...food,
                calories: food.calories || 0,
                protein: food.protein || 0,
                carbs: food.carbs || 0,
                fat: food.fat || 0,
              }));
              // Normalize meal totals before adding
              const normalizedMeal = normalizeMealTotals({
                ...savedMeal,
                foods: foodsWithNutrition
              });
              mergedMeals.push(normalizedMeal);
            }
          });
          
          // Normalize all meals before returning
          const normalizedMeals = mergedMeals.map(meal => normalizeMealTotals(meal));
          lastSavedRef.current = JSON.stringify(normalizedMeals);
          return normalizedMeals;
        });
      }
    } catch (error) {
      console.error('Failed to load meals:', error);
      onSaveError?.(error as Error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [isAuthenticated]); // userDataService is a singleton (stable), onSaveError is optional callback

  const saveMeals = useCallback(async (mealsToSave: Meal[]) => {
    if (!isAuthenticated || isSavingRef.current) return;
    
    const serialized = JSON.stringify(mealsToSave);
    if (lastSavedRef.current === serialized) return;
    
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await userDataService.saveTodayMeals(mealsToSave);
      lastSavedRef.current = serialized;
      onSaveSuccess?.();
    } catch (error) {
      console.error('Failed to save meals:', error);
      lastSavedRef.current = null;
      onSaveError?.(error as Error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [isAuthenticated]); // userDataService is a singleton (stable), callbacks are optional

  const addFoodToMeal = useCallback((mealName: string, food: FoodItem) => {
    setMeals((currentMeals) => {
      const normalizedMealName = mealName.toLowerCase();
      const existingMeal = currentMeals.find(
        m => m.name.toLowerCase() === normalizedMealName
      );

      let updatedMeals: Meal[];
      if (existingMeal) {
        const updatedMeal: Meal = {
          ...existingMeal,
          foods: [...existingMeal.foods, food],
          totalCalories: (existingMeal.totalCalories || 0) + (food.calories || 0),
          totalProtein: (existingMeal.totalProtein || 0) + (food.protein || 0),
          totalCarbs: (existingMeal.totalCarbs || 0) + (food.carbs || 0),
          totalFat: (existingMeal.totalFat || 0) + (food.fat || 0),
        };
        updatedMeals = currentMeals.map(m => 
          m.id === existingMeal.id ? normalizeMealTotals(updatedMeal) : m
        );
      } else {
        const now = new Date();
        const newMeal: Meal = {
          id: Date.now().toString(),
          name: mealName,
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          foods: [food],
          totalCalories: food.calories || 0,
          totalProtein: food.protein || 0,
          totalCarbs: food.carbs || 0,
          totalFat: food.fat || 0,
        };
        updatedMeals = [...currentMeals, normalizeMealTotals(newMeal)];
      }

      // Auto-save after adding food
      if (isAuthenticated) {
        saveMeals(updatedMeals).catch(console.error);
      }

      return updatedMeals;
    });
  }, [isAuthenticated, saveMeals]);

  const removeFoodFromMeal = useCallback((mealId: string, foodId: string) => {
    setMeals((currentMeals) => {
      const updatedMeals = currentMeals.map((meal) => {
        if (meal.id === mealId) {
          const foodToRemove = meal.foods.find(f => f.id === foodId);
          if (foodToRemove) {
            const updatedMeal = {
              ...meal,
              foods: meal.foods.filter(f => f.id !== foodId),
              totalCalories: (meal.totalCalories || 0) - (foodToRemove.calories || 0),
              totalProtein: (meal.totalProtein || 0) - (foodToRemove.protein || 0),
              totalCarbs: (meal.totalCarbs || 0) - (foodToRemove.carbs || 0),
              totalFat: (meal.totalFat || 0) - (foodToRemove.fat || 0),
            };
            return normalizeMealTotals(updatedMeal);
          }
        }
        return meal;
      });

      // Auto-save after removing food
      if (isAuthenticated) {
        saveMeals(updatedMeals).catch(console.error);
      }

      return updatedMeals;
    });
  }, [isAuthenticated, saveMeals]);

  const calculateDailyTotals = useCallback((mealsList: Meal[]) => {
    return mealsList.reduce(
      (totals, meal) => ({
        calories: totals.calories + (meal.totalCalories || 0),
        protein: totals.protein + (meal.totalProtein || 0),
        carbs: totals.carbs + (meal.totalCarbs || 0),
        fat: totals.fat + (meal.totalFat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, []);

  return {
    meals,
    setMeals,
    isLoading,
    isSaving,
    loadMeals,
    saveMeals,
    addFoodToMeal,
    removeFoodFromMeal,
    calculateDailyTotals,
  };
}

