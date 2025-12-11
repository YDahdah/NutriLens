/**
 * FoodInput Component - Handles food search and input
 * Extracted from CalorieTracker for better code organization
 */
import React, { memo } from 'react';
import { MEAL_TYPES } from '@/config/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FoodUnit } from '@/types';

interface FoodInputProps {
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
  isAddingFood: boolean;
}

export const FoodInput: React.FC<FoodInputProps> = memo(({
  foodInput,
  onFoodInputChange,
  amount,
  onAmountChange,
  selectedUnit,
  onUnitChange,
  selectedMeal,
  onMealSelect,
  onAddFood,
  suggestions,
  showSuggestions,
  isLoading,
  onFoodSelect,
  availableUnits,
  isAuthenticated,
  onLoginRequired,
  isAddingFood,
}) => {
  const mealOptions = MEAL_TYPES.map(meal => ({
    value: meal,
    label: meal.charAt(0).toUpperCase() + meal.slice(1)
  }));

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Food Name Input */}
      <div className="relative">
        <Label htmlFor="food-name" className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
          Food Name
        </Label>
        <Input
          id="food-name"
          name="foodName"
          value={foodInput}
          onChange={(e) => onFoodInputChange(e.target.value)}
          placeholder="e.g., eggs, chicken, rice, apple"
          className="w-full"
          aria-label="Search for food to add"
          aria-describedby="food-name-help"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              if (!isAuthenticated) {
                onLoginRequired();
                return;
              }
              onAddFood();
            }
          }}
          onFocus={() => {
            if (!isAuthenticated) {
              onLoginRequired();
              return;
            }
            if (foodInput.length >= 2 && suggestions.length > 0) {
              // Suggestions shown via showSuggestions prop
            }
          }}
          onBlur={() => setTimeout(() => {
            // Handle blur via parent
          }, 200)}
          autoComplete="off"
          spellCheck={false}
        />
        
        {/* Food Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                Searching...
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  onClick={() => onFoodSelect(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none text-sm"
                  aria-label={`Select ${suggestion}`}
                >
                  {suggestion}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No foods found for "{foodInput}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Amount and Unit Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label htmlFor="food-amount" className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
            Amount
          </Label>
          <Input
            id="food-amount"
            name="amount"
            type="number"
            value={amount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                onAmountChange('');
                return;
              }
              const numValue = parseFloat(value);
              if (!isNaN(numValue) && numValue > 0) {
                onAmountChange(numValue);
              }
            }}
            min="0.1"
            step="0.1"
            placeholder="Enter amount"
            className="w-full"
            aria-label="Food amount"
            onFocus={() => {
              if (!isAuthenticated) {
                onLoginRequired();
              }
            }}
          />
        </div>
        <div>
          <Label htmlFor="food-unit" className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
            Unit
          </Label>
          <Select value={selectedUnit} onValueChange={onUnitChange}>
            <SelectTrigger id="food-unit" aria-label="Food unit">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.length > 0 ? (
                availableUnits.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="g">g</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Meal Selection */}
      <div>
        <Label htmlFor="meal-select" className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">
          Meal
        </Label>
        <Select value={selectedMeal} onValueChange={onMealSelect}>
          <SelectTrigger id="meal-select" aria-label="Select meal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mealOptions.map((meal) => (
              <SelectItem key={meal.value} value={meal.value}>
                {meal.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add Food Button */}
      <Button
        onClick={onAddFood}
        disabled={!foodInput.trim() || !amount || isAddingFood || !isAuthenticated}
        className="w-full"
        aria-label="Add food to meal"
      >
        {isAddingFood ? 'Adding...' : 'Add Food'}
      </Button>
    </div>
  );
});

FoodInput.displayName = 'FoodInput';

