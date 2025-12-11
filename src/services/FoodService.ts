// Food Database Service - Now using shared API client
import { apiClient } from '../utils/apiClient';
import { Cache } from '../utils/cache';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const cache = Cache.getInstance();

export interface FoodItem {
  food_id: number;
  name: string;
  category: string;
  brand?: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  serving_size: string;
  serving_weight_grams: number;
  image_url?: string;
  barcode?: string;
  allergens?: string;
  tags?: string;
}

export interface SearchFilters {
  category?: string;
  maxCalories?: number;
  minProtein?: number;
  maxCarbs?: number;
  maxFat?: number;
  allergens?: string[];
  dietaryRestrictions?: string[];
}

export class FoodService {
  private static instance: FoodService;

  static getInstance(): FoodService {
    if (!FoodService.instance) {
      FoodService.instance = new FoodService();
    }
    return FoodService.instance;
  }

  constructor() {
    // No need for baseUrl since we use the shared API client
  }

  // Search foods by name or category with AbortSignal support and caching
  async searchFoods(query: string, filters?: SearchFilters & { limit?: number }, signal?: AbortSignal): Promise<FoodItem[]> {
    try {
      // Generate cache key
      const cacheKey = `food_search:${query}:${JSON.stringify(filters || {})}`;
      
      // Try cache first (only for non-aborted requests)
      if (!signal?.aborted) {
        const cached = cache.get<FoodItem[]>(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }

      const params = new URLSearchParams();
      params.append('q', query);
      params.append('limit', (filters?.limit || 10).toString());
      
      if (filters?.category) params.append('category', filters.category);
      if (filters?.maxCalories) params.append('maxCalories', filters.maxCalories.toString());
      if (filters?.minProtein) params.append('minProtein', filters.minProtein.toString());
      if (filters?.maxCarbs) params.append('maxCarbs', filters.maxCarbs.toString());
      if (filters?.maxFat) params.append('maxFat', filters.maxFat.toString());

      const url = `/foods/search?${params.toString()}`;
      
      const response = await apiClient.get(url, { retry: true });
      const foods = response.data || [];
      
      // Cache results for 5 minutes
      if (!signal?.aborted && foods.length > 0) {
        cache.set(cacheKey, foods, 300000);
      }
      
      return foods;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      
      const appError = AppError.fromError(error);
      logger.error('Error searching foods:', appError);
      
      // Return cached results if available, even on error
      const cacheKey = `food_search:${query}:${JSON.stringify(filters || {})}`;
      const cached = cache.get<FoodItem[]>(cacheKey);
      if (cached !== null) {
        logger.debug('Returning cached results due to error');
        return cached;
      }
      
      return [];
    }
  }

  // Get food by ID
  async getFoodById(id: string): Promise<FoodItem | undefined> {
    try {
      const response = await apiClient.get(`/foods/${id}`);
      return response.data || undefined;
    } catch (error) {
      console.error('Error getting food by ID:', error);
      return undefined;
    }
  }

  // Get nutrition facts for a specific food by name
  async getNutritionFacts(foodName: string): Promise<FoodItem | undefined> {
    try {
      // Search for the food by name and return the first result
      const foods = await this.searchFoods(foodName, { limit: 1 });
      return foods.length > 0 ? foods[0] : undefined;
    } catch (error) {
      console.error('Error getting nutrition facts:', error);
      return undefined;
    }
  }

  // Get foods by category
  async getFoodsByCategory(category: string, limit: number = 20): Promise<FoodItem[]> {
    try {
      const response = await apiClient.get(`/foods/category/${encodeURIComponent(category)}?limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting foods by category:', error);
      return [];
    }
  }

  // Get all categories
  async getCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get('/foods/categories');
      return response.data || [];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  // Get random foods for suggestions
  async getRandomFoods(limit: number = 5): Promise<FoodItem[]> {
    try {
      const response = await apiClient.get(`/foods/random?limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting random foods:', error);
      return [];
    }
  }

  // Get popular foods (high protein, low calorie)
  async getPopularFoods(limit: number = 10): Promise<FoodItem[]> {
    try {
      const response = await apiClient.get(`/foods/search?q=&limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting popular foods:', error);
      return [];
    }
  }

  // Get healthy foods (low calorie, high fiber)
  async getHealthyFoods(limit: number = 10): Promise<FoodItem[]> {
    try {
      const response = await apiClient.get(`/foods/search?q=healthy&limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting healthy foods:', error);
      return [];
    }
  }

  // Get low calorie foods
  async getLowCalorieFoods(limit: number = 10): Promise<FoodItem[]> {
    try {
      const response = await apiClient.get(`/foods/search?q=low-calorie&limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting low calorie foods:', error);
      return [];
    }
  }

  // Get high protein foods
  async getHighProteinFoods(limit: number = 10): Promise<FoodItem[]> {
    try {
      const response = await apiClient.get(`/foods/search?q=high-protein&limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting high protein foods:', error);
      return [];
    }
  }

  // Get all tags
  async getTags(): Promise<string[]> {
    try {
      // Get a sample of foods and extract tags
      const foods = await this.getRandomFoods(50);
    const tags = new Set<string>();
      foods.forEach(food => {
        if (food.tags) {
          food.tags.split(', ').forEach(tag => tags.add(tag.trim()));
        }
    });
    return Array.from(tags).sort();
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  }

  // Calculate nutrition for multiple foods
  calculateNutrition(foods: { food: FoodItem; quantity: number }[]): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  } {
    return foods.reduce((total, { food, quantity }) => ({
      calories: total.calories + (food.calories * quantity / 100),
      protein: total.protein + (food.protein * quantity / 100),
      carbs: total.carbs + (food.carbs * quantity / 100),
      fat: total.fat + (food.fat * quantity / 100),
      fiber: total.fiber + (food.fiber * quantity / 100),
      sugar: total.sugar + (food.sugar * quantity / 100),
      sodium: total.sodium + (food.sodium * quantity / 100)
    }), {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });
  }

  // Generate meal suggestions based on preferences
  async generateMealSuggestions(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', preferences?: {
    maxCalories?: number;
    dietaryRestrictions?: string[];
    allergens?: string[];
  }): Promise<FoodItem[]> {
    try {
    let suggestions: FoodItem[] = [];

    switch (mealType) {
      case 'breakfast':
          suggestions = await this.searchFoods('', {
          category: 'grain',
          maxCalories: preferences?.maxCalories || 400
          });
        break;
      case 'lunch':
          suggestions = await this.searchFoods('', {
          category: 'protein',
          maxCalories: preferences?.maxCalories || 500
          });
        break;
      case 'dinner':
          suggestions = await this.searchFoods('', {
          category: 'protein',
          maxCalories: preferences?.maxCalories || 600
          });
        break;
      case 'snack':
          suggestions = await this.searchFoods('', {
          category: 'nuts',
          maxCalories: preferences?.maxCalories || 200
          });
        break;
    }

    return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Error generating meal suggestions:', error);
      return [];
    }
  }

  // Check if the food service is available
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3001/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Convert API food format to internal format for CalorieTracker
  convertToInternalFormat(apiFood: FoodItem): any {
    return {
      id: apiFood.food_id.toString(),
      name: apiFood.name,
      brand: apiFood.brand,
      serving: apiFood.serving_size,
      calories: apiFood.calories,
      protein: apiFood.protein,
      carbs: apiFood.carbs,
      fat: apiFood.fat,
      fiber: apiFood.fiber,
      sugar: apiFood.sugar,
      sodium: apiFood.sodium,
      category: apiFood.category,
      food_id: apiFood.food_id, // Use food_id for database operations
      fdcId: apiFood.food_id, // Keep fdcId for backward compatibility
      description: apiFood.description || apiFood.name,
      imageUrl: apiFood.image_url,
      barcode: apiFood.barcode,
      allergens: apiFood.allergens ? apiFood.allergens.split(',') : [],
      tags: apiFood.tags ? apiFood.tags.split(', ') : []
    };
  }
}

export default FoodService;
