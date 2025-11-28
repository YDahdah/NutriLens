import { FoodService, FoodItem, SearchFilters } from './FoodService';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'food_suggestion' | 'meal_plan' | 'nutrition_analysis' | 'recipe' | 'progress_update';
  metadata?: {
    foodItems?: FoodItem[];
    calories?: number;
    macros?: MacroNutrients;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipes?: Recipe[];
    progress?: ProgressData;
  };
}

export interface MacroNutrients {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface UserProfile {
  age?: number;
  weight?: number;
  height?: number;
  gender?: 'male' | 'female' | 'other';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goals?: string[];
  dietaryRestrictions?: string[];
  allergies?: string[];
  preferences?: {
    cuisine?: string[];
    dislikedFoods?: string[];
    mealFrequency?: number;
  };
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: { food: FoodItem; amount: number; unit: string }[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  calories: number;
  macros: MacroNutrients;
  tags: string[];
  imageUrl?: string;
}

export interface ProgressData {
  caloriesConsumed: number;
  caloriesGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  waterConsumed: number;
  waterGoal: number;
  mealsLogged: number;
  streak: number;
}

export class AIService {
  private static instance: AIService;
  private foodService: FoodService;
  private conversationHistory: Message[] = [];
  private userProfile: UserProfile = {};

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  constructor() {
    this.foodService = FoodService.getInstance();
  }

  async generateResponse(userMessage: string, profile: UserProfile): Promise<Message> {
    this.userProfile = profile;
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const response = this.processUserInput(userMessage);
    
    const message: Message = {
      id: Date.now().toString(),
      content: response.content,
      role: 'assistant',
      timestamp: new Date(),
      type: response.type,
      metadata: response.metadata
    };

    this.conversationHistory.push(message);
    return message;
  }

  private processUserInput(input: string): { content: string; type: Message['type']; metadata?: any } {
    const normalized = input.toLowerCase().trim();
    
    // Cooking questions (highest priority)
    if (this.isCookingQuestion(normalized)) {
      return this.handleCookingQuestion(input);
    }
    
    // Food logging patterns
    if (this.isFoodLogging(normalized)) {
      return this.handleFoodLogging(input);
    }
    
    // Meal planning
    if (this.isMealPlanning(normalized)) {
      return this.handleMealPlanning(input);
    }
    
    // Nutrition questions
    if (this.isNutritionQuestion(normalized)) {
      return this.handleNutritionQuestion(input);
    }
    
    // Recipe requests
    if (this.isRecipeRequest(normalized)) {
      return this.handleRecipeRequest(input);
    }
    
    // Progress tracking
    if (this.isProgressRequest(normalized)) {
      return this.handleProgressRequest(input);
    }
    
    // General food advice
    if (this.isGeneralAdvice(normalized)) {
      return this.handleGeneralAdvice(input);
    }
    
    // Default response
    return this.handleDefault(input);
  }

  private isCookingQuestion(input: string): boolean {
    const patterns = [
      /how much.*cook/,
      /how long.*cook/,
      /how.*cook/,
      /cooking.*time/,
      /cook.*for/,
      /needs.*cook/,
      /should.*cook/,
      /cooking.*instructions/,
      /how.*prepare/,
      /preparation.*time/,
      /cooking.*method/,
      /how.*make/,
      /cooking.*tips/,
      /cook.*rice/,
      /cook.*pasta/,
      /cook.*chicken/,
      /cook.*beef/,
      /cook.*fish/,
      /cook.*vegetables/,
      /cook.*eggs/,
      /boil.*water/,
      /simmer/,
      /fry/,
      /bake/,
      /roast/,
      /grill/,
      /steam/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isFoodLogging(input: string): boolean {
    const patterns = [
      /i (ate|had|consumed|logged)/,
      /add.*to.*meal/,
      /log.*food/,
      /track.*calories/,
      /just.*ate/,
      /for (breakfast|lunch|dinner|snack)/,
      /i'm eating/,
      /had for/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isMealPlanning(input: string): boolean {
    const patterns = [
      /meal plan/,
      /what.*should.*eat/,
      /suggest.*meal/,
      /dinner.*ideas/,
      /breakfast.*recommend/,
      /healthy.*recipe/,
      /plan.*meals/,
      /menu.*suggest/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isNutritionQuestion(input: string): boolean {
    const patterns = [
      /how many calories/,
      /nutrition.*info/,
      /protein.*content/,
      /carbs.*in/,
      /is.*healthy/,
      /nutritional.*value/,
      /macro.*content/,
      /vitamin.*content/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isRecipeRequest(input: string): boolean {
    const patterns = [
      /recipe.*for/,
      /give.*recipe/,
      /show.*recipe/,
      /recipe.*instructions/,
      /ingredients.*for/,
      /how.*make.*recipe/,
      /cooking.*recipe/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isProgressRequest(input: string): boolean {
    const patterns = [
      /my progress/,
      /how.*doing/,
      /calorie.*count/,
      /daily.*summary/,
      /tracking.*status/,
      /goal.*progress/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isGeneralAdvice(input: string): boolean {
    const patterns = [
      /how.*lose.*weight/,
      /how.*gain.*weight/,
      /healthy.*eating/,
      /diet.*tips/,
      /what.*avoid/,
      /best.*foods/,
      /nutrition.*advice/,
      /eating.*habits/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private handleCookingQuestion(input: string): { content: string; type: Message['type']; metadata?: any } {
    const normalized = input.toLowerCase();
    
    // Rice cooking questions
    if (normalized.includes('rice')) {
      return {
        content: `**🍚 How to Cook Rice:**\n\n**Water Ratio:** 1.5-2 cups water per 1 cup rice\n**Cooking Time:** 15-20 minutes\n**Method:**\n1. Rinse rice until water runs clear\n2. Add rice and water to pot (1.5-2 cups water per 1 cup rice)\n3. Bring to boil, then reduce heat to low\n4. Cover and simmer for 15-20 minutes\n5. Remove from heat and let stand 5 minutes\n6. Fluff with fork before serving\n\n**Tips:**\n• Don't lift the lid while cooking\n• Let it rest after cooking for better texture\n• For brown rice: use 2 cups water and cook 40-45 minutes`,
        type: 'text'
      };
    }
    
    // Pasta cooking questions
    if (normalized.includes('pasta')) {
      return {
        content: `**🍝 How to Cook Pasta:**\n\n**Water:** 4-6 quarts water per pound of pasta\n**Salt:** 1-2 tablespoons salt per quart of water\n**Cooking Time:** 8-12 minutes (check package)\n**Method:**\n1. Bring large pot of salted water to rolling boil\n2. Add pasta and stir immediately\n3. Cook according to package directions\n4. Test 1-2 minutes before suggested time\n5. Reserve 1 cup pasta water before draining\n6. Drain and serve immediately\n\n**Tips:**\n• Use plenty of water (4-6 quarts per pound)\n• Salt the water generously\n• Don't add oil to the water\n• Save pasta water for sauces`,
        type: 'text'
      };
    }
    
    // Chicken cooking questions
    if (normalized.includes('chicken')) {
      return {
        content: `**🍗 How to Cook Chicken:**\n\n**Breast (boneless):**\n• Pan-fry: 6-8 minutes per side\n• Bake: 20-25 minutes at 400°F\n• Internal temp: 165°F\n\n**Thighs (bone-in):**\n• Pan-fry: 8-10 minutes per side\n• Bake: 35-40 minutes at 400°F\n• Internal temp: 165°F\n\n**Whole Chicken:**\n• Roast: 20 minutes per pound at 350°F\n• Internal temp: 165°F in thickest part\n\n**Tips:**\n• Always check internal temperature\n• Let rest 5-10 minutes before cutting\n• Don't overcook or it will be dry`,
        type: 'text'
      };
    }
    
    // General cooking question
    return {
      content: `**👨‍🍳 Cooking Help:**\n\nI can help you with cooking instructions for:\n\n• **Rice** - Water ratios and cooking times\n• **Pasta** - Boiling techniques and timing\n• **Chicken** - Different cuts and cooking methods\n• **Beef** - Steaks, roasts, and ground beef\n• **Fish** - Pan-frying, baking, and grilling\n• **Vegetables** - Steaming, roasting, and sautéing\n• **Eggs** - Scrambled, fried, boiled, and poached\n\nWhat specific food would you like cooking help with?`,
      type: 'text'
    };
  }

  private handleFoodLogging(input: string): { content: string; type: Message['type']; metadata?: any } {
    const suggestions = this.extractFoodSuggestions(input);
    
    if (suggestions.length === 0) {
      return {
        content: "I'd love to help you log your food! Could you tell me what you ate? For example:\n\n• \"I had chicken and rice for lunch\"\n• \"I ate an apple and some almonds\"\n• \"I logged a protein smoothie\"\n\nWhat did you have?",
        type: 'text'
      };
    }

    const foodItems = suggestions.map(suggestion => 
      this.foodService.getFoodById(suggestion.id) || suggestion
    ).filter(Boolean);

    const totalNutrition = this.foodService.calculateNutrition(
      foodItems.map(food => ({ food, quantity: 100 }))
    );

    return {
      content: `Great! I found these foods for you:\n\n${foodItems.map(food => 
        `• **${food.name}** - ${food.calories} cal, ${food.protein}g protein, ${food.carbs}g carbs, ${food.fat}g fat`
      ).join('\n')}\n\n**Total:** ${Math.round(totalNutrition.calories)} calories, ${Math.round(totalNutrition.protein)}g protein\n\nWould you like me to add these to your daily log?`,
      type: 'food_suggestion',
      metadata: { 
        foodItems,
        calories: Math.round(totalNutrition.calories),
        macros: totalNutrition
      }
    };
  }

  private handleMealPlanning(input: string): { content: string; type: Message['type']; metadata?: any } {
    const mealType = this.extractMealType(input) || 'breakfast';
    const suggestions = this.foodService.generateMealSuggestions(mealType, {
      maxCalories: 500,
      dietaryRestrictions: this.userProfile.dietaryRestrictions,
      allergens: this.userProfile.allergies
    });

    const mealPlan = this.generateMealPlan(mealType, suggestions);

    return {
      content: `Here's a balanced ${mealType} plan for you:\n\n${mealPlan}`,
      type: 'meal_plan',
      metadata: { 
        mealType,
        foodItems: suggestions.slice(0, 5)
      }
    };
  }

  private handleNutritionQuestion(input: string): { content: string; type: Message['type']; metadata?: any } {
    const foodName = this.extractFoodName(input);
    
    if (foodName) {
      const foods = this.foodService.searchFoods(foodName);
      
      if (foods.length > 0) {
        const food = foods[0];
        return {
          content: `**${food.name}** Nutrition Facts (per ${food.serving}):\n\n• **Calories:** ${food.calories}\n• **Protein:** ${food.protein}g\n• **Carbs:** ${food.carbs}g\n• **Fat:** ${food.fat}g\n• **Fiber:** ${food.fiber}g\n• **Sugar:** ${food.sugar}g\n• **Sodium:** ${food.sodium}mg\n\n${food.tags ? `**Tags:** ${food.tags.join(', ')}` : ''}`,
          type: 'nutrition_analysis',
          metadata: { foodItems: [food] }
        };
      }
    }

    return {
      content: "I'd be happy to provide nutrition information! Which specific food or ingredient are you asking about?",
      type: 'text'
    };
  }

  private handleRecipeRequest(input: string): { content: string; type: Message['type']; metadata?: any } {
    const recipes = this.generateRecipes(input);
    
    return {
      content: `Here are some recipe ideas for you:\n\n${recipes.map(recipe => 
        `**${recipe.name}**\n${recipe.description}\n⏱️ ${recipe.prepTime + recipe.cookTime} min | 🍽️ ${recipe.servings} servings | 🔥 ${recipe.calories} cal\n\n`
      ).join('')}Would you like detailed instructions for any of these?`,
      type: 'recipe',
      metadata: { recipes }
    };
  }

  private handleProgressRequest(input: string): { content: string; type: Message['type']; metadata?: any } {
    const progress = this.generateProgressData();
    
    return {
      content: `Here's your daily progress:\n\n📊 **Calories:** ${progress.caloriesConsumed}/${progress.caloriesGoal} (${Math.round(progress.caloriesConsumed/progress.caloriesGoal*100)}%)\n🥩 **Protein:** ${progress.proteinConsumed}g/${progress.proteinGoal}g\n💧 **Water:** ${progress.waterConsumed}/${progress.waterGoal} glasses\n🍽️ **Meals:** ${progress.mealsLogged}\n🔥 **Streak:** ${progress.streak} days\n\n${this.getProgressMessage(progress)}`,
      type: 'progress_update',
      metadata: { progress }
    };
  }

  private handleGeneralAdvice(input: string): { content: string; type: Message['type']; metadata?: any } {
    const advice = this.getGeneralAdvice(input);
    return {
      content: advice,
      type: 'text'
    };
  }

  private handleDefault(input: string): { content: string; type: Message['type']; metadata?: any } {
    return {
      content: "I'm your personal nutrition assistant! I can help you with:\n\n• 🍎 **Food Logging** - Track what you eat\n• 📋 **Meal Planning** - Get personalized meal suggestions\n• 📊 **Nutrition Analysis** - Learn about food nutrition\n• 🍳 **Recipes** - Discover healthy recipes\n• 📈 **Progress Tracking** - Monitor your daily goals\n• 💡 **Healthy Tips** - Get personalized advice\n\nWhat would you like to know?",
      type: 'text'
    };
  }

  private extractFoodSuggestions(input: string): FoodItem[] {
    const words = input.toLowerCase().split(/\s+/);
    const suggestions: FoodItem[] = [];
    
    // Look for common food keywords
    const foodKeywords = [
      'chicken', 'rice', 'broccoli', 'salmon', 'eggs', 'oats', 'banana', 'apple',
      'yogurt', 'cheese', 'bread', 'pasta', 'quinoa', 'avocado', 'spinach',
      'almonds', 'walnuts', 'smoothie', 'salad', 'soup', 'pizza', 'burger'
    ];
    
    for (const keyword of foodKeywords) {
      if (words.some(word => word.includes(keyword))) {
        const foods = this.foodService.searchFoods(keyword);
        suggestions.push(...foods.slice(0, 2));
      }
    }
    
    return suggestions.slice(0, 5);
  }

  private extractMealType(input: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' | null {
    if (input.includes('breakfast')) return 'breakfast';
    if (input.includes('lunch')) return 'lunch';
    if (input.includes('dinner')) return 'dinner';
    if (input.includes('snack')) return 'snack';
    return null;
  }

  private extractFoodName(input: string): string | null {
    const patterns = [
      /nutrition.*of\s+(.+)/,
      /calories.*in\s+(.+)/,
      /protein.*in\s+(.+)/,
      /carbs.*in\s+(.+)/,
      /is\s+(.+)\s+healthy/,
      /tell.*about\s+(.+)/
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1].trim();
    }
    
    return null;
  }

  private generateMealPlan(mealType: string, suggestions: FoodItem[]): string {
    const mealPlans = {
      breakfast: `**🌅 Breakfast Options:**\n\n• **Oatmeal Bowl** - Oats with berries and nuts (450 cal)\n• **Protein Smoothie** - Greek yogurt, banana, and protein powder (380 cal)\n• **Avocado Toast** - Whole grain bread with avocado and eggs (420 cal)\n• **Greek Yogurt Parfait** - Yogurt with granola and fruit (350 cal)`,
      lunch: `**🌞 Lunch Options:**\n\n• **Grilled Chicken Salad** - Mixed greens with chicken and quinoa (520 cal)\n• **Salmon Bowl** - Salmon with brown rice and vegetables (580 cal)\n• **Turkey Wrap** - Whole wheat wrap with turkey and vegetables (450 cal)\n• **Lentil Soup** - Hearty soup with vegetables and bread (400 cal)`,
      dinner: `**🌙 Dinner Options:**\n\n• **Baked Salmon** - Salmon with roasted vegetables (600 cal)\n• **Chicken Stir-fry** - Chicken with mixed vegetables and rice (550 cal)\n• **Quinoa Bowl** - Quinoa with beans and vegetables (480 cal)\n• **Pasta Primavera** - Whole wheat pasta with vegetables (520 cal)`,
      snack: `**🍎 Snack Options:**\n\n• **Apple with Almonds** - Fresh apple with a handful of almonds (200 cal)\n• **Greek Yogurt** - Plain yogurt with honey and berries (150 cal)\n• **Hummus with Veggies** - Hummus with carrot and cucumber sticks (180 cal)\n• **Trail Mix** - Nuts, seeds, and dried fruit (220 cal)`
    };
    
    return mealPlans[mealType as keyof typeof mealPlans] || mealPlans.breakfast;
  }

  private generateRecipes(input: string): Recipe[] {
    return [
      {
        id: '1',
        name: 'Mediterranean Quinoa Bowl',
        description: 'A healthy and colorful bowl with quinoa, vegetables, and feta cheese',
        ingredients: [
          { food: this.foodService.getFoodById('32')!, amount: 1, unit: 'cup' },
          { food: this.foodService.getFoodById('14')!, amount: 2, unit: 'medium' },
          { food: this.foodService.getFoodById('6')!, amount: 1, unit: 'medium' },
          { food: this.foodService.getFoodById('40')!, amount: 50, unit: 'g' }
        ],
        instructions: [
          'Cook quinoa according to package instructions',
          'Dice tomatoes and avocado',
          'Mix quinoa with vegetables',
          'Top with crumbled feta cheese',
          'Drizzle with olive oil and lemon juice'
        ],
        prepTime: 15,
        cookTime: 20,
        servings: 2,
        calories: 450,
        macros: { protein: 15, carbs: 45, fat: 20, fiber: 8, sugar: 5, sodium: 300 },
        tags: ['mediterranean', 'vegetarian', 'healthy', 'colorful']
      },
      {
        id: '2',
        name: 'Protein Power Smoothie',
        description: 'A nutrient-dense smoothie perfect for post-workout recovery',
        ingredients: [
          { food: this.foodService.getFoodById('25')!, amount: 1, unit: 'cup' },
          { food: this.foodService.getFoodById('2')!, amount: 1, unit: 'medium' },
          { food: this.foodService.getFoodById('44')!, amount: 30, unit: 'g' },
          { food: this.foodService.getFoodById('51')!, amount: 1, unit: 'cup' }
        ],
        instructions: [
          'Add all ingredients to blender',
          'Blend on high for 60 seconds',
          'Add ice if desired consistency',
          'Pour into glass and enjoy immediately'
        ],
        prepTime: 5,
        cookTime: 0,
        servings: 1,
        calories: 380,
        macros: { protein: 25, carbs: 35, fat: 15, fiber: 8, sugar: 20, sodium: 50 },
        tags: ['smoothie', 'protein', 'post-workout', 'quick']
      }
    ];
  }

  private generateProgressData(): ProgressData {
    return {
      caloriesConsumed: 1450,
      caloriesGoal: 2000,
      proteinConsumed: 85,
      proteinGoal: 120,
      waterConsumed: 6,
      waterGoal: 8,
      mealsLogged: 3,
      streak: 7
    };
  }

  private getProgressMessage(progress: ProgressData): string {
    const caloriePercent = Math.round(progress.caloriesConsumed / progress.caloriesGoal * 100);
    const proteinPercent = Math.round(progress.proteinConsumed / progress.proteinGoal * 100);
    
    if (caloriePercent >= 90 && proteinPercent >= 80) {
      return "🎉 Excellent work! You're on track to meet your goals today!";
    } else if (caloriePercent >= 70) {
      return "👍 Good progress! Keep it up!";
    } else {
      return "💪 You've got this! Try to add some healthy snacks to reach your goals.";
    }
  }

  private getGeneralAdvice(input: string): string {
    const advice = [
      "🥗 **Eat the rainbow!** Include colorful fruits and vegetables in every meal for a variety of nutrients.",
      "💧 **Stay hydrated!** Aim for 8 glasses of water daily. Your body needs proper hydration for optimal function.",
      "🍽️ **Portion control matters!** Use smaller plates and listen to your hunger cues to avoid overeating.",
      "⏰ **Eat regularly!** Don't skip meals. Regular eating helps maintain stable blood sugar and energy levels.",
      "🥩 **Include protein!** Aim for 20-30g of protein per meal to support muscle health and satiety.",
      "🌾 **Choose whole grains!** Opt for brown rice, quinoa, and whole wheat over refined grains for better nutrition.",
      "🥜 **Healthy fats are essential!** Include nuts, seeds, avocado, and olive oil in your diet for heart health.",
      "🍎 **Plan ahead!** Meal prep on weekends to make healthy eating easier during busy weekdays."
    ];
    
    return advice[Math.floor(Math.random() * advice.length)];
  }
}

export default AIService;
