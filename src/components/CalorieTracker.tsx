import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Plus, 
  Edit, 
  Target, 
  TrendingUp, 
  PieChart,
  Clock,
  CheckCircle,
  AlertCircle,
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Trash2,
  Flame,
  Activity
} from 'lucide-react';
import FoodService from '@/services/FoodService';
import UserDataService, { MealHistoryItem } from '@/services/UserDataService';
import { apiClient } from '@/utils/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

interface FoodItem {
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

interface Meal {
  id: string;
  name: string;
  time: string;
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const CalorieTracker = () => {
  const { isAuthenticated } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [history, setHistory] = useState<MealHistoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateMeals, setSelectedDateMeals] = useState<Meal[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65
  });
  const [goalsLoaded, setGoalsLoaded] = useState(false); // Track if goals were loaded from database
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [userProfile, setUserProfile] = useState({
    age: 0,
    weight: 0, // kg
    height: 0, // cm
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintenance'
  });
  const [foodInput, setFoodInput] = useState('');
  const [selectedMeal, setSelectedMeal] = useState('breakfast');
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [logMessage, setLogMessage] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [amount, setAmount] = useState<number | ''>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchCache, setSearchCache] = useState<Map<string, string[]>>(new Map());
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [selectedFoodData, setSelectedFoodData] = useState<any>(null);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const selectedMealRef = useRef(selectedMeal);
  const [caloriesBurned, setCaloriesBurned] = useState<number>(0); // Calories burned from exercises
  
  // Initialize FoodService
  const foodService = FoodService.getInstance();
  
  // Keep ref in sync with selectedMeal
  useEffect(() => {
    selectedMealRef.current = selectedMeal;
  }, [selectedMeal]);

  // Convert units to grams using standard conversions
  const convertUnitToGrams = (amount: number, unit: string): number => {
    const lowerUnit = unit.toLowerCase();
    
    // Volume conversions (approximate)
    if (lowerUnit.includes('cup')) {
      return amount * 240; // 1 cup = 240ml ≈ 240g for most foods
    } else if (lowerUnit.includes('tbsp') || lowerUnit.includes('tablespoon')) {
      return amount * 15; // 1 tbsp = 15ml ≈ 15g
    } else if (lowerUnit.includes('tsp') || lowerUnit.includes('teaspoon')) {
      return amount * 5; // 1 tsp = 5ml ≈ 5g
    } else if (lowerUnit.includes('oz')) {
      return amount * 28.35; // 1 oz = 28.35g
    } else if (lowerUnit.includes('lb') || lowerUnit.includes('pound')) {
      return amount * 453.59; // 1 lb = 453.59g
    } else if (lowerUnit.includes('kg')) {
      return amount * 1000; // 1 kg = 1000g
    } else if (lowerUnit.includes('ml')) {
      // For liquids, ml ≈ grams (1ml water = 1g)
      return amount; // Keep as ml for liquids
    } else if (lowerUnit.includes('can')) {
      // Standard can sizes - convert to appropriate units
      const lowerFoodName = foodInput.toLowerCase();
      const isDrinkItem = drinkKeywords.some(keyword => lowerFoodName.includes(keyword));
      
      if (isDrinkItem) {
        // For drinks, assume standard can size (330ml)
        return amount * 330; // Standard can size in ml
      } else {
        // For solid foods in cans, assume standard can size (150g)
        return amount * 150; // Standard can size in grams
      }
    } else if (lowerUnit.includes('bottle')) {
      // Standard bottle sizes - convert to appropriate units
      const lowerFoodName = foodInput.toLowerCase();
      const isDrinkItem = drinkKeywords.some(keyword => lowerFoodName.includes(keyword));
      
      if (isDrinkItem) {
        // For drinks, assume standard bottle size (500ml)
        return amount * 500; // Standard bottle size in ml
      } else {
        // For solid foods in bottles, assume standard bottle size (200g)
        return amount * 200; // Standard bottle size in grams
      }
    } else if (lowerUnit.includes('piece') || lowerUnit.includes('slice') || lowerUnit.includes('egg') || lowerUnit.includes('apple') || lowerUnit.includes('banana') || 
               lowerUnit.includes('cookie') || lowerUnit.includes('cracker') || lowerUnit.includes('muffin') || lowerUnit.includes('donut') || lowerUnit.includes('bagel') || 
               lowerUnit.includes('roll') || lowerUnit.includes('meatball') || lowerUnit.includes('nugget') || lowerUnit.includes('patty') || lowerUnit.includes('sausage') || 
               lowerUnit.includes('hot dog') || lowerUnit.includes('burger') || lowerUnit.includes('pancake') || lowerUnit.includes('waffle') || lowerUnit.includes('toast') || 
               lowerUnit.includes('biscuit') || lowerUnit.includes('croissant') || lowerUnit.includes('pretzel')) {
      // For piece-based units, return as is (will be handled by serving weight)
      return amount;
    }
    
    // Default to grams
    return amount;
  };

  // Extract available units from database serving_size field
  const extractUnitsFromServingSize = (servingSize: string, foodName?: string): any[] => {
    if (!servingSize) return [];
    
    const units: any[] = [];
    const lowerServing = servingSize.toLowerCase();
    const lowerFoodName = (foodName || '').toLowerCase();
    
    // Check if this is a drink that should be measured in cans or bottles
    const drinkKeywords = [
      'water', 'juice', 'soda', 'coffee', 'tea', 'milk', 'beer', 'wine', 'alcohol', 'drink', 'beverage',
      'smoothie', 'shake', 'soup', 'broth', 'sauce', 'oil', 'vinegar', 'syrup', 'honey', 'yogurt drink',
      'energy drink', 'sports drink', 'coconut water', 'almond milk', 'soy milk', 'coconut milk',
      'orange juice', 'apple juice', 'cranberry juice', 'grape juice', 'lemonade', 'iced tea',
      'hot chocolate', 'cocoa', 'espresso', 'latte', 'cappuccino', 'americano', 'frappuccino',
      'coke', 'pepsi', 'sprite', 'fanta', 'ginger ale', 'root beer', 'iced coffee', 'cold brew',
      'chai', 'matcha', 'green tea', 'black tea', 'herbal tea', 'chamomile', 'peppermint',
      'protein shake', 'meal replacement', 'kombucha', 'kefir', 'buttermilk', 'heavy cream',
      'half and half', 'whipping cream', 'coconut cream', 'oat milk', 'rice milk', 'hemp milk',
      'bone broth', 'vegetable broth', 'chicken broth', 'beef broth', 'tomato soup', 'cream soup',
      'olive oil', 'coconut oil', 'vegetable oil', 'sesame oil', 'balsamic vinegar', 'apple cider vinegar',
      'maple syrup', 'agave', 'simple syrup', 'chocolate syrup', 'caramel sauce', 'hot sauce',
      // Beer and wine specific terms
      'beer', 'beers', 'ale', 'ales', 'lager', 'lagers', 'stout', 'stouts', 'pilsner', 'pilsners',
      'ipa', 'ipas', 'wheat beer', 'wheat beers', 'porter', 'porters', 'sour beer', 'sour beers',
      'almaza', 'almaza beer', 'lebanese beer', 'middle eastern beer',
      'wine', 'wines', 'red wine', 'red wines', 'white wine', 'white wines', 'rosé', 'rose',
      'champagne', 'champagnes', 'sparkling wine', 'sparkling wines', 'prosecco', 'proseccos',
      'sherry', 'sherries', 'port', 'ports', 'whiskey', 'whiskeys', 'whisky', 'whiskies',
      'vodka', 'vodkas', 'rum', 'rums', 'gin', 'gins', 'tequila', 'tequilas', 'brandy', 'brandies',
      'cocktail', 'cocktails', 'mixed drink', 'mixed drinks', 'shot', 'shots', 'liquor', 'liquors'
    ];
    
    // Check if this is eggs FIRST - should be measured per piece (priority over drink detection)
    const isEgg = /\begg(s)?\b/i.test(lowerFoodName) || /\begg(s)?\b/i.test(lowerServing);
    
    if (isEgg) {
      // For eggs, show piece-based units
      const eggUnitPatterns = [
        { pattern: /(\d+(?:\.\d+)?)\s*egg(?:s)?/g, unit: 'piece', label: 'Egg', multiplier: 1, isWeight: false },
        { pattern: /(\d+(?:\.\d+)?)\s*piece(?:s)?/g, unit: 'piece', label: 'Piece', multiplier: 1, isWeight: false }
      ];
      
      eggUnitPatterns.forEach(({ pattern, unit, label, multiplier, isWeight }) => {
        const matches = [...lowerServing.matchAll(pattern)];
        matches.forEach(match => {
          const amount = parseFloat(match[1]);
          if (amount > 0) {
            units.push({
              value: unit,
              label: label,
              amount: amount,
              multiplier: multiplier,
              isWeight: isWeight,
              description: `${amount} ${label}${amount !== 1 ? 's' : ''}`
            });
          }
        });
      });
      
      // If no piece units found, add default piece unit for eggs
      if (units.length === 0) {
        units.push({
          value: 'piece',
          label: 'Egg',
          amount: 1,
          multiplier: 1,
          isWeight: false,
          description: '1 egg'
        });
      }
      
      return units;
    }
    
    const isDrink = drinkKeywords.some(keyword => 
      lowerFoodName.includes(keyword) || lowerServing.includes(keyword)
    );
    
    // Check if this is a whole item that should be measured in pieces
    const wholeItemKeywords = [
      'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges',
      'bread', 'slice', 'slices', 'sandwich', 'sandwiches', 'pizza', 'pizzas',
      'cookie', 'cookies', 'cracker', 'crackers', 'muffin', 'muffins',
      'donut', 'donuts', 'bagel', 'bagels', 'roll', 'rolls',
      'meatball', 'meatballs', 'nugget', 'nuggets', 'patty', 'patties',
      'sausage', 'sausages', 'hot dog', 'hot dogs', 'burger', 'burgers',
      'pancake', 'pancakes', 'waffle', 'waffles', 'toast', 'toasts',
      'biscuit', 'biscuits', 'croissant', 'croissants', 'pretzel', 'pretzels'
    ];
    
    const isWholeItem = wholeItemKeywords.some(keyword => 
      lowerFoodName.includes(keyword) || lowerServing.includes(keyword)
    );
    
    // For drinks, ONLY extract can and bottle units
    if (isDrink) {
      const drinkUnitPatterns = [
        { pattern: /(\d+(?:\.\d+)?)\s*can(?:s)?/g, unit: 'can', label: 'Can', multiplier: 330, isWeight: false },
        { pattern: /(\d+(?:\.\d+)?)\s*bottle(?:s)?/g, unit: 'bottle', label: 'Bottle', multiplier: 500, isWeight: false }
      ];
      
      drinkUnitPatterns.forEach(({ pattern, unit, label, multiplier, isWeight }) => {
        const matches = [...lowerServing.matchAll(pattern)];
        matches.forEach(match => {
          const amount = parseFloat(match[1]);
          if (amount > 0) {
            units.push({
              value: unit,
              label: label,
              amount: amount,
              multiplier: multiplier,
              isWeight: isWeight,
              description: `${amount} ${label}${amount !== 1 ? 's' : ''}`
            });
          }
        });
      });
      
      // If no can/bottle units found in database, add default drink units
      if (units.length === 0) {
        return [
          {
            value: 'can',
            label: 'Can',
            amount: 1,
            multiplier: 330, // Standard can size in ml
            isWeight: false,
            description: '1 can (330ml)'
          },
          {
            value: 'bottle',
            label: 'Bottle',
            amount: 1,
            multiplier: 500, // Standard bottle size in ml
            isWeight: false,
            description: '1 bottle (500ml)'
          }
        ];
      }
      return units;
    }
    
    // For other food, ONLY extract gram-based units (g, kg, oz)
    const foodUnitPatterns = [
      { pattern: /(\d+(?:\.\d+)?)\s*g(?:rams?)?/g, unit: 'g', label: 'Gram', multiplier: 1, isWeight: true },
      { pattern: /(\d+(?:\.\d+)?)\s*kg(?:ilograms?)?/g, unit: 'kg', label: 'Kilogram', multiplier: 1000, isWeight: true },
      { pattern: /(\d+(?:\.\d+)?)\s*oz(?:unces?)?/g, unit: 'oz', label: 'Ounce', multiplier: 28.35, isWeight: true }
    ];
    
    foodUnitPatterns.forEach(({ pattern, unit, label, multiplier, isWeight }) => {
      const matches = [...lowerServing.matchAll(pattern)];
      matches.forEach(match => {
        const amount = parseFloat(match[1]);
        if (amount > 0) {
          units.push({
            value: unit,
            label: label,
            amount: amount,
            multiplier: multiplier,
            isWeight: isWeight,
            description: `${amount} ${label}${amount !== 1 ? 's' : ''}`
          });
        }
      });
    });
    
    // If no gram-based units found, add default gram unit
    if (units.length === 0) {
      units.push({
        value: 'g',
        label: 'Gram',
        amount: 100,
        multiplier: 1,
        isWeight: true,
        description: '100 grams (default)'
      });
    }
    
    return units;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (abortController) {
        abortController.abort();
      }
    };
  }, []);

  // Get food suggestions with caching and request cancellation
  const getFoodSuggestions = async (input: string, signal?: AbortSignal): Promise<string[]> => {
    if (input.length < 2) return [];
    
    const normalizedInput = input.toLowerCase().trim();
    
    // Check cache first
    if (searchCache.has(normalizedInput)) {
      return searchCache.get(normalizedInput) || [];
    }
    
    try {
      const foods = await foodService.searchFoods(normalizedInput, { limit: 10 }, signal);
      
      if (!foods || !Array.isArray(foods)) {
        return [];
      }
      
      const foodNames = foods.map(food => food.name);
      
      // Cache the results
      setSearchCache(prev => {
        const newCache = new Map(prev);
        newCache.set(normalizedInput, foodNames);
        // Limit cache size to prevent memory issues
        if (newCache.size > 50) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        return newCache;
      });
      
      return foodNames;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
      }
      return [];
    }
  };

  // Handle food input change and show suggestions with optimized debouncing
  const handleFoodInputChange = async (value: string) => {
    setFoodInput(value);
    
    // Cancel any ongoing request
    if (abortController) {
      abortController.abort();
    }
    
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Reset food data and units when input changes
    setSelectedFoodData(null);
    setAvailableUnits([]);
    
    if (value.length >= 2) {
      // Check cache first for immediate results
      const normalizedInput = value.toLowerCase().trim();
      if (searchCache.has(normalizedInput)) {
        const cachedSuggestions = searchCache.get(normalizedInput) || [];
        setSuggestions(cachedSuggestions);
        setShowSuggestions(cachedSuggestions.length > 0);
        return;
      }
      
      // Clear suggestions and show loading
      setSuggestions([]);
      setShowSuggestions(false);
      
      // Optimized debounce timing based on query length
      const debounceTime = value.length <= 3 ? 150 : value.length <= 6 ? 250 : 400;
      
      const timeout = setTimeout(async () => {
        // Create new abort controller for this request
        const controller = new AbortController();
        setAbortController(controller);
        
        try {
          setIsLoading(true);
          const newSuggestions = await getFoodSuggestions(value, controller.signal);
          
          // Only update if request wasn't aborted
          if (!controller.signal.aborted) {
            setSuggestions(newSuggestions);
            setShowSuggestions(newSuggestions.length > 0);
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, debounceTime);
      
      setSearchTimeout(timeout);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Handle food selection from suggestions
  const handleFoodSelection = async (foodName: string) => {
    setFoodInput(foodName);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Fetch food data to get serving information
    try {
      setIsLoading(true);
      const foodData = await findFoodInDatabase(foodName);
      if (foodData) {
        setSelectedFoodData(foodData);
        
        // Extract available units from serving_size
        const units = extractUnitsFromServingSize(foodData.serving, foodData.name);
        setAvailableUnits(units);
        
        // Set default unit: 'can' for drinks, 'piece' for eggs, 'g' for other food
        if (units.length > 0) {
          const lowerFoodName = foodName.toLowerCase();
          const isDrink = drinkKeywords.some(keyword => 
            lowerFoodName.includes(keyword)
          );
          const isEgg = /\begg(s)?\b/i.test(lowerFoodName);
          const defaultUnit = isDrink ? 'can' : (isEgg ? 'piece' : 'g');
          const unitToSelect = units.find(u => u.value === defaultUnit) || units[0];
          setSelectedUnit(unitToSelect.value);
        }
        
      } else {
        // Fallback to general unit options if food not found
        const filteredOptions = getFilteredUnitOptions(foodName);
        setAvailableUnits(filteredOptions);
        if (filteredOptions.length > 0) {
          // For drinks, default to 'can', for eggs default to 'piece', for other food default to 'g'
          const lowerFoodName = foodName.toLowerCase();
          const isDrink = drinkKeywords.some(keyword => 
            lowerFoodName.includes(keyword)
          );
          const isEgg = /\begg(s)?\b/i.test(lowerFoodName);
          const defaultUnit = isDrink ? 'can' : (isEgg ? 'piece' : 'g');
          const unitToSelect = filteredOptions.find(u => u.value === defaultUnit) || filteredOptions[0];
          setSelectedUnit(unitToSelect.value);
        }
      }
    } catch (error) {
      console.error('Error fetching food data:', error);
      // Fallback to general unit options
      const filteredOptions = getFilteredUnitOptions(foodName);
      setAvailableUnits(filteredOptions);
      if (filteredOptions.length > 0) {
        // For drinks, default to 'can', for eggs default to 'piece', for other food default to 'g'
        const lowerFoodName = foodName.toLowerCase();
        const isDrink = drinkKeywords.some(keyword => 
          lowerFoodName.includes(keyword)
        );
        const isEgg = /\begg(s)?\b/i.test(lowerFoodName);
        const defaultUnit = isDrink ? 'can' : (isEgg ? 'piece' : 'g');
        const unitToSelect = filteredOptions.find(u => u.value === defaultUnit) || filteredOptions[0];
        setSelectedUnit(unitToSelect.value);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Unit options for food logging
  const allUnitOptions = [
    { value: 'g', label: 'Gram', description: 'Most universal and precise unit', category: 'solid' },
    { value: 'ml', label: 'Milliliter', description: 'For liquids', category: 'liquid' },
    { value: 'oz', label: 'Ounce', description: 'Useful for US-based users', category: 'solid' },
    { value: 'cup', label: 'Cup', description: 'Common household measurement', category: 'both' },
    { value: 'piece', label: 'Piece', description: 'For foods eaten whole', category: 'solid' },
    { value: 'slice', label: 'Slice', description: 'Bread, cheese, pizza, etc.', category: 'solid' },
    { value: 'sandwich', label: 'Sandwich', description: '1 sandwich', category: 'solid' },
    { value: 'can', label: 'Can', description: '1 can = 330ml (drinks) or 150g (foods)', category: 'both' },
    { value: 'bottle', label: 'Bottle', description: '1 bottle = 500ml (drinks) or 200g (foods)', category: 'both' }
  ];

  // Drink keywords that should show liquid units
  const drinkKeywords = [
    'water', 'juice', 'soda', 'coffee', 'tea', 'milk', 'beer', 'wine', 'alcohol', 'drink', 'beverage',
    'smoothie', 'shake', 'soup', 'broth', 'sauce', 'oil', 'vinegar', 'syrup', 'honey', 'yogurt drink',
    'energy drink', 'sports drink', 'coconut water', 'almond milk', 'soy milk', 'coconut milk',
    'orange juice', 'apple juice', 'cranberry juice', 'grape juice', 'lemonade', 'iced tea',
    'hot chocolate', 'cocoa', 'espresso', 'latte', 'cappuccino', 'americano', 'frappuccino',
    'coke', 'pepsi', 'sprite', 'fanta', 'ginger ale', 'root beer', 'iced coffee', 'cold brew',
    'chai', 'matcha', 'green tea', 'black tea', 'herbal tea', 'chamomile', 'peppermint',
    'protein shake', 'meal replacement', 'kombucha', 'kefir', 'buttermilk', 'heavy cream',
    'half and half', 'whipping cream', 'coconut cream', 'oat milk', 'rice milk', 'hemp milk',
    'bone broth', 'vegetable broth', 'chicken broth', 'beef broth', 'tomato soup', 'cream soup',
    'olive oil', 'coconut oil', 'vegetable oil', 'sesame oil', 'balsamic vinegar', 'apple cider vinegar',
    'maple syrup', 'agave', 'simple syrup', 'chocolate syrup', 'caramel sauce', 'hot sauce'
  ];

  // Get filtered unit options based on food input
  const getFilteredUnitOptions = (foodName: string) => {
    const lowerFoodName = foodName.toLowerCase();
    
    // Check for liquid keywords
    const isDrink = drinkKeywords.some(keyword => {
      // Use word boundary matching for more accurate detection
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerFoodName);
    });
    
    // Check if this is eggs - should be measured per piece
    const isEgg = /\begg(s)?\b/i.test(lowerFoodName);
    
    if (isDrink) {
      // For drinks, ONLY show can and bottle units
      return [
        { value: 'can', label: 'Can', description: '1 can (330ml)', category: 'liquid' },
        { value: 'bottle', label: 'Bottle', description: '1 bottle (500ml)', category: 'liquid' }
      ];
    } else if (isEgg) {
      // For eggs, ONLY show piece-based units
      return [
        { value: 'piece', label: 'Egg', description: '1 egg', category: 'solid' }
      ];
    } else {
      // For other food, ONLY show gram-based units (g, kg, oz)
      return [
        { value: 'g', label: 'Gram', description: 'Most universal and precise unit', category: 'solid' },
        { value: 'kg', label: 'Kilogram', description: '1000 grams', category: 'solid' },
        { value: 'oz', label: 'Ounce', description: '28.35 grams', category: 'solid' }
      ];
    }
  };

  // Get current unit options - use database units if food is selected, otherwise use filtered options
  const unitOptions = availableUnits.length > 0 ? availableUnits : getFilteredUnitOptions(foodInput);

  // Food database is now loaded from XAMPP MySQL database via FoodService
  // All hardcoded food data has been removed - using database instead

  // Calculate daily totals
  const dailyTotals = meals.reduce((totals, meal) => ({
    calories: totals.calories + meal.totalCalories,
    protein: totals.protein + meal.totalProtein,
    carbs: totals.carbs + meal.totalCarbs,
    fat: totals.fat + meal.totalFat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Calculate adjusted goal (base goal + calories burned from exercise)
  const adjustedCalorieGoal = dailyGoal.calories + caloriesBurned;
  
  // Calculate net calories (calories consumed - calories burned)
  const netCalories = dailyTotals.calories - caloriesBurned;

  // Calculate daily goals based on user profile
  const calculateDailyGoals = (profile: typeof userProfile): DailyGoal => {
    // Use default values if profile is incomplete
    const weight = profile.weight || 70;
    const height = profile.height || 170;
    const age = profile.age || 30;
    
    // BMR calculation (Mifflin-St Jeor Equation)
    let bmr;
    if (profile.gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    const tdee = bmr * activityMultipliers[profile.activityLevel as keyof typeof activityMultipliers];

    // Goal adjustments
    let calorieGoal = tdee;
    if (profile.goal === 'weight_loss') {
      calorieGoal = tdee - 500; // 500 calorie deficit
    } else if (profile.goal === 'weight_gain') {
      calorieGoal = tdee + 500; // 500 calorie surplus
    }

    // Macro calculations
    const proteinGoal = Math.round(weight * 2.2); // 2.2g per kg body weight
    const fatGoal = Math.round(calorieGoal * 0.25 / 9); // 25% of calories from fat
    const carbGoal = Math.round((calorieGoal - (proteinGoal * 4) - (fatGoal * 9)) / 4); // Remaining calories from carbs

    return {
      calories: Math.round(calorieGoal),
      protein: proteinGoal,
      carbs: carbGoal,
      fat: fatGoal
    };
  };

  // Update goals when profile changes, but only if goals weren't already loaded from database
  // This ensures saved goals persist across login/logout
  useEffect(() => {
    // Only recalculate if:
    // 1. Goals haven't been loaded from database yet, OR
    // 2. Profile has meaningful values (not just default/empty)
    if (!goalsLoaded && userProfile.age > 0 && userProfile.weight > 0 && userProfile.height > 0) {
      const newGoals = calculateDailyGoals(userProfile);
      setDailyGoal(newGoals);
    }
  }, [userProfile, goalsLoaded]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Initialize UserDataService
  const userDataService = UserDataService.getInstance();

  // Helper function to process photo analyzer items
  const processPhotoAnalyzerItems = () => {
    const photoAnalyzerData = sessionStorage.getItem('photoAnalyzerItems');
    
    if (photoAnalyzerData) {
      try {
        const { items, dishName } = JSON.parse(photoAnalyzerData);
        
        if (items && items.length > 0) {
          // Clear the sessionStorage immediately to prevent reprocessing
          sessionStorage.removeItem('photoAnalyzerItems');
          
          // Capture selectedMeal at the time of processing (use ref to get latest value)
          const mealToAddTo = selectedMealRef.current;
          
          // Use functional update to avoid dependency on meals
          setMeals((currentMeals) => {
            // Add items to the current meal
            const newFoods: FoodItem[] = items.map((item: any, index: number) => ({
              id: Date.now().toString() + index,
              name: item.name,
              calories: Math.round(item.calories || 0),
              protein: item.protein || 0,
              carbs: item.carbs || 0,
              fat: item.fat || 0,
              fiber: item.fiber || 0,
              serving: '1 portion',
              category: 'other',
              amount: 1,
              unit: 'portion',
              foodId: undefined
            }));

            const currentMeal = currentMeals.find(m => m.name.toLowerCase() === mealToAddTo);
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (currentMeal) {
              const updatedMeal = {
                ...currentMeal,
                foods: [...currentMeal.foods, ...newFoods],
                totalCalories: currentMeal.totalCalories + newFoods.reduce((sum, food) => sum + food.calories, 0),
                totalProtein: currentMeal.totalProtein + newFoods.reduce((sum, food) => sum + food.protein, 0),
                totalCarbs: currentMeal.totalCarbs + newFoods.reduce((sum, food) => sum + food.carbs, 0),
                totalFat: currentMeal.totalFat + newFoods.reduce((sum, food) => sum + food.fat, 0)
              };
              const totalCalories = newFoods.reduce((sum, food) => sum + food.calories, 0);
              setLogMessage(`✅ Added ${newFoods.length} item(s) from photo analysis${dishName ? ` (${dishName})` : ''} to ${mealToAddTo}. Total: ${totalCalories} calories.`);
              setTimeout(() => setLogMessage(''), 5000);
              return currentMeals.map(m => m.id === currentMeal.id ? updatedMeal : m);
            } else {
              const newMeal: Meal = {
                id: Date.now().toString(),
                name: mealToAddTo,
                time: timeString,
                foods: newFoods,
                totalCalories: newFoods.reduce((sum, food) => sum + food.calories, 0),
                totalProtein: newFoods.reduce((sum, food) => sum + food.protein, 0),
                totalCarbs: newFoods.reduce((sum, food) => sum + food.carbs, 0),
                totalFat: newFoods.reduce((sum, food) => sum + food.fat, 0)
              };
              const totalCalories = newFoods.reduce((sum, food) => sum + food.calories, 0);
              setLogMessage(`✅ Added ${newFoods.length} item(s) from photo analysis${dishName ? ` (${dishName})` : ''} to ${mealToAddTo}. Total: ${totalCalories} calories.`);
              setTimeout(() => setLogMessage(''), 5000);
              return [...currentMeals, newMeal];
            }
          });
        }
      } catch (error) {
        console.error('Error processing photo analyzer items:', error);
      }
    }
  };

  // Check for items from PhotoAnalyzer whenever selectedMeal changes
  useEffect(() => {
    processPhotoAnalyzerItems();
  }, [selectedMeal]);

  // Check for items when component mounts and listen for custom events
  useEffect(() => {
    // Check immediately on mount
    processPhotoAnalyzerItems();
    
    // Listen for custom event when items are added from photo analyzer
    const handlePhotoItemsAdded = () => {
      // Small delay to ensure sessionStorage is set
      setTimeout(() => {
        processPhotoAnalyzerItems();
      }, 200);
    };
    
    window.addEventListener('photoItemsReady', handlePhotoItemsAdded);
    
    // Also check periodically (every 500ms) as fallback for more reliable detection
    const interval = setInterval(() => {
      processPhotoAnalyzerItems();
    }, 500);
    
    return () => {
      window.removeEventListener('photoItemsReady', handlePhotoItemsAdded);
      clearInterval(interval);
    };
  }, []); // Only run on mount

  // Load today's activity data to get calories burned
  const loadTodayActivity = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await apiClient.get('/user-data/activity/today');
      if (response.success && response.data?.exercises) {
        const totalCaloriesBurned = response.data.exercises.reduce(
          (sum: number, ex: any) => sum + (ex.caloriesBurned || 0),
          0
        );
        setCaloriesBurned(Math.round(totalCaloriesBurned));
      }
    } catch (error) {
      console.error('Failed to load activity data:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const loadUserData = async () => {
        try {
          // Load goals FIRST (they take priority)
          const savedGoals = await userDataService.getTodayGoals();
          const hasSavedGoals = savedGoals && (
            savedGoals.calories !== 2000 || 
            savedGoals.protein !== 150 || 
            savedGoals.carbs !== 250 || 
            savedGoals.fat !== 65
          );
          
          if (hasSavedGoals) {
            // User has saved goals - use them
            setDailyGoal(savedGoals);
            setGoalsLoaded(true);
          } else {
            // No saved goals - will calculate from profile
            setGoalsLoaded(false);
          }

          // Load profile (needed for calculating goals if none saved)
          const profile = await userDataService.getUserProfile();
          if (profile && profile.age > 0 && profile.weight > 0 && profile.height > 0) {
            setUserProfile(profile);
            
            // If no saved goals, calculate from profile
            if (!hasSavedGoals) {
              const calculatedGoals = calculateDailyGoals(profile);
              setDailyGoal(calculatedGoals);
              // Save calculated goals to database
              await userDataService.saveTodayGoals(calculatedGoals);
              setGoalsLoaded(true);
            }
          }

          // Load meals
          const savedMeals = await userDataService.getTodayMeals();
          if (savedMeals && savedMeals.length > 0) {
            setMeals(savedMeals);
          }

          // Load activity data (calories burned)
          await loadTodayActivity();

          // Load history
          await loadHistory();
        } catch (error) {
          console.error('Failed to load user data:', error);
        }
      };

      loadUserData();
    } else {
      // Reset goals when user logs out
      setDailyGoal({
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65
      });
      setGoalsLoaded(false);
      setCaloriesBurned(0);
    }
  }, [isAuthenticated]);

  // Reload activity data periodically to update calories burned
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Reload activity every 30 seconds to catch new exercises
    const interval = setInterval(() => {
      loadTodayActivity();
    }, 30000);

    // Also listen for custom events when activities are updated
    const handleActivityUpdate = () => {
      setTimeout(() => loadTodayActivity(), 500);
    };
    window.addEventListener('activityUpdated', handleActivityUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('activityUpdated', handleActivityUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // loadTodayActivity is stable, no need to include in deps

  // Load history
  const loadHistory = async () => {
    if (!isAuthenticated) return;
    setIsLoadingHistory(true);
    try {
      const historyData = await userDataService.getMealHistory(90); // Last 90 days
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load meals for selected date
  const loadDateMeals = async (date: string) => {
    if (!isAuthenticated) return;
    setIsLoadingHistory(true);
    try {
      const dateMeals = await userDataService.getMealsByDate(date);
      setSelectedDateMeals(dateMeals);
      setSelectedDate(date);
    } catch (error) {
      console.error('Failed to load date meals:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Delete a day from history
  // Save meals when they change (debounced)
  useEffect(() => {
    if (!isAuthenticated) return;

    const saveTimeout = setTimeout(async () => {
      try {
        await userDataService.saveTodayMeals(meals);
      } catch (error) {
        console.error('Failed to save meals:', error);
      }
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(saveTimeout);
  }, [meals, isAuthenticated]);

  // Save goals when they change (debounced) - but only if goals were already loaded
  // This prevents saving when goals are first loaded from database
  useEffect(() => {
    if (!isAuthenticated || !goalsLoaded) return;

    const saveTimeout = setTimeout(async () => {
      try {
        await userDataService.saveTodayGoals(dailyGoal);
      } catch (error) {
        console.error('Failed to save goals:', error);
      }
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(saveTimeout);
  }, [dailyGoal, isAuthenticated, goalsLoaded]);

  // Save profile when it changes (debounced)
  useEffect(() => {
    if (!isAuthenticated || userProfile.age === 0) return;

    const saveTimeout = setTimeout(async () => {
      try {
        await userDataService.saveUserProfile(userProfile);
      } catch (error) {
        console.error('Failed to save profile:', error);
      }
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(saveTimeout);
  }, [userProfile, isAuthenticated]);

  // Enhanced food parsing with better pattern matching
  const parseFoodInput = (input: string): { food: string; amount: number; unit: string }[] => {
    const items: { food: string; amount: number; unit: string }[] = [];
    
    // More comprehensive patterns for different input formats
    const patterns = [
      // "2 cups of rice", "1 slice of bread", "100g chicken"
      /(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|oz|g|kg|lbs?|slices?|pieces?|eggs?|apples?|bananas?)\s+(?:of\s+)?(.+)/gi,
      // "2 boiled eggs", "1 large apple", "3 medium bananas"
      /(\d+(?:\.\d+)?)\s+(?:large|medium|small|big|tiny)?\s*(boiled|fried|scrambled|grilled|baked|raw|cooked)?\s*(.+)/gi,
      // "rice 1 cup", "chicken 200g", "bread 2 slices"
      /(.+?)\s+(\d+(?:\.\d+)?)\s*(cups?|tbsp|tsp|oz|g|kg|lbs?|slices?|pieces?|eggs?|apples?|bananas?)/gi,
      // Simple format: "2 eggs", "1 apple", "3 bananas"
      /(\d+(?:\.\d+)?)\s+(eggs?|apples?|bananas?|oranges?|slices?|pieces?|cups?|tbsp|tsp|oz|g|kg|lbs?)\s*(.+)?/gi,
      // Just food names with default amounts
      /^(.+)$/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        let amount = 1;
        let unit = 'serving';
        let food = '';

        if (pattern === patterns[0] || pattern === patterns[2]) {
          // Format: "2 cups of rice" or "rice 1 cup"
          amount = parseFloat(match[1]);
          unit = match[2] || match[3] || 'serving';
          food = match[3] || match[1];
        } else if (pattern === patterns[1]) {
          // Format: "2 boiled eggs"
          amount = parseFloat(match[1]);
          const adjective = match[2] || '';
          const foodName = match[3] || '';
          food = `${adjective} ${foodName}`.trim();
          unit = 'serving';
        } else if (pattern === patterns[3]) {
          // Format: "2 eggs" or "1 apple"
          amount = parseFloat(match[1]);
          unit = match[2];
          food = match[3] || match[2];
        } else if (pattern === patterns[4]) {
          // Format: just food name
          food = match[1].trim();
          amount = 1;
          unit = 'serving';
        }

        if (food) {
          items.push({ food, amount, unit });
        }
      }
    }

    return items;
  };

  // Enhanced food database search using API
  const findFoodInDatabase = async (foodName: string) => {
    try {
      setIsLoading(true);
      const food = await foodService.getNutritionFacts(foodName);
      if (food) {
        const convertedFood = foodService.convertToInternalFormat(food);
        return convertedFood;
      }
      return null;
    } catch (error) {
      console.error('Error finding food:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Save food log to database
  const saveFoodLogToDatabase = async (foodId: string | number, quantity: number, mealType: string) => {
    try {
      const response = await apiClient.post('/food-logs/log', {
        foodId: foodId,
        quantity: quantity,
        mealType: mealType,
        loggedAt: new Date().toISOString()
      });
      
      if (response.success) {
        return true;
      } else {
        console.error('Failed to log food to database:', response.message);
        setLogMessage(`Failed to save to database: ${response.message}`);
        return false;
      }
    } catch (error) {
      console.error('Error saving food log to database:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLogMessage(`Database error: ${errorMessage}`);
      return false;
    }
  };

  // Add food to meal
  const addFoodToMeal = async () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!foodInput.trim()) {
      setLogMessage('Please enter some food to log.');
      return;
    }

    // Use the selected unit and amount from the UI
    const parsedItems = [{ food: foodInput, amount: amount === '' ? 1 : amount, unit: selectedUnit }];

    const newFoods: FoodItem[] = [];
    const notFoundFoods: string[] = [];
    
    for (const item of parsedItems) {
      const dbFood = await findFoodInDatabase(item.food);
      if (dbFood) {
        // Enhanced unit conversion to grams using database information
        let amountInGrams = item.amount;
        const unit = item.unit.toLowerCase();
        
        // If we have selected food data with available units, use the multiplier
        if (selectedFoodData && availableUnits.length > 0) {
          const selectedUnitData = availableUnits.find(u => u.value === unit);
          if (selectedUnitData && selectedUnitData.multiplier) {
            // For drinks (can/bottle), the multiplier represents ml, not grams
            if (unit === 'can' || unit === 'bottle') {
              // For drinks, use the ml amount directly for nutrition calculation
              amountInGrams = item.amount * selectedUnitData.multiplier; // This gives us ml
            } else {
              // For other units, use the multiplier as grams
              amountInGrams = item.amount * selectedUnitData.multiplier;
            }
          } else {
            // Fallback to standard conversions
            amountInGrams = convertUnitToGrams(item.amount, unit);
          }
        } else {
          // Use standard conversion logic
          amountInGrams = convertUnitToGrams(item.amount, unit);
        }
        
        // Calculate nutrition based on serving weight from database
        // For drinks, extract the actual serving size from the serving field
        let servingWeight = dbFood.serving_weight_grams || 100;
        
        // If it's a drink and we have serving size info, use that instead
        if ((unit === 'can' || unit === 'bottle') && dbFood.serving) {
          const servingMatch = dbFood.serving.match(/(\d+)ml/i);
          if (servingMatch) {
            servingWeight = parseInt(servingMatch[1]);
          }
        }
        
        // Handle different unit types properly
        const pieceBasedUnits = ['piece', 'slice', 'egg', 'apple', 'banana', 'cookie', 'cracker', 'muffin', 'donut', 'bagel', 'roll', 'meatball', 'nugget', 'patty', 'sausage', 'hot dog', 'burger', 'pancake', 'waffle', 'toast', 'biscuit', 'croissant', 'pretzel'];
        const isPieceBased = pieceBasedUnits.some(pieceUnit => unit.includes(pieceUnit));
        const isDrink = unit === 'can' || unit === 'bottle';
        
        let multiplier;
        
        if (isDrink) {
          // For drinks, the amountInGrams is actually ml
          // The database serving size should be in ml for drinks (e.g., 100ml)
          // So if we have 330ml and database serving is 100ml, multiplier = 330/100 = 3.3
          const servingSizeInMl = servingWeight; // This should be ml for drinks
          multiplier = amountInGrams / servingSizeInMl;
          
        } else if (isPieceBased) {
          // For piece-based units, we need to calculate based on weight per piece
          // First, try to extract weight per piece from serving_size (e.g., "1 large (50g)")
          let weightPerPiece = servingWeight; // Default: assume servingWeight is per piece
          
          // Try to extract weight per piece from serving_size field
          if (dbFood.serving) {
            const servingMatch = dbFood.serving.match(/(\d+(?:\.\d+)?)\s*(?:large|medium|small|piece|egg|slice)/i);
            if (servingMatch) {
              // If serving_size mentions "1 large" or similar, check if there's a weight mentioned
              const weightMatch = dbFood.serving.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?/i);
              if (weightMatch) {
                weightPerPiece = parseFloat(weightMatch[1]);
              } else {
                // Common defaults for piece-based items
                if (unit.includes('egg')) {
                  weightPerPiece = 50; // Average egg weight
                } else if (unit.includes('apple')) {
                  weightPerPiece = 182; // Average apple weight
                } else if (unit.includes('banana')) {
                  weightPerPiece = 118; // Average banana weight
                } else {
                  // Use servingWeight as weight per piece if it's reasonable (< 200g)
                  weightPerPiece = servingWeight < 200 ? servingWeight : 100;
                }
              }
            }
          }
          
          // Calculate total weight and multiplier
          const totalWeight = item.amount * weightPerPiece;
          // Database calories are per servingWeight grams, so:
          multiplier = totalWeight / servingWeight;
        } else {
          // For weight-based units (grams, ounces, etc.)
          multiplier = amountInGrams / servingWeight;
        }

        const foodItem = {
          id: Date.now().toString() + Math.random(),
          name: dbFood.name,
          calories: Math.round(dbFood.calories * multiplier),
          protein: Math.round(dbFood.protein * multiplier * 10) / 10,
          carbs: Math.round(dbFood.carbs * multiplier * 10) / 10,
          fat: Math.round(dbFood.fat * multiplier * 10) / 10,
          fiber: Math.round(dbFood.fiber * multiplier * 10) / 10,
          serving: dbFood.serving,
          category: dbFood.category,
          amount: item.amount,
          unit: item.unit,
          foodId: dbFood.food_id // Store the database food ID
        };

        newFoods.push(foodItem);

        // Save to database
        const savedToDatabase = await saveFoodLogToDatabase(dbFood.food_id, amountInGrams, selectedMeal);
        if (!savedToDatabase) {
          // Still add to local state even if database save fails
          console.warn('Food added locally but failed to save to database');
        }
      } else {
        notFoundFoods.push(item.food);
      }
    }

    if (newFoods.length > 0) {
      const currentMeal = meals.find(m => m.name.toLowerCase() === selectedMeal);
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (currentMeal) {
        // Add to existing meal
        const updatedMeal = {
          ...currentMeal,
          foods: [...currentMeal.foods, ...newFoods],
          totalCalories: currentMeal.totalCalories + newFoods.reduce((sum, food) => sum + food.calories, 0),
          totalProtein: currentMeal.totalProtein + newFoods.reduce((sum, food) => sum + food.protein, 0),
          totalCarbs: currentMeal.totalCarbs + newFoods.reduce((sum, food) => sum + food.carbs, 0),
          totalFat: currentMeal.totalFat + newFoods.reduce((sum, food) => sum + food.fat, 0)
        };

        setMeals(meals.map(m => m.id === currentMeal.id ? updatedMeal : m));
      } else {
        // Create new meal
        const newMeal: Meal = {
          id: Date.now().toString(),
          name: selectedMeal,
          time: timeString,
          foods: newFoods,
          totalCalories: newFoods.reduce((sum, food) => sum + food.calories, 0),
          totalProtein: newFoods.reduce((sum, food) => sum + food.protein, 0),
          totalCarbs: newFoods.reduce((sum, food) => sum + food.carbs, 0),
          totalFat: newFoods.reduce((sum, food) => sum + food.fat, 0)
        };

        setMeals([...meals, newMeal]);
      }

      setFoodInput('');
      setIsAddingFood(false);
      
      // Show success message
      const totalCalories = newFoods.reduce((sum, food) => sum + food.calories, 0);
      setLogMessage(`✅ Added ${amount === '' ? 1 : amount} ${selectedUnit} of ${foodInput} (${totalCalories} calories) to ${selectedMeal}.`);
      
      // Clear message after 3 seconds
      setTimeout(() => setLogMessage(''), 3000);
    } else {
      setLogMessage(`❌ Could not find: ${notFoundFoods.join(', ')}. Try different names or check spelling.`);
      setTimeout(() => setLogMessage(''), 5000);
    }
  };

  // Remove food from meal
  const removeFood = (mealId: string, foodId: string) => {
    setMeals(meals.map(meal => {
      if (meal.id === mealId) {
        const foodToRemove = meal.foods.find(f => f.id === foodId);
        if (foodToRemove) {
          const updatedFoods = meal.foods.filter(f => f.id !== foodId);
          return {
            ...meal,
            foods: updatedFoods,
            totalCalories: updatedFoods.reduce((sum, food) => sum + food.calories, 0),
            totalProtein: updatedFoods.reduce((sum, food) => sum + food.protein, 0),
            totalCarbs: updatedFoods.reduce((sum, food) => sum + food.carbs, 0),
            totalFat: updatedFoods.reduce((sum, food) => sum + food.fat, 0)
          };
        }
      }
      return meal;
    }));
  };


  // Get progress percentage
  const getProgressPercentage = (current: number, goal: number) => {
    if (goal <= 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  // Get status color (using adjusted goal for calories)
  const getStatusColor = (current: number, goal: number) => {
    const percentage = (current / goal) * 100;
    if (percentage >= 100) return 'text-red-500';
    if (percentage >= 80) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Smart suggestions (using adjusted goal)
  const getSmartSuggestions = () => {
    const suggestions = [];
    
    if (caloriesBurned > 0) {
      suggestions.push(`Great job! You've burned ${caloriesBurned} calories through exercise. You can eat ${caloriesBurned} more calories today!`);
    }
    
    if (dailyTotals.calories > adjustedCalorieGoal) {
      const excess = dailyTotals.calories - adjustedCalorieGoal;
      suggestions.push(`You've consumed ${excess} calories above your adjusted target. Try a lighter dinner tomorrow.`);
    } else if (dailyTotals.calories < adjustedCalorieGoal * 0.7) {
      const deficit = adjustedCalorieGoal - dailyTotals.calories;
      suggestions.push(`You're ${Math.round(deficit)} calories below your adjusted target. Consider adding a healthy snack.`);
    }

    if (dailyTotals.protein < dailyGoal.protein * 0.7) {
      suggestions.push(`Your protein intake is low today (${Math.round(dailyTotals.protein)}g). Try adding eggs, chicken, or beans to your meals.`);
    }

    if (dailyTotals.carbs < dailyGoal.carbs * 0.5) {
      suggestions.push(`Your carb intake is very low. Consider adding whole grains, fruits, or vegetables.`);
    }

    return suggestions;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  };

  // Get date string for today
  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        <Button
          variant={activeTab === 'today' ? 'default' : 'ghost'}
          onClick={() => {
            if (!isAuthenticated) {
              setIsLoginModalOpen(true);
              return;
            }
            setActiveTab('today');
            setSelectedDate(null);
          }}
          className="rounded-b-none flex-shrink-0"
        >
          <Calculator className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="text-sm sm:text-base">Today</span>
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          onClick={() => {
            if (!isAuthenticated) {
              setIsLoginModalOpen(true);
              return;
            }
            setActiveTab('history');
            loadHistory();
          }}
          className="rounded-b-none flex-shrink-0"
        >
          <History className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="text-sm sm:text-base">History</span>
        </Button>
      </div>

      {/* Today Tab Content */}
      {activeTab === 'today' && (
        <>
      {/* Daily Overview */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-lg sm:text-2xl">Daily Calorie Tracker</span>
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {caloriesBurned > 0 && (
              <Badge variant="secondary" className="text-xs sm:text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <Flame className="h-3 w-3 mr-1" />
                -{caloriesBurned} kcal burned
              </Badge>
            )}
            <Badge variant="outline" className="text-xs sm:text-sm">
              {dailyTotals.calories} / {adjustedCalorieGoal} kcal
              {caloriesBurned > 0 && (
                <span className="ml-1 text-muted-foreground text-xs">
                  (base: {dailyGoal.calories})
                </span>
              )}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!isAuthenticated) {
                  setIsLoginModalOpen(true);
                  return;
                }
                setShowGoalSettings(!showGoalSettings);
              }}
              className="text-xs sm:text-sm"
            >
              <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Goals
            </Button>
          </div>
        </div>

        {/* Goal Settings Modal */}
        {showGoalSettings && (
          <div className="mb-6 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Set Your Goals</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label htmlFor="goal-age" className="text-sm font-medium">Age</label>
                <Input
                  id="goal-age"
                  name="age"
                  type="number"
                  value={userProfile.age || ''}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter your age"
                  className="mt-1"
                  onFocus={() => {
                    if (!isAuthenticated) {
                      setIsLoginModalOpen(true);
                    }
                  }}
                />
              </div>
              <div>
                <label htmlFor="goal-weight" className="text-sm font-medium">Weight (kg)</label>
                <Input
                  id="goal-weight"
                  name="weight"
                  type="number"
                  value={userProfile.weight || ''}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter your weight"
                  className="mt-1"
                  onFocus={() => {
                    if (!isAuthenticated) {
                      setIsLoginModalOpen(true);
                    }
                  }}
                />
              </div>
              <div>
                <label htmlFor="goal-height" className="text-sm font-medium">Height (cm)</label>
                <Input
                  id="goal-height"
                  name="height"
                  type="number"
                  value={userProfile.height || ''}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter your height"
                  className="mt-1"
                  onFocus={() => {
                    if (!isAuthenticated) {
                      setIsLoginModalOpen(true);
                    }
                  }}
                />
              </div>
              <div>
                <label htmlFor="goal-gender" className="text-sm font-medium">Gender</label>
                <select
                  id="goal-gender"
                  name="gender"
                  value={userProfile.gender}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                  className="mt-1 w-full p-2 border rounded-md"
                  onFocus={() => {
                    if (!isAuthenticated) {
                      setIsLoginModalOpen(true);
                    }
                  }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label htmlFor="goal-activity-level" className="text-sm font-medium">Activity Level</label>
                <select
                  id="goal-activity-level"
                  name="activityLevel"
                  value={userProfile.activityLevel}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, activityLevel: e.target.value }))}
                  className="mt-1 w-full p-2 border rounded-md"
                  onFocus={() => {
                    if (!isAuthenticated) {
                      setIsLoginModalOpen(true);
                    }
                  }}
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                  <option value="very_active">Very Active</option>
                </select>
              </div>
              <div>
                <label htmlFor="goal-goal" className="text-sm font-medium">Goal</label>
                <select
                  id="goal-goal"
                  name="goal"
                  value={userProfile.goal}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, goal: e.target.value }))}
                  className="mt-1 w-full p-2 border rounded-md"
                  onFocus={() => {
                    if (!isAuthenticated) {
                      setIsLoginModalOpen(true);
                    }
                  }}
                >
                  <option value="weight_loss">Weight Loss</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="weight_gain">Weight Gain</option>
                </select>
              </div>
            </div>
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <div className="text-xs sm:text-sm">
                <strong>Your calculated goals:</strong>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>Calories: {dailyGoal.calories}</div>
                  <div>Protein: {dailyGoal.protein}g</div>
                  <div>Carbs: {dailyGoal.carbs}g</div>
                  <div>Fat: {dailyGoal.fat}g</div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowGoalSettings(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!isAuthenticated) {
                    setIsLoginModalOpen(true);
                    return;
                  }
                  const newGoals = calculateDailyGoals(userProfile);
                  setDailyGoal(newGoals);
                  setGoalsLoaded(true); // Mark that goals are now saved
                  // Save immediately to database
                  try {
                    await userDataService.saveTodayGoals(newGoals);
                  } catch (error) {
                    console.error('Failed to save goals:', error);
                  }
                  setShowGoalSettings(false);
                }}
              >
                Save Goals
              </Button>
            </div>
          </div>
        )}

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <span>Calories</span>
                {caloriesBurned > 0 && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Activity className="h-3 w-3 mr-1" />
                    +{caloriesBurned} from exercise
                  </Badge>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className={getStatusColor(dailyTotals.calories, adjustedCalorieGoal)}>
                  {dailyTotals.calories} / {adjustedCalorieGoal}
                </span>
                {caloriesBurned > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Base goal: {dailyGoal.calories}
                  </span>
                )}
              </div>
            </div>
            <Progress 
              value={getProgressPercentage(dailyTotals.calories, adjustedCalorieGoal)} 
              className="h-2"
            />
            {caloriesBurned > 0 && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded-md text-xs text-green-800 dark:text-green-200">
                <div className="flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  <span>You've burned {caloriesBurned} calories today! Your adjusted goal is {adjustedCalorieGoal} calories.</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span>Protein</span>
                <span>{Math.round(dailyTotals.protein)}g</span>
              </div>
              <Progress 
                value={getProgressPercentage(dailyTotals.protein, dailyGoal.protein)} 
                className="h-1"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Carbs</span>
                <span>{Math.round(dailyTotals.carbs)}g</span>
              </div>
              <Progress 
                value={getProgressPercentage(dailyTotals.carbs, dailyGoal.carbs)} 
                className="h-1"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Fat</span>
                <span>{Math.round(dailyTotals.fat)}g</span>
              </div>
              <Progress 
                value={getProgressPercentage(dailyTotals.fat, dailyGoal.fat)} 
                className="h-1"
              />
            </div>
          </div>
        </div>

        {/* Smart Suggestions */}
        {getSmartSuggestions().length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Smart Suggestions:</strong>
                <ul className="mt-1 space-y-1">
                  {getSmartSuggestions().map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Food Logging */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          Log Food
        </h3>

        <div className="space-y-3 sm:space-y-4">
          {/* Food Name Input */}
          <div className="relative">
            <label htmlFor="food-name" className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Food Name</label>
            <Input
              id="food-name"
              name="foodName"
              value={foodInput}
              onChange={(e) => handleFoodInputChange(e.target.value)}
              placeholder="e.g., eggs, chicken, rice, apple"
              className="w-full"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  if (!isAuthenticated) {
                    setIsLoginModalOpen(true);
                    return;
                  }
                  addFoodToMeal();
                }
              }}
              onFocus={() => {
                if (!isAuthenticated) {
                  setIsLoginModalOpen(true);
                  return;
                }
                if (foodInput.length >= 2 && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              autoComplete="off"
              spellCheck={false}
            />
            
            {/* Food Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                    Searching...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion}-${index}`}
                      onClick={() => handleFoodSelection(suggestion)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                    >
                      {suggestion}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No foods found for "{foodInput}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount and Unit Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="food-amount" className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Amount</label>
              <Input
                id="food-amount"
                name="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                min="0.1"
                step="0.1"
                placeholder="Enter amount"
                className="w-full"
                onFocus={() => {
                  if (!isAuthenticated) {
                    setIsLoginModalOpen(true);
                  }
                }}
              />
            </div>
            <div>
              <label htmlFor="food-unit" className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Unit
                {foodInput && (
                  <span className="ml-2 text-xs text-blue-600">
                    ({unitOptions.length} options available)
                    {availableUnits.length > 0 && (
                      <span className="ml-1 text-green-600">
                        • Database units
                        {availableUnits.some(unit => unit.value === 'can' || unit.value === 'bottle') && (
                          <span className="ml-1">• Drink units</span>
                        )}
                        {availableUnits.some(unit => !unit.isWeight && unit.value !== 'can' && unit.value !== 'bottle') && (
                          <span className="ml-1">• Piece-based</span>
                        )}
                      </span>
                    )}
                  </span>
                )}
              </label>
              <select
                id="food-unit"
                name="unit"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onFocus={() => {
                  if (!isAuthenticated) {
                    setIsLoginModalOpen(true);
                  }
                }}
              >
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.description || `${option.label} - ${option.description || 'Available unit'}`}
                  </option>
                ))}
              </select>
              {foodInput && (
                <div className="mt-1 text-xs text-gray-500">
                  {availableUnits.length > 0 ? 
                    `📊 Database units from serving size: ${selectedFoodData?.serving || 'N/A'}` + 
                    (availableUnits.some(unit => unit.value === 'can' || unit.value === 'bottle') ? ' • 🥤 Drink units (can/bottle)' : '') +
                    (availableUnits.some(unit => !unit.isWeight && unit.value !== 'can' && unit.value !== 'bottle') ? ' • 🥚 Piece-based units' : '') : 
                    (getFilteredUnitOptions(foodInput).some(opt => opt.category === 'liquid') ? 
                      '💧 Liquid units available' : 
                      '🍎 Solid units available')
                  }
                </div>
              )}
            </div>
          </div>

          {/* Add Button */}
          <div className="flex gap-2">
            <Button 
              onClick={addFoodToMeal} 
              disabled={!foodInput.trim() || amount === '' || amount <= 0}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Food
            </Button>
          </div>
          
          {/* Log Message */}
          {logMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              logMessage.includes('✅') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {logMessage}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => (
              <Button
                key={meal}
                variant={selectedMeal === meal ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (!isAuthenticated) {
                    setIsLoginModalOpen(true);
                    return;
                  }
                  setSelectedMeal(meal);
                }}
                className="capitalize text-xs sm:text-sm"
              >
                {meal}
              </Button>
            ))}
          </div>

        </div>
      </Card>

      {/* Meals List */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          Today's Meals
        </h3>

        {meals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No meals logged yet. Start by adding some food!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meals.map((meal) => (
              <div key={meal.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium capitalize">{meal.name}</h4>
                    <Badge variant="secondary">{meal.time}</Badge>
                  </div>
                  <div className="text-sm font-medium">
                    {meal.totalCalories} kcal
                  </div>
                </div>

                <div className="space-y-2">
                  {meal.foods.map((food) => (
                    <div key={food.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{food.amount} {food.unit} {food.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {food.calories} kcal
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!isAuthenticated) {
                            setIsLoginModalOpen(true);
                            return;
                          }
                          removeFood(meal.id, food.id);
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Protein: {Math.round(meal.totalProtein)}g</span>
                    <span>Carbs: {Math.round(meal.totalCarbs)}g</span>
                    <span>Fat: {Math.round(meal.totalFat)}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Daily Summary */}
      {meals.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Daily Summary
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-primary">{dailyTotals.calories}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Calories Consumed</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{Math.round(dailyTotals.protein)}g</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Protein</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{Math.round(dailyTotals.carbs)}g</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Carbs</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{Math.round(dailyTotals.fat)}g</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Fat</div>
            </div>
          </div>

          {caloriesBurned > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{caloriesBurned}</div>
                </div>
                <div className="text-xs sm:text-sm text-green-700 dark:text-green-300">Calories Burned</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{dailyGoal.calories}</div>
                <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">Base Goal</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">{adjustedCalorieGoal}</div>
                <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">Adjusted Goal</div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">(Base + Exercise)</div>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {dailyTotals.calories >= adjustedCalorieGoal 
                  ? "You've reached your adjusted daily calorie goal!" 
                  : `You have ${adjustedCalorieGoal - dailyTotals.calories} calories left for today.`
                }
                {caloriesBurned > 0 && (
                  <span className="block mt-1 text-xs">
                    (Base goal: {dailyGoal.calories} + {caloriesBurned} from exercise = {adjustedCalorieGoal})
                  </span>
                )}
              </span>
            </div>
          </div>
        </Card>
      )}
      </>
      )}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History Header */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <History className="h-6 w-6" />
                Meal History
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={isLoadingHistory}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No meal history yet. Start logging meals to see your history!</p>
              </div>
            ) : (
              <>
                {/* Selected Date Meals Detail */}
                {selectedDate && (
                  <Card className="p-6 mb-6 border-2 border-primary">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold">{formatDate(selectedDate)}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDate(null);
                          setSelectedDateMeals([]);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedDateMeals.length > 0 ? (
                      <div className="space-y-4">
                        {selectedDateMeals.map((meal) => (
                          <div key={meal.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium capitalize">{meal.name}</h4>
                                <Badge variant="secondary">{meal.time}</Badge>
                              </div>
                              <div className="text-sm font-medium">{meal.totalCalories} kcal</div>
                            </div>
                            <div className="space-y-2">
                              {meal.foods.map((food) => (
                                <div key={food.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                                  <span className="text-sm">{food.amount} {food.unit} {food.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {food.calories} kcal
                                  </Badge>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Protein: {Math.round(meal.totalProtein)}g</span>
                                <span>Carbs: {Math.round(meal.totalCarbs)}g</span>
                                <span>Fat: {Math.round(meal.totalFat)}g</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="font-semibold text-primary">Total Calories</div>
                              <div className="text-lg">{selectedDateMeals.reduce((sum, m) => sum + m.totalCalories, 0)}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-blue-600">Protein</div>
                              <div className="text-lg">{Math.round(selectedDateMeals.reduce((sum, m) => sum + m.totalProtein, 0))}g</div>
                            </div>
                            <div>
                              <div className="font-semibold text-green-600">Carbs</div>
                              <div className="text-lg">{Math.round(selectedDateMeals.reduce((sum, m) => sum + m.totalCarbs, 0))}g</div>
                            </div>
                            <div>
                              <div className="font-semibold text-orange-600">Fat</div>
                              <div className="text-lg">{Math.round(selectedDateMeals.reduce((sum, m) => sum + m.totalFat, 0))}g</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>No meals found for this date.</p>
                      </div>
                    )}
                  </Card>
                )}

                {/* History List */}
                <div className="space-y-2">
                  {history.map((item) => (
                    <Card
                      key={item.date}
                      className={`p-4 cursor-pointer hover:shadow-md transition-all relative ${
                        selectedDate === item.date ? 'border-2 border-primary' : ''
                      }`}
                      onClick={() => loadDateMeals(item.date)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{formatDate(item.date)}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.mealsCount} meal{item.mealsCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">{item.totalCalories} kcal</div>
                            <div className="text-xs text-muted-foreground">
                              P: {item.totalProtein}g | C: {item.totalCarbs}g | F: {item.totalFat}g
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
      
      <AuthModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode="login"
        onModeChange={(mode) => {
          // Keep it in login mode when opened from buttons
        }}
      />
    </div>
  );
};

export default CalorieTracker;
