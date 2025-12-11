/**
 * Application-wide constants
 * Centralized configuration for better maintainability
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  TIMEOUT: {
    DEFAULT: 60000, // 60 seconds
    VISION: 180000, // 3 minutes for vision analysis
    CHAT: 120000, // 2 minutes for chat
  },
} as const;

// Meal Types
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
export type MealType = typeof MEAL_TYPES[number];

// Default Goals
export const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
} as const;

// Food Units
export const FOOD_UNITS = {
  WEIGHT: ['g', 'kg', 'oz', 'lb'],
  VOLUME: ['ml', 'l', 'cup', 'tbsp', 'tsp', 'fl oz'],
  PIECE: ['piece', 'slice', 'egg', 'apple', 'banana'],
  DRINK: ['can', 'bottle'],
} as const;

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  FOOD_SEARCH_MIN_LENGTH: 2,
  FOOD_SEARCH_DEBOUNCE_MS: 300,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'nutriai_token',
  USER_DATA: 'nutriai_user',
  PHOTO_ANALYZER_ITEMS: 'photoAnalyzerItems',
  PHOTO_ANALYSIS_FOR_CHAT: 'photoAnalysisForChat',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An unexpected server error occurred. Please try again later.',
  TIMEOUT: 'Request timed out. Please try again.',
} as const;

