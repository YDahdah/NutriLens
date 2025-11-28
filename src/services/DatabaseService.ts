// Database Service for local MySQL integration - Now using shared API client
import { apiClient } from '../utils/apiClient';

export interface DatabaseFood {
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
}

export interface InternalFood {
  name: string;
  brand?: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  category: string;
  fdcId: number;
  description: string;
}

export class DatabaseService {
  private static instance: DatabaseService;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  constructor() {
    // No need for baseUrl since we use the shared API client
  }

  async searchFoods(query: string, limit: number = 10): Promise<DatabaseFood[]> {
    try {
      const response = await apiClient.get(`/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error searching foods:', error);
      return [];
    }
  }

  async getNutritionFacts(foodName: string): Promise<DatabaseFood | null> {
    try {
      const response = await apiClient.get(`/foods/nutrition/${encodeURIComponent(foodName)}`);
      return response.data || null;
    } catch (error) {
      console.error('Error getting nutrition facts:', error);
      return null;
    }
  }

  async getFoodsByCategory(category: string, limit: number = 20): Promise<DatabaseFood[]> {
    try {
      const response = await apiClient.get(`/foods/category/${encodeURIComponent(category)}?limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting foods by category:', error);
      return [];
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get('/foods/categories');
      return response.data || [];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async getRandomFoods(limit: number = 5): Promise<DatabaseFood[]> {
    try {
      const response = await this.makeRequest(`/random?limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Error getting random foods:', error);
      return [];
    }
  }

  convertToInternalFormat(dbFood: DatabaseFood): InternalFood {
    return {
      name: dbFood.name,
      brand: dbFood.brand,
      serving: dbFood.serving_size,
      calories: dbFood.calories,
      protein: dbFood.protein,
      carbs: dbFood.carbs,
      fat: dbFood.fat,
      fiber: dbFood.fiber,
      sugar: dbFood.sugar,
      sodium: dbFood.sodium,
      category: dbFood.category,
      fdcId: dbFood.food_id,
      description: dbFood.description || dbFood.name
    };
  }

  // Check if the database service is available
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3001/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export default DatabaseService;
