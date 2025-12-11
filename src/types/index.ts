/**
 * Centralized type definitions for the application
 * This improves type safety and reduces code duplication
 */

// Food-related types
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
  foodId?: number; // Database food ID
}

export interface FoodData {
  food_id: string | number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  category: string;
  serving_size: string;
  serving_weight_grams: number;
  tags?: string[];
}

export interface FoodUnit {
  value: string;
  label: string;
  multiplier?: number;
  isWeight?: boolean;
}

// Meal-related types
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

export interface MealHistoryItem {
  date: string;
  mealsCount: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

// Goal-related types
export interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// User profile types
export interface UserProfile {
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'weight_loss' | 'weight_gain' | 'maintenance';
}

// Activity types
export interface Exercise {
  name: string;
  duration: number; // minutes
  caloriesBurned: number;
  type: 'cardio' | 'strength' | 'yoga' | 'other';
  notes: string;
  timestamp?: string;
}

export interface ActivityData {
  exercises: Exercise[];
  waterIntake: number; // ml
}

// Vision API types
export interface VisionItem {
  name: string;
  confidence: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface VisionResult {
  dish_name: string | null;
  items: VisionItem[];
  recipe: Record<string, unknown> | null;
  summary: string;
}

// Component prop types
export interface MealListProps {
  meals: Meal[];
  selectedMeal: string;
  onMealSelect: (mealName: string) => void;
  onFoodRemove: (mealId: string, foodId: string) => void;
  dailyGoal: DailyGoal;
  caloriesBurned: number;
}

export interface FoodInputProps {
  foodInput: string;
  onFoodInputChange: (value: string) => void;
  amount: number | '';
  onAmountChange: (value: number | '') => void;
  selectedUnit: string;
  onUnitChange: (unit: string) => void;
  selectedMeal: string;
  onMealSelect: (mealName: string) => void;
  onAddFood: () => void;
  suggestions: string[];
  showSuggestions: boolean;
  isLoading: boolean;
  onFoodSelect: (foodName: string) => void;
  availableUnits: FoodUnit[];
  isAuthenticated: boolean;
  onLoginRequired: () => void;
}

export interface GoalTrackerProps {
  dailyGoal: DailyGoal;
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  caloriesBurned: number;
  goalsLoaded: boolean;
  onEditGoals: () => void;
  smartSuggestions: string[];
}

export interface HistoryViewProps {
  history: MealHistoryItem[];
  selectedDate: string | null;
  selectedDateMeals: Meal[];
  isLoading: boolean;
  onDateSelect: (date: string) => void;
  onDateClear: () => void;
  onLoadHistory: () => void;
}

