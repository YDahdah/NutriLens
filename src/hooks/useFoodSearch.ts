/**
 * Custom hook for food search functionality
 * Extracts food search logic from CalorieTracker
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { FoodData, FoodUnit } from '@/types';
import FoodService from '@/services/FoodService';
import { apiClient } from '@/utils/apiClient';
import { findFoodInDatabase, extractUnitsFromServingSize, getFilteredUnitOptions } from '@/utils/foodUtils';

interface UseFoodSearchOptions {
  onFoodSelect?: (food: FoodData) => void;
}

export function useFoodSearch({ onFoodSelect }: UseFoodSearchOptions = {}) {
  const [foodInput, setFoodInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedFoodData, setSelectedFoodData] = useState<FoodData | null>(null);
  const [availableUnits, setAvailableUnits] = useState<FoodUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<Map<string, string[]>>(new Map());
  const foodService = FoodService.getInstance();

  // extractUnits now imported from foodUtils

  const getFoodSuggestions = useCallback(async (input: string, signal?: AbortSignal): Promise<string[]> => {
    if (input.length < 2) return [];
    
    const normalizedInput = input.toLowerCase().trim();
    
    // Check cache
    if (searchCacheRef.current.has(normalizedInput)) {
      return searchCacheRef.current.get(normalizedInput)!;
    }
    
    try {
      const foods = await foodService.searchFoods(normalizedInput, { limit: 10 }, signal);
      
      if (!foods || !Array.isArray(foods)) {
        return [];
      }
      
      // Clean food names: remove long descriptions, keep only the main name
      let foodNames = foods.map(food => {
        let name = food.name;
        
        // Remove markdown formatting
        name = name.replace(/\*\*/g, '').replace(/#{1,6}\s+/g, '');
        
        // Remove content after newlines or colons that might indicate detailed descriptions
        const firstLine = name.split('\n')[0].trim();
        const beforeColon = firstLine.split(':')[0].trim();
        name = beforeColon.length > 0 && beforeColon.length < firstLine.length ? beforeColon : firstLine;
        
        // Extract only first 2-3 words for simplicity
        const words = name.split(/\s+/).filter(w => w.length > 0);
        const limitedWords = words.slice(0, 3);
        
        // Join words and capitalize first letter of each word for consistency
        const cleaned = limitedWords.map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        // Only return if the cleaned name is reasonable length (max 50 chars)
        return cleaned.length <= 50 ? cleaned : limitedWords[0].charAt(0).toUpperCase() + limitedWords[0].slice(1).toLowerCase();
      });
      
      // Remove duplicates after cleaning
      foodNames = [...new Set(foodNames)];
      
      // Filter out generic "Egg" when specific egg preparations are available
      if (normalizedInput === 'egg' || normalizedInput === 'eggs') {
        const hasSpecificEggPreparations = foodNames.some(name => {
          const lowerName = name.toLowerCase();
          return (lowerName.includes('egg') && lowerName !== 'egg' && 
                  (lowerName.includes('boiled') || lowerName.includes('fried') || 
                   lowerName.includes('scrambled') || lowerName.includes('poached') ||
                   lowerName.includes('hard') || lowerName.includes('soft') ||
                   lowerName.includes('omelet') || lowerName.includes('omelette')));
        });
        
        if (hasSpecificEggPreparations) {
          foodNames = foodNames.filter(name => name.toLowerCase() !== 'egg');
        }
      }
      
      // Prioritize exact fruit matches over drinks
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
      
      const drinkKeywordsForSorting = [
        'juice', 'drink', 'beverage', 'soda', 'coffee', 'tea', 'milk', 'beer', 'wine', 'alcohol',
        'smoothie', 'shake', 'soup', 'broth', 'sauce', 'oil', 'vinegar', 'syrup', 'honey'
      ];
      
      const isFruitSearch = fruitKeywords.some(keyword => {
        const regex = new RegExp(`^${keyword}$`, 'i');
        return regex.test(normalizedInput);
      });
      
      if (isFruitSearch) {
        // Filter and sort: exact fruit matches first, exclude drinks containing the fruit name
        const exactFruitMatches: string[] = [];
        const otherNonDrinkMatches: string[] = [];
        const drinkMatches: string[] = [];
        
        foodNames.forEach(name => {
          const lowerName = name.toLowerCase();
          const isExactFruit = fruitKeywords.some(keyword => {
            const regex = new RegExp(`^${keyword}$`, 'i');
            return regex.test(lowerName);
          });
          const isDrink = drinkKeywordsForSorting.some(keyword => lowerName.includes(keyword));
          
          if (isExactFruit) {
            exactFruitMatches.push(name);
          } else if (isDrink) {
            drinkMatches.push(name);
          } else {
            otherNonDrinkMatches.push(name);
          }
        });
        
        // Combine: exact fruits first, then other non-drinks, then drinks last
        const sorted = [...exactFruitMatches, ...otherNonDrinkMatches, ...drinkMatches];
        
        // Cache the sorted results
        searchCacheRef.current.set(normalizedInput, sorted);
        // Limit cache size
        if (searchCacheRef.current.size > 50) {
          const firstKey = searchCacheRef.current.keys().next().value;
          searchCacheRef.current.delete(firstKey);
        }
        
        return sorted;
      }
      
      // Cache the results
      searchCacheRef.current.set(normalizedInput, foodNames);
      // Limit cache size
      if (searchCacheRef.current.size > 50) {
        const firstKey = searchCacheRef.current.keys().next().value;
        searchCacheRef.current.delete(firstKey);
      }
      
      return foodNames;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching food suggestions:', error);
      }
      return [];
    }
  }, []);

  const handleFoodInputChange = useCallback((value: string) => {
    setFoodInput(value);
    setShowSuggestions(false);
    setSelectedFoodData(null);
    setAvailableUnits([]);
    
    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.length >= 2) {
      setIsLoading(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await getFoodSuggestions(value, controller.signal);
          if (!controller.signal.aborted) {
            setSuggestions(results);
            setShowSuggestions(true);
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Error in food search:', error);
          }
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [getFoodSuggestions]);

  const handleFoodSelection = useCallback(async (foodName: string) => {
    setFoodInput(foodName);
    setShowSuggestions(false);
    setIsLoading(true);
    
    try {
      const foodData = await findFoodInDatabase(foodName);
      
      if (foodData) {
        setSelectedFoodData(foodData);
        
        // Extract available units from serving size
        const units = extractUnitsFromServingSize(foodData.serving_size || '100g', foodData.name);
        setAvailableUnits(units);
        
        onFoodSelect?.(foodData);
      } else {
        // Fallback to general unit options if food not found
        const filteredOptions = getFilteredUnitOptions(foodName);
        setAvailableUnits(filteredOptions);
      }
    } catch (error) {
      console.error('Error fetching food data:', error);
      // Fallback to general unit options
      const filteredOptions = getFilteredUnitOptions(foodName);
      setAvailableUnits(filteredOptions);
    } finally {
      setIsLoading(false);
    }
  }, [onFoodSelect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    foodInput,
    suggestions,
    selectedFoodData,
    availableUnits,
    isLoading,
    showSuggestions,
    setFoodInput,
    setShowSuggestions,
    handleFoodInputChange,
    handleFoodSelection,
  };
}

