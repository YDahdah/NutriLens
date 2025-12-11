/**
 * Zustand store for managing meals state
 * This simplifies state management and reduces prop drilling
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  serving: string;
  category: string;
  amount: number;
  unit: string;
  foodId?: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface MealsState {
  meals: Meal[];
  setMeals: (meals: Meal[]) => void;
  addFoodToMeal: (mealName: string, food: FoodItem) => void;
  removeFoodFromMeal: (mealId: string, foodId: string) => void;
  clearMeals: () => void;
}

export const useMealsStore = create<MealsState>()(
  devtools(
    (set) => ({
      meals: [],
      setMeals: (meals) => set({ meals }, false, 'setMeals'),
      addFoodToMeal: (mealName, food) =>
        set(
          (state) => {
            const normalizedMealName = mealName.toLowerCase();
            const existingMeal = state.meals.find(
              (m) => m.name.toLowerCase() === normalizedMealName
            );

            if (existingMeal) {
              return {
                meals: state.meals.map((meal) =>
                  meal.id === existingMeal.id
                    ? {
                        ...meal,
                        foods: [...meal.foods, food],
                        totalCalories: meal.totalCalories + food.calories,
                        totalProtein: meal.totalProtein + food.protein,
                        totalCarbs: meal.totalCarbs + food.carbs,
                        totalFat: meal.totalFat + food.fat,
                      }
                    : meal
                ),
              };
            } else {
              const now = new Date();
              const newMeal: Meal = {
                id: Date.now().toString(),
                name: mealName,
                time: now.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                foods: [food],
                totalCalories: food.calories,
                totalProtein: food.protein,
                totalCarbs: food.carbs,
                totalFat: food.fat,
              };
              return { meals: [...state.meals, newMeal] };
            }
          },
          false,
          'addFoodToMeal'
        ),
      removeFoodFromMeal: (mealId, foodId) =>
        set(
          (state) => ({
            meals: state.meals.map((meal) => {
              if (meal.id === mealId) {
                const foodToRemove = meal.foods.find((f) => f.id === foodId);
                if (foodToRemove) {
                  return {
                    ...meal,
                    foods: meal.foods.filter((f) => f.id !== foodId),
                    totalCalories: meal.totalCalories - foodToRemove.calories,
                    totalProtein: meal.totalProtein - foodToRemove.protein,
                    totalCarbs: meal.totalCarbs - foodToRemove.carbs,
                    totalFat: meal.totalFat - foodToRemove.fat,
                  };
                }
              }
              return meal;
            }),
          }),
          false,
          'removeFoodFromMeal'
        ),
      clearMeals: () => set({ meals: [] }, false, 'clearMeals'),
    }),
    { name: 'MealsStore' }
  )
);

