/**
 * Food utility functions
 * Extracted from CalorieTracker for better code organization and reusability
 */
import { FoodData, FoodUnit } from '@/types';
import { apiClient } from './apiClient';

const drinkKeywords = [
  'juice', 'drink', 'beverage', 'soda', 'coffee', 'tea', 'milk', 'beer', 'wine', 'alcohol',
  'smoothie', 'shake', 'soup', 'broth', 'sauce', 'oil', 'vinegar', 'syrup', 'honey', 'water',
  'lemonade', 'iced tea', 'energy drink', 'sports drink', 'protein shake', 'yogurt drink',
  'fruit drink', 'vegetable juice', 'coconut water', 'almond milk', 'soy milk', 'oat milk',
  'rice milk', 'coconut milk', 'buttermilk', 'kefir', 'kombucha', 'seltzer', 'sparkling water',
  'tonic', 'ginger ale', 'root beer', 'cola', 'sprite', 'fanta', 'pepsi', 'coca-cola',
  'fruit juice', 'vegetable juice', 'tomato juice', 'carrot juice', 'celery juice',
  'green juice', 'detox juice', 'fresh juice', 'cold-pressed juice', 'bottled juice',
  'canned juice', 'boxed juice', 'concentrated juice', 'frozen juice', 'juice box',
  'juice pouch', 'fruit punch', 'fruit cocktail', 'fruit nectar', 'fruit drink mix',
  'powdered drink', 'drink mix', 'instant drink', 'ready-to-drink', 'rtd', 'beverage',
  'liquid', 'fluid', 'aqua', 'h2o', 'h₂o', 'aqua', 'beverage', 'refreshment', 'thirst quencher',
  'hydration', 'electrolyte drink', 'isotonic drink', 'hypotonic drink', 'hypertonic drink',
  'sports beverage', 'recovery drink', 'pre-workout drink', 'post-workout drink',
  'meal replacement shake', 'protein drink', 'weight gainer', 'mass gainer',
  'fruit', 'fruits'
];

const fruitKeywords = [
  'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'grape', 'grapes',
  'strawberry', 'strawberries', 'blueberry', 'blueberries', 'raspberry', 'raspberries',
  'blackberry', 'blackberries', 'cherry', 'cherries', 'peach', 'peaches', 'pear', 'pears',
  'plum', 'plums', 'apricot', 'apricots', 'mango', 'mangos', 'mangoes', 'pineapple', 'pineapples',
  'watermelon', 'watermelons', 'cantaloupe', 'honeydew', 'kiwi', 'kiwis', 'kiwifruit',
  'pomegranate', 'pomegranates', 'coconut', 'coconuts', 'avocado', 'avocados',
  'lemon', 'lemons', 'lime', 'limes', 'grapefruit', 'grapefruits', 'tangerine', 'tangerines',
  'clementine', 'clementines', 'mandarin', 'mandarins', 'nectarine', 'nectarines',
  'fig', 'figs', 'date', 'dates', 'persimmon', 'persimmons', 'papaya', 'papayas',
  'dragon fruit', 'dragonfruit', 'passion fruit', 'passionfruit', 'star fruit', 'starfruit',
  'lychee', 'lychees', 'rambutan', 'rambutans', 'durian', 'durians', 'jackfruit', 'jackfruits',
  'guava', 'guavas', 'cranberry', 'cranberries', 'elderberry', 'elderberries',
  'gooseberry', 'gooseberries', 'currant', 'currants', 'mulberry', 'mulberries',
  'boysenberry', 'boysenberries', 'loganberry', 'loganberries', 'huckleberry', 'huckleberries'
];

/**
 * Find food in database by name
 */
export async function findFoodInDatabase(foodName: string): Promise<FoodData | null> {
  try {
    const response = await apiClient.searchFoods<FoodData>(foodName, 1);
    if (response.success && response.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  } catch (error) {
    console.error('Error finding food in database:', error);
    return null;
  }
}

/**
 * Extract units from serving size string
 */
export function extractUnitsFromServingSize(servingSize: string, foodName?: string): FoodUnit[] {
  if (!servingSize) return [];
  
  const units: FoodUnit[] = [];
  const lowerServing = servingSize.toLowerCase();
  const lowerFoodName = (foodName || '').toLowerCase();
  
  // Check if this is a drink
  const isDrink = drinkKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerFoodName) || regex.test(lowerServing);
  });
  
  // Check if this is eggs
  const isEgg = /\begg(s)?\b/i.test(lowerFoodName) || /\begg(s)?\b/i.test(lowerServing);
  
  // Check if this is a fruit
  const isFruit = fruitKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerFoodName) || regex.test(lowerServing);
  });
  
  // Check if this is a piece-based food (burger, sandwich, etc.)
  const pieceBasedKeywords = ['burger', 'sandwich', 'wrap', 'pizza', 'slice', 'muffin', 'donut', 'bagel', 'roll', 'patty', 'nugget'];
  const isPieceBased = pieceBasedKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerFoodName) || regex.test(lowerServing);
  });
  
  // Check if serving size contains "piece"
  const hasPieceInServing = /\bpiece\b/i.test(lowerServing);
  
  // For eggs, always return piece unit
  if (isEgg) {
    return [{ value: 'piece', label: 'Egg', multiplier: 1, isWeight: false }];
  }
  
  // For fruits, always return piece unit
  if (isFruit) {
    return [{ value: 'piece', label: 'Piece', multiplier: 1, isWeight: false }];
  }
  
  // For piece-based foods or if serving size contains "piece", return piece unit
  if (isPieceBased || hasPieceInServing) {
    return [{ value: 'piece', label: 'Piece', multiplier: 1, isWeight: false }];
  }
  
  // For drinks, extract can/bottle units
  if (isDrink) {
    if (lowerServing.includes('can')) {
      units.push({ value: 'can', label: 'Can', multiplier: 330, isWeight: false });
    }
    if (lowerServing.includes('bottle')) {
      units.push({ value: 'bottle', label: 'Bottle', multiplier: 500, isWeight: false });
    }
    if (units.length === 0) {
      units.push({ value: 'ml', label: 'ml', multiplier: 1, isWeight: false });
    }
    return units;
  }
  
  // Extract weight units
  if (lowerServing.includes('g') || lowerServing.includes('gram')) {
    units.push({ value: 'g', label: 'g', multiplier: 1, isWeight: true });
  }
  if (lowerServing.includes('kg')) {
    units.push({ value: 'kg', label: 'kg', multiplier: 1000, isWeight: true });
  }
  if (lowerServing.includes('oz')) {
    units.push({ value: 'oz', label: 'oz', multiplier: 28.35, isWeight: true });
  }
  if (lowerServing.includes('lb') || lowerServing.includes('pound')) {
    units.push({ value: 'lb', label: 'lb', multiplier: 453.59, isWeight: true });
  }
  
  // Extract volume units
  if (lowerServing.includes('cup')) {
    units.push({ value: 'cup', label: 'cup', multiplier: 240, isWeight: false });
  }
  if (lowerServing.includes('tbsp') || lowerServing.includes('tablespoon')) {
    units.push({ value: 'tbsp', label: 'tbsp', multiplier: 15, isWeight: false });
  }
  if (lowerServing.includes('tsp') || lowerServing.includes('teaspoon')) {
    units.push({ value: 'tsp', label: 'tsp', multiplier: 5, isWeight: false });
  }
  
  // Default to grams if no units found
  if (units.length === 0) {
    units.push({ value: 'g', label: 'g', multiplier: 1, isWeight: true });
  }
  
  return units;
}

/**
 * Get filtered unit options based on food name
 */
export function getFilteredUnitOptions(foodName: string): FoodUnit[] {
  const lowerFoodName = foodName.toLowerCase();
  
  // Check for liquid keywords
  const isDrink = drinkKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerFoodName);
  });
  
  // Check if this is eggs
  const isEgg = /\begg(s)?\b/i.test(lowerFoodName);
  
  // Check if this is a fruit
  const isFruit = fruitKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerFoodName);
  });
  
  // Check if this is a piece-based food (burger, sandwich, etc.)
  const pieceBasedKeywords = ['burger', 'sandwich', 'wrap', 'pizza', 'slice', 'muffin', 'donut', 'bagel', 'roll', 'patty', 'nugget'];
  const isPieceBased = pieceBasedKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerFoodName);
  });
  
  if (isDrink) {
    return [
      { value: 'can', label: 'Can', multiplier: 330, isWeight: false },
      { value: 'bottle', label: 'Bottle', multiplier: 500, isWeight: false }
    ];
  } else if (isEgg) {
    return [
      { value: 'piece', label: 'Egg', multiplier: 1, isWeight: false }
    ];
  } else if (isFruit) {
    return [
      { value: 'piece', label: 'Piece', multiplier: 1, isWeight: false }
    ];
  } else if (isPieceBased) {
    return [
      { value: 'piece', label: 'Piece', multiplier: 1, isWeight: false }
    ];
  } else {
    return [
      { value: 'g', label: 'Gram', multiplier: 1, isWeight: true },
      { value: 'kg', label: 'Kilogram', multiplier: 1000, isWeight: true },
      { value: 'oz', label: 'Ounce', multiplier: 28.35, isWeight: true }
    ];
  }
}

