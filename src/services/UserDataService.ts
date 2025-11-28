import { apiClient } from '@/utils/apiClient';

export interface UserProfile {
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: string;
  activityLevel: string;
  goal: string;
}

export interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  foods: any[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

class UserDataService {
  private static instance: UserDataService;

  private constructor() {}

  static getInstance(): UserDataService {
    if (!UserDataService.instance) {
      UserDataService.instance = new UserDataService();
    }
    return UserDataService.instance;
  }

  // Get user profile
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const response = await apiClient.get('/user-data/profile');
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  // Save user profile
  async saveUserProfile(profile: UserProfile): Promise<boolean> {
    try {
      const response = await apiClient.put('/user-data/profile', profile);
      return response.success;
    } catch (error) {
      console.error('Failed to save user profile:', error);
      return false;
    }
  }

  // Get today's goals
  async getTodayGoals(): Promise<DailyGoal> {
    try {
      const response = await apiClient.get('/user-data/goals/today');
      return response.success ? response.data : {
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65
      };
    } catch (error) {
      console.error('Failed to get goals:', error);
      return {
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65
      };
    }
  }

  // Save today's goals
  async saveTodayGoals(goals: DailyGoal): Promise<boolean> {
    try {
      const response = await apiClient.put('/user-data/goals/today', goals);
      return response.success;
    } catch (error) {
      console.error('Failed to save goals:', error);
      return false;
    }
  }

  // Get today's meals
  async getTodayMeals(): Promise<Meal[]> {
    try {
      const response = await apiClient.get('/user-data/meals/today');
      return response.success ? response.data : [];
    } catch (error) {
      console.error('Failed to get meals:', error);
      return [];
    }
  }

  // Save today's meals
  async saveTodayMeals(meals: Meal[]): Promise<boolean> {
    try {
      const response = await apiClient.post('/user-data/meals/today', { meals });
      return response.success;
    } catch (error) {
      console.error('Failed to save meals:', error);
      return false;
    }
  }

  // Get meals for a specific date
  async getMealsByDate(date: string): Promise<Meal[]> {
    try {
      const response = await apiClient.get(`/user-data/meals/by-date?date=${date}`);
      return response.success ? response.data?.meals || [] : [];
    } catch (error) {
      console.error('Failed to get meals by date:', error);
      return [];
    }
  }

  // Get meal history (all dates with meals)
  async getMealHistory(limit?: number): Promise<MealHistoryItem[]> {
    try {
      const url = limit ? `/user-data/meals/history?limit=${limit}` : '/user-data/meals/history';
      const response = await apiClient.get(url);
      return response.success ? response.data?.history || [] : [];
    } catch (error) {
      console.error('Failed to get meal history:', error);
      return [];
    }
  }

  // Delete meals for a specific date
  async deleteDayMeals(date: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/user-data/meals/delete?date=${date}`);
      return response.success;
    } catch (error) {
      console.error('Failed to delete day meals:', error);
      return false;
    }
  }

  // Get weekly report
  async getWeeklyReport(): Promise<WeeklyReport | null> {
    try {
      const response = await apiClient.get('/user-data/reports/weekly');
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to get weekly report:', error);
      return null;
    }
  }

  // Get monthly report
  async getMonthlyReport(): Promise<MonthlyReport | null> {
    try {
      const response = await apiClient.get('/user-data/reports/monthly');
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to get monthly report:', error);
      return null;
    }
  }

  // Get yearly report
  async getYearlyReport(): Promise<YearlyReport | null> {
    try {
      const response = await apiClient.get('/user-data/reports/yearly');
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to get yearly report:', error);
      return null;
    }
  }

  // Upload profile photo
  async uploadProfilePhoto(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const response = await apiClient.upload('/user-data/profile/photo', formData);
      return response.success ? response.data?.photoUrl : null;
    } catch (error) {
      console.error('Failed to upload profile photo:', error);
      return null;
    }
  }

  // Get profile photo
  async getProfilePhoto(): Promise<string | null> {
    try {
      const response = await apiClient.get('/user-data/profile/photo');
      return response.success ? response.data?.photoUrl : null;
    } catch (error) {
      console.error('Failed to get profile photo:', error);
      return null;
    }
  }

  // Delete profile photo
  async deleteProfilePhoto(): Promise<boolean> {
    try {
      const response = await apiClient.delete('/user-data/profile/photo');
      if (response.success) {
        return true;
      }
      // Fallback to POST remove endpoint if DELETE is not supported
      const fallbackResponse = await apiClient.post('/user-data/profile/photo/remove');
      return !!fallbackResponse.success;
    } catch (error) {
      try {
        const fallbackResponse = await apiClient.post('/user-data/profile/photo/remove');
        return !!fallbackResponse.success;
      } catch (fallbackError) {
        console.error('Failed to delete profile photo:', fallbackError);
      }
      console.error('Failed to delete profile photo:', error);
      return false;
    }
  }
}

export interface DailyDataPoint {
  date: string;
  day: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealsCount: number;
  exercisesCount?: number;
  caloriesBurned?: number;
  exerciseDuration?: number;
  waterIntake?: number;
}

export interface WeeklyReport {
  period: 'weekly';
  startDate: string;
  endDate: string;
  dailyData: DailyDataPoint[];
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    caloriesBurned?: number;
    exerciseDuration?: number;
    waterIntake?: number;
  };
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    caloriesBurned?: number;
    exerciseDuration?: number;
    waterIntake?: number;
  };
  daysTracked: number;
}

export interface WeeklyDataPoint {
  week: number;
  startDate: string;
  endDate: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealsCount: number;
  daysTracked: number;
  caloriesBurned?: number;
  exerciseDuration?: number;
  waterIntake?: number;
}

export interface MonthlyReport {
  period: 'monthly';
  startDate: string;
  endDate: string;
  weeklyData: WeeklyDataPoint[];
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    caloriesBurned?: number;
    exerciseDuration?: number;
    waterIntake?: number;
  };
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    caloriesBurned?: number;
    exerciseDuration?: number;
    waterIntake?: number;
  };
  daysTracked: number;
}

export interface MonthlyDataPoint {
  month: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealsCount: number;
  daysTracked: number;
  caloriesBurned?: number;
  exerciseDuration?: number;
  waterIntake?: number;
}

export interface YearlyReport {
  period: 'yearly';
  startDate: string;
  endDate: string;
  monthlyData: MonthlyDataPoint[];
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    caloriesBurned?: number;
    exerciseDuration?: number;
    waterIntake?: number;
  };
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    caloriesBurned?: number;
    exerciseDuration?: number;
    waterIntake?: number;
  };
  daysTracked: number;
}

export interface MealHistoryItem {
  date: string;
  mealsCount: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  created_at?: string;
  updated_at?: string;
}

export default UserDataService;

