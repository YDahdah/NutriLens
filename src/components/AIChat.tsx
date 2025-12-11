import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Plus,
  Trash2, 
  RefreshCw,
  Sparkles,
  Utensils,
  Zap,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DatabaseService } from '@/services/DatabaseService';
import AuthModal from './AuthModal';
import { apiClient } from '@/utils/apiClient';
import ReactMarkdown from 'react-markdown';
import { STORAGE_KEYS } from '@/config/constants';
import { logger } from '@/utils/logger';
import { AppError, ErrorCode } from '@/utils/errors';

// Enhanced types for comprehensive food assistant
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface UserPreferences {
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  dislikedIngredients: string[];
  mealGoals: string[];
  allergies: string[];
  personality: 'casual' | 'professional' | 'enthusiastic' | 'scientific' | 'friendly';
  cookingLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  healthConditions: string[];
  fitnessGoals: string[];
  budget: 'low' | 'medium' | 'high' | 'premium';
  timeConstraints: 'quick' | 'moderate' | 'flexible' | 'extensive';
  flavorPreferences: string[];
  texturePreferences: string[];
  spiceLevel: 'mild' | 'medium' | 'hot' | 'extreme';
  culturalBackground: string[];
  lifestyle: 'sedentary' | 'active' | 'athletic' | 'professional';
  ageGroup: 'child' | 'teen' | 'adult' | 'senior';
  gender: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active';
}

interface Recipe {
  name: string;
  cuisine: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prepTime: string;
  cookTime: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  dietaryTags: string[];
}

// Comprehensive Food & Nutrition AI Service
class NutritionAIService {
  private static instance: NutritionAIService;
  private databaseService: DatabaseService;
  private userPreferences: UserPreferences;
  private conversationHistory: Message[];
  private conversationContext: {
    lastFood?: string;
    lastQuestionType?: string;
    lastResponse?: string;
    userMood?: 'positive' | 'neutral' | 'negative';
    conversationFlow?: string[];
    userPersonality?: 'casual' | 'professional' | 'enthusiastic' | 'scientific' | 'friendly';
    emotionalState?: 'excited' | 'frustrated' | 'curious' | 'confused' | 'satisfied' | 'disappointed';
    conversationDepth?: 'surface' | 'moderate' | 'deep';
    userExpertise?: 'novice' | 'intermediate' | 'expert';
    lastInteractionTime?: Date;
    conversationStreak?: number;
    favoriteTopics?: string[];
    learningProgress?: { [topic: string]: number };
  } = {};

  constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.userPreferences = {
      dietaryRestrictions: [],
      favoriteCuisines: [],
      dislikedIngredients: [],
      mealGoals: [],
      allergies: [],
      personality: 'friendly',
      cookingLevel: 'intermediate',
      healthConditions: [],
      fitnessGoals: [],
      budget: 'medium',
      timeConstraints: 'moderate',
      flavorPreferences: [],
      texturePreferences: [],
      spiceLevel: 'medium',
      culturalBackground: ['general'],
      lifestyle: 'active',
      ageGroup: 'adult',
      gender: 'prefer-not-to-say',
      weight: 0,
      height: 0,
      activityLevel: 'moderately-active'
    };
    this.conversationHistory = [];
  }

  static getInstance(): NutritionAIService {
    if (!NutritionAIService.instance) {
      NutritionAIService.instance = new NutritionAIService();
    }
    return NutritionAIService.instance;
  }

  async generateResponse(userMessage: string): Promise<Message> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    // Add user message to conversation history
    const userMsg: Message = {
      id: Date.now().toString(),
      content: userMessage,
      role: 'user',
      timestamp: new Date()
    };
    this.conversationHistory.push(userMsg);

    const response = await this.processUserInput(userMessage);
    
    // Update conversation context
    this.updateConversationContext(userMessage, response);
    
    const assistantMsg: Message = {
      id: Date.now().toString(),
      content: response,
      role: 'assistant',
      timestamp: new Date()
    };
    
    // Add assistant response to conversation history
    this.conversationHistory.push(assistantMsg);
    
    return assistantMsg;
  }

  // Update conversation context for smarter responses
  private updateConversationContext(input: string, response: string): void {
    // Extract food name from input using comprehensive database
    const foodDatabase = this.getComprehensiveFoodDatabase();
    const foodMatch = input.match(new RegExp(`\\b(${foodDatabase.join('|')})\\b`, 'i'));
    
    if (foodMatch) {
      this.conversationContext.lastFood = foodMatch[1].toLowerCase();
    }
    
    // Advanced emotional intelligence analysis
    this.analyzeEmotionalState(input);
    
    // Detect user personality and expertise level
    this.analyzeUserPersonality(input);
    
    // Track conversation depth and learning progress
    this.trackConversationDepth(input);
    
    // Update conversation flow
    if (!this.conversationContext.conversationFlow) {
      this.conversationContext.conversationFlow = [];
    }
    
    const questionType = this.detectQuestionType(input);
    this.conversationContext.lastQuestionType = questionType;
    this.conversationContext.conversationFlow.push(questionType);
    
    // Keep only last 10 conversation types
    if (this.conversationContext.conversationFlow.length > 10) {
      this.conversationContext.conversationFlow = this.conversationContext.conversationFlow.slice(-10);
    }
    
    // Update conversation streak
    this.conversationContext.conversationStreak = (this.conversationContext.conversationStreak || 0) + 1;
    this.conversationContext.lastInteractionTime = new Date();
  }

  // Advanced emotional intelligence analysis
  private analyzeEmotionalState(input: string): void {
    const inputLower = input.toLowerCase();
    
    // Emotional indicators
    const emotionalIndicators = {
      excited: ['excited', 'amazing', 'wow', 'fantastic', 'incredible', 'love', 'adore', 'obsessed', 'can\'t wait', 'so good'],
      frustrated: ['frustrated', 'annoying', 'hate', 'terrible', 'awful', 'stupid', 'dumb', 'wrong', 'incorrect', 'bad', 'sucks'],
      curious: ['curious', 'wonder', 'why', 'how', 'what', 'tell me', 'explain', 'interesting', 'fascinating', 'learn'],
      confused: ['confused', 'don\'t understand', 'unclear', 'help', 'explain', 'what do you mean', 'lost', 'puzzled'],
      satisfied: ['thanks', 'thank you', 'perfect', 'great', 'good', 'helpful', 'exactly', 'right', 'correct', 'awesome'],
      disappointed: ['disappointed', 'sad', 'upset', 'not what I expected', 'let down', 'unhappy', 'displeased']
    };
    
    for (const [emotion, indicators] of Object.entries(emotionalIndicators)) {
      if (indicators.some(indicator => inputLower.includes(indicator))) {
        this.conversationContext.emotionalState = emotion as any;
        break;
      }
    }
    
    // Mood detection (simplified)
    const positiveWords = ['thanks', 'thank you', 'great', 'awesome', 'perfect', 'love', 'amazing', 'excellent', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'wrong', 'incorrect', 'stupid', 'dumb'];
    
    if (positiveWords.some(word => inputLower.includes(word))) {
      this.conversationContext.userMood = 'positive';
    } else if (negativeWords.some(word => inputLower.includes(word))) {
      this.conversationContext.userMood = 'negative';
    } else {
      this.conversationContext.userMood = 'neutral';
    }
  }

  // Analyze user personality and expertise level
  private analyzeUserPersonality(input: string): void {
    const inputLower = input.toLowerCase();
    
    // Personality indicators
    const personalityIndicators = {
      casual: ['hey', 'hi', 'what\'s up', 'cool', 'awesome', 'yeah', 'sure', 'ok', 'alright'],
      professional: ['please', 'thank you', 'would you', 'could you', 'may I', 'respectfully', 'sir', 'madam'],
      enthusiastic: ['love', 'amazing', 'fantastic', 'incredible', 'wow', 'excited', 'can\'t wait', 'obsessed'],
      scientific: ['research', 'study', 'data', 'evidence', 'analysis', 'composition', 'molecular', 'chemical'],
      friendly: ['buddy', 'friend', 'pal', 'dear', 'sweetie', 'honey', 'darling', 'lovely']
    };
    
    for (const [personality, indicators] of Object.entries(personalityIndicators)) {
      if (indicators.some(indicator => inputLower.includes(indicator))) {
        this.conversationContext.userPersonality = personality as any;
        break;
      }
    }
    
    // Expertise level detection
    const expertiseIndicators = {
      novice: ['beginner', 'new to', 'don\'t know', 'help me', 'teach me', 'how do I', 'what is', 'simple'],
      intermediate: ['usually', 'typically', 'generally', 'sometimes', 'often', 'tend to', 'prefer'],
      expert: ['research shows', 'studies indicate', 'molecular', 'composition', 'analysis', 'technique', 'methodology']
    };
    
    for (const [level, indicators] of Object.entries(expertiseIndicators)) {
      if (indicators.some(indicator => inputLower.includes(indicator))) {
        this.conversationContext.userExpertise = level as any;
        break;
      }
    }
  }

  // Track conversation depth and learning progress
  private trackConversationDepth(input: string): void {
    const inputLower = input.toLowerCase();
    
    // Conversation depth indicators
    const depthIndicators = {
      surface: ['quick', 'fast', 'simple', 'easy', 'basic', 'just', 'only'],
      moderate: ['tell me about', 'explain', 'describe', 'what is', 'how does', 'why'],
      deep: ['analyze', 'compare', 'contrast', 'research', 'study', 'investigate', 'examine', 'evaluate']
    };
    
    for (const [depth, indicators] of Object.entries(depthIndicators)) {
      if (indicators.some(indicator => inputLower.includes(indicator))) {
        this.conversationContext.conversationDepth = depth as any;
        break;
      }
    }
    
    // Track favorite topics
    if (!this.conversationContext.favoriteTopics) {
      this.conversationContext.favoriteTopics = [];
    }
    
    const topicKeywords = ['cooking', 'nutrition', 'health', 'recipes', 'diet', 'fitness', 'weight', 'calories'];
    const mentionedTopics = topicKeywords.filter(topic => inputLower.includes(topic));
    
    mentionedTopics.forEach(topic => {
      if (!this.conversationContext.favoriteTopics!.includes(topic)) {
        this.conversationContext.favoriteTopics!.push(topic);
      }
    });
    
    // Keep only top 10 favorite topics
    if (this.conversationContext.favoriteTopics.length > 10) {
      this.conversationContext.favoriteTopics = this.conversationContext.favoriteTopics.slice(-10);
    }
  }

  private async processUserInput(input: string): Promise<string> {
    try {
      // Normalize and clean the input to handle grammar mistakes
      const normalized = this.normalizeInput(input);
      
      // Extract food name and question type
      const { foodName, questionType } = this.extractFoodAndQuestion(normalized);
      
      
      // Greeting and introduction (highest priority)
      if (this.isGreeting(normalized)) {
        return this.handleGreeting();
      }
      
      // Cooking methods and techniques (high priority)
      if (this.isCookingQuestion(normalized)) {
        return this.handleCookingQuestion(input, foodName, questionType);
      }
      
      // Nutrition questions (high priority)
      if (this.isNutritionQuestion(normalized)) {
        return await this.handleNutritionQuestion(input, foodName, questionType);
      }
      
      // Recipe suggestions and cooking
      if (this.isRecipeRequest(normalized)) {
        return this.handleRecipeRequest(input, foodName, questionType);
      }
      
      // Food comparison
      if (this.isFoodComparison(normalized)) {
        return this.handleFoodComparison(input, foodName, questionType);
      }
      
      // Health advice
      if (this.isHealthAdvice(normalized)) {
        return this.handleHealthAdvice(input);
      }
      
      // Meal planning and suggestions
      if (this.isMealPlanning(normalized)) {
        return this.handleMealPlanning(input, foodName, questionType);
      }
      
      // Cultural context and cuisine
      if (this.isCulturalQuestion(normalized)) {
        return this.handleCulturalQuestion(input, foodName, questionType);
      }
      
      // Food information
      if (this.isFoodInfo(normalized)) {
        return await this.handleFoodInfo(input, foodName);
      }
      
      // Dietary preferences and restrictions
      if (this.isDietaryPreference(normalized)) {
        return this.handleDietaryPreference(input);
      }
      
      // User preference learning
      if (this.isPreferenceLearning(normalized)) {
        return this.handlePreferenceLearning(input);
      }
      
      // CATCH-ALL: If no specific pattern matches, try to provide a helpful response
      return await this.handleIntelligentFallback(input, foodName, questionType);
      
    } catch (error) {
      logger.error('Error processing user input:', error);
      return this.handleError(input);
    }
  }

  // Enhanced text normalization to handle typos, variations, and different phrasings
  private normalizeInput(input: string): string {
    let normalized = input
      .toLowerCase()
      .trim()
      // Remove extra spaces and normalize punctuation
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Apply comprehensive typo corrections and synonym mapping
    normalized = this.applyTypoCorrections(normalized);
    normalized = this.applySynonymMapping(normalized);
    normalized = this.normalizeQuestionPhrasings(normalized);
    normalized = this.applyContextAwareNormalization(normalized);
    
    return normalized;
  }

  // Context-aware normalization for smarter understanding
  private applyContextAwareNormalization(input: string): string {
    let normalized = input;
    
    // Handle conversational patterns
    const conversationPatterns = [
      { pattern: /^(hi|hello|hey|hiya|howdy)\s*(there)?\s*$/i, replacement: 'greeting' },
      { pattern: /^(thanks?|thank you|thx|ty)\s*(so much|a lot|very much)?\s*$/i, replacement: 'thanks' },
      { pattern: /^(yes|yeah|yep|yup|sure|ok|okay|alright)\s*$/i, replacement: 'yes' },
      { pattern: /^(no|nope|nah|not really|not sure)\s*$/i, replacement: 'no' },
      { pattern: /^(help|can you help|need help|assist)\s*$/i, replacement: 'help' },
      { pattern: /^(what|how|when|where|why|which|who)\s+(is|are|was|were|do|does|did|can|could|should|would)\s+/i, replacement: 'question' }
    ];
    
    for (const { pattern, replacement } of conversationPatterns) {
      if (pattern.test(normalized)) {
        normalized = replacement;
        break;
      }
    }
    
    // Handle food-related context
    const foodContextPatterns = [
      { pattern: /(how much|how many)\s+(calories|cal|kcal)\s+(in|does|has)\s+/i, replacement: 'calories in' },
      { pattern: /(how much|how many)\s+(protein|carbs|carbohydrates|fat|fiber)\s+(in|does|has)\s+/i, replacement: 'nutrition in' },
      { pattern: /(is|are)\s+\w+\s+(healthy|good for you|bad for you|unhealthy)/i, replacement: 'health question' },
      { pattern: /(can i eat|should i eat|is it ok to eat)\s+/i, replacement: 'eating advice' },
      { pattern: /(how to cook|how to make|how to prepare)\s+/i, replacement: 'cooking method' },
      { pattern: /(recipe for|how to make|ingredients for)\s+/i, replacement: 'recipe request' }
    ];
    
    for (const { pattern, replacement } of foodContextPatterns) {
      if (pattern.test(normalized)) {
        normalized = replacement + ' ' + normalized.replace(pattern, '').trim();
        break;
      }
    }
    
    // Handle quantity and measurement context
    const quantityPatterns = [
      { pattern: /(\d+)\s*(g|gram|grams|gm|gms)\s+/g, replacement: '$1 grams ' },
      { pattern: /(\d+)\s*(ml|milliliter|milliliters|mls)\s+/g, replacement: '$1 ml ' },
      { pattern: /(\d+)\s*(oz|ounce|ounces)\s+/g, replacement: '$1 ounce ' },
      { pattern: /(\d+)\s*(cup|cups)\s+/g, replacement: '$1 cup ' },
      { pattern: /(\d+)\s*(tbsp|tablespoon|tablespoons)\s+/g, replacement: '$1 tablespoon ' },
      { pattern: /(\d+)\s*(tsp|teaspoon|teaspoons)\s+/g, replacement: '$1 teaspoon ' },
      { pattern: /(\d+)\s*(slice|slices)\s+/g, replacement: '$1 slice ' },
      { pattern: /(\d+)\s*(piece|pieces)\s+/g, replacement: '$1 piece ' }
    ];
    
    for (const { pattern, replacement } of quantityPatterns) {
      normalized = normalized.replace(pattern, replacement);
    }
    
    return normalized;
  }

  private applyTypoCorrections(input: string): string {
    const typoMap: { [key: string]: string } = {
      // Nutrition terms
      'calory': 'calories', 'calories': 'calories', 'cal': 'calories',
      'protien': 'protein', 'protean': 'protein', 'proten': 'protein',
      'carbo': 'carbs', 'carbohydrates': 'carbs', 'carbo hydrates': 'carbs',
      'vitam': 'vitamin', 'vitamins': 'vitamin',
      'miner': 'mineral', 'minerals': 'mineral',
      'fiber': 'fiber', 'fibre': 'fiber',
      'sodium': 'sodium',
      
      // Cooking terms
      'cook time': 'cooking time', 'cookin time': 'cooking time',
      'prep time': 'preparation time', 'preparation': 'prep',
      'ingredients': 'ingredients', 'ingredents': 'ingredients',
      'instructions': 'instructions', 'instrutions': 'instructions',
      'recipe': 'recipe', 'receipe': 'recipe', 'recipie': 'recipe',
      
      // Food names - common typos
      'chiken': 'chicken', 'chikn': 'chicken', 'chiken breast': 'chicken breast',
      'salmon': 'salmon', 'samon': 'salmon', 'salmom': 'salmon',
      'beef': 'beef', 'beff': 'beef', 'beef steak': 'beef',
      'pork': 'pork', 'pork chop': 'pork',
      'fish': 'fish', 'fsh': 'fish', 'fis': 'fish',
      'rice': 'rice', 'ryce': 'rice', 'white rice': 'rice',
      'pasta': 'pasta', 'past': 'pasta', 'spaghetti': 'pasta',
      'bread': 'bread', 'bred': 'bread', 'whole wheat bread': 'bread',
      'apple': 'apple', 'aple': 'apple', 'apples': 'apple',
      'banana': 'banana', 'bananna': 'banana', 'bananas': 'banana',
      'orange': 'orange', 'orng': 'orange', 'oranges': 'orange',
      'potato': 'potato', 'potatoe': 'potato', 'potatoes': 'potato',
      'tomato': 'tomato', 'tomatos': 'tomato', 'tomatoes': 'tomato',
      'onion': 'onion', 'onions': 'onion',
      'garlic': 'garlic', 'garlics': 'garlic',
      'cheese': 'cheese', 'chese': 'cheese', 'cheddar cheese': 'cheese',
      'milk': 'milk', 'mil': 'milk',
      'egg': 'egg', 'eggs': 'egg', 'eg': 'egg',
      'butter': 'butter', 'buter': 'butter',
      'oil': 'oil', 'olive oil': 'oil', 'vegetable oil': 'oil',
      'salt': 'salt', 'sal': 'salt',
      'pepper': 'pepper', 'peper': 'pepper', 'black pepper': 'pepper',
      'sugar': 'sugar', 'suger': 'sugar', 'white sugar': 'sugar',
      'flour': 'flour', 'flor': 'flour', 'white flour': 'flour',
      'water': 'water', 'wter': 'water',
      'coffee': 'coffee', 'coffe': 'coffee', 'cofee': 'coffee',
      'tea': 'tea', 'te': 'tea', 'green tea': 'tea',
      'juice': 'juice', 'juce': 'juice', 'orange juice': 'juice',
      
      // Cuisine terms
      'lebanese': 'lebanese', 'lebanon': 'lebanese', 'lebanon food': 'lebanese',
      'italian': 'italian', 'italy': 'italian', 'italy food': 'italian',
      'chinese': 'chinese', 'china': 'chinese', 'china food': 'chinese',
      'japanese': 'japanese', 'japan': 'japanese', 'japan food': 'japanese',
      'mexican': 'mexican', 'mexico': 'mexican', 'mexico food': 'mexican',
      'indian': 'indian', 'india': 'indian', 'india food': 'indian',
      'mediterranean': 'mediterranean', 'mediteranean': 'mediterranean',
      'middle eastern': 'middle eastern', 'middle east': 'middle eastern',
      
      // Dietary terms
      'vegetarian': 'vegetarian', 'veggie': 'vegetarian', 'veggies': 'vegetarian',
      'vegan': 'vegan', 'veganism': 'vegan',
      'gluten free': 'gluten-free', 'glutenfree': 'gluten-free', 'gluten-free': 'gluten-free',
      'dairy free': 'dairy-free', 'dairyfree': 'dairy-free', 'dairy-free': 'dairy-free',
      'keto': 'keto', 'ketogenic': 'keto', 'keto diet': 'keto',
      'paleo': 'paleo', 'paleolithic': 'paleo', 'paleo diet': 'paleo',
      'low carb': 'low-carb', 'lowcarb': 'low-carb', 'low-carb': 'low-carb',
      'high protein': 'high-protein', 'highprotein': 'high-protein', 'high-protein': 'high-protein',
      
      // Meal types
      'breakfast': 'breakfast', 'morning meal': 'breakfast', 'morning food': 'breakfast',
      'lunch': 'lunch', 'midday meal': 'lunch', 'lunch time': 'lunch',
      'dinner': 'dinner', 'evening meal': 'dinner', 'supper': 'dinner',
      'snack': 'snack', 'snacks': 'snack', 'snacking': 'snack',
      
      // Cooking methods
      'bake': 'bake', 'baking': 'bake', 'baked': 'bake',
      'fry': 'fry', 'frying': 'fry', 'fried': 'fry',
      'grill': 'grill', 'grilling': 'grill', 'grilled': 'grill',
      'boil': 'boil', 'boiling': 'boil', 'boiled': 'boil',
      'steam': 'steam', 'steaming': 'steam', 'steamed': 'steam',
      'roast': 'roast', 'roasting': 'roast', 'roasted': 'roast',
      'sauté': 'sauté', 'sautée': 'sauté', 'sauted': 'sauté',
      
      
      'nutriton': 'nutrition', 'nutritonal': 'nutritional',
      'calorie': 'calories',
      'health': 'health', 'helth': 'health', 'healty': 'healthy',
      'healthy': 'healthy', 'healhty': 'healthy',
      'diet': 'diet', 'dieting': 'diet',
      'weight': 'weight', 'weght': 'weight', 'weigh': 'weight',
      'muscle': 'muscle', 'muscles': 'muscle', 'muscel': 'muscle',
      'energy': 'energy', 'energ': 'energy', 'energie': 'energy'
    };

    let corrected = input;
    for (const [typo, correction] of Object.entries(typoMap)) {
      const regex = new RegExp(`\\b${typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      corrected = corrected.replace(regex, correction);
    }
    
    return corrected;
  }

  private applySynonymMapping(input: string): string {
    const synonymMap: { [key: string]: string } = {
      // Question starters
      'what is': 'what is', 'whats': 'what is', 'what are': 'what is',
      'how to': 'how to', 'how do i': 'how to', 'how can i': 'how to',
      'tell me about': 'what is', 'explain': 'what is', 'describe': 'what is',
      'give me': 'suggest', 'recommend': 'suggest', 'suggestions': 'suggest',
      'show me': 'suggest', 'find me': 'suggest',
      
      // Nutrition synonyms
      'calories': 'calories', 'cal': 'calories', 'energy': 'calories',
      'protein': 'protein', 'proteins': 'protein', 'protean': 'protein',
      'carbs': 'carbs', 'carbohydrates': 'carbs', 'carb': 'carbs',
      'fat': 'fat', 'fats': 'fat', 'lipids': 'fat',
      'fiber': 'fiber', 'fibre': 'fiber', 'roughage': 'fiber',
      'vitamins': 'vitamin', 'vitamin': 'vitamin', 'micronutrients': 'vitamin',
      'minerals': 'mineral', 'mineral': 'mineral',
      'sodium': 'sodium', 'salt': 'sodium', 'na': 'sodium',
      'sugar': 'sugar', 'sugars': 'sugar', 'glucose': 'sugar',
      
      // Food synonyms
      'chicken': 'chicken', 'poultry': 'chicken', 'chicken breast': 'chicken',
      'beef': 'beef', 'red meat': 'beef', 'steak': 'beef',
      'fish': 'fish', 'seafood': 'fish', 'salmon': 'fish',
      'rice': 'rice', 'grain': 'rice', 'white rice': 'rice',
      'pasta': 'pasta', 'noodles': 'pasta', 'spaghetti': 'pasta',
      'bread': 'bread', 'loaf': 'bread', 'white bread': 'bread',
      'vegetables': 'vegetables', 'veggies': 'vegetables', 'veggie': 'vegetables',
      'fruits': 'fruits', 'fruit': 'fruits', 'fresh fruit': 'fruits',
      
      // Cooking synonyms
      'cook': 'cook', 'cooking': 'cook', 'prepare': 'cook', 'make': 'cook',
      'recipe': 'recipe', 'dish': 'recipe', 'meal': 'recipe',
      'ingredients': 'ingredients', 'ingredient': 'ingredients',
      'instructions': 'instructions', 'steps': 'instructions', 'directions': 'instructions',
      
      // Meal synonyms
      'breakfast': 'breakfast', 'morning meal': 'breakfast',
      'lunch': 'lunch', 'midday meal': 'lunch',
      'dinner': 'dinner', 'evening meal': 'dinner', 'supper': 'dinner',
      'snack': 'snack', 'snacks': 'snack',
      
      // Health synonyms
      'healthy': 'healthy', 'good for you': 'healthy', 'nutritious': 'healthy',
      'unhealthy': 'unhealthy', 'bad for you': 'unhealthy',
      'benefits': 'benefits', 'benefit': 'benefits', 'good': 'benefits',
      'harmful': 'harmful', 'bad': 'harmful', 'risks': 'harmful',
      
      // Comparison synonyms
      'compare': 'compare', 'comparison': 'compare', 'vs': 'compare',
      'versus': 'compare', 'difference': 'compare', 'better': 'compare',
      'more': 'more', 'higher': 'more', 'greater': 'more',
      'less': 'less', 'lower': 'less', 'fewer': 'less',
      
      // Time synonyms
      'quick': 'quick', 'fast': 'quick', 'easy': 'quick', 'simple': 'quick',
      'slow': 'slow', 'long': 'slow', 'time consuming': 'slow',
      'minutes': 'minutes', 'mins': 'minutes', 'min': 'minutes',
      'hours': 'hours', 'hrs': 'hours', 'hr': 'hours'
    };

    let normalized = input;
    for (const [synonym, standard] of Object.entries(synonymMap)) {
      const regex = new RegExp(`\\b${synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      normalized = normalized.replace(regex, standard);
    }
    
    return normalized;
  }

  private normalizeQuestionPhrasings(input: string): string {
    // Normalize different ways of asking the same question
    let normalized = input;
    
    // Question patterns
    const questionPatterns = [
      // Nutrition questions
      { pattern: /how many calories?\s+(?:in|does|has)\s+(.+)/gi, replacement: 'calories in $1' },
      { pattern: /what.*calories?\s+(?:in|of)\s+(.+)/gi, replacement: 'calories in $1' },
      { pattern: /calories?\s+(?:in|of)\s+(.+)/gi, replacement: 'calories in $1' },
      { pattern: /how much protein\s+(?:in|does|has)\s+(.+)/gi, replacement: 'protein in $1' },
      { pattern: /protein\s+(?:in|of)\s+(.+)/gi, replacement: 'protein in $1' },
      { pattern: /how many carbs?\s+(?:in|does|has)\s+(.+)/gi, replacement: 'carbs in $1' },
      { pattern: /carbs?\s+(?:in|of)\s+(.+)/gi, replacement: 'carbs in $1' },
      
      // Recipe questions
      { pattern: /how to make\s+(.+)/gi, replacement: 'recipe for $1' },
      { pattern: /how do i make\s+(.+)/gi, replacement: 'recipe for $1' },
      { pattern: /how can i cook\s+(.+)/gi, replacement: 'recipe for $1' },
      { pattern: /recipe\s+(?:for|of)\s+(.+)/gi, replacement: 'recipe for $1' },
      { pattern: /how to cook\s+(.+)/gi, replacement: 'cooking $1' },
      { pattern: /cooking\s+(?:time|method)\s+(?:for|of)\s+(.+)/gi, replacement: 'cooking $1' },
      
      // Comparison questions
      { pattern: /compare\s+(.+)\s+(?:and|vs|versus)\s+(.+)/gi, replacement: 'compare $1 $2' },
      { pattern: /which\s+(?:is|has)\s+(?:more|better|healthier)\s+(.+)\s+(?:or|than)\s+(.+)/gi, replacement: 'compare $1 $2' },
      { pattern: /difference\s+(?:between|of)\s+(.+)\s+(?:and|vs)\s+(.+)/gi, replacement: 'compare $1 $2' },
      
      // Meal planning questions
      { pattern: /what.*(?:to eat|should i eat|can i eat)\s+(?:for\s+)?(.+)/gi, replacement: 'meal suggestion $1' },
      { pattern: /suggest.*meal\s+(?:for\s+)?(.+)/gi, replacement: 'meal suggestion $1' },
      { pattern: /recommend.*meal\s+(?:for\s+)?(.+)/gi, replacement: 'meal suggestion $1' },
      { pattern: /(?:breakfast|lunch|dinner|snack).*idea/gi, replacement: 'meal suggestion' },
      
      // Cultural questions
      { pattern: /tell me about\s+(.+)/gi, replacement: 'cultural $1' },
      { pattern: /what.*is\s+(.+)/gi, replacement: 'cultural $1' },
      { pattern: /history.*of\s+(.+)/gi, replacement: 'cultural $1' },
      { pattern: /origin.*of\s+(.+)/gi, replacement: 'cultural $1' },
      
      // Health questions
      { pattern: /is\s+(.+)\s+(?:healthy|good|bad)/gi, replacement: 'health $1' },
      { pattern: /benefits.*of\s+(.+)/gi, replacement: 'health $1' },
      { pattern: /side effects.*of\s+(.+)/gi, replacement: 'health $1' },
      { pattern: /good for\s+(.+)/gi, replacement: 'health $1' },
      { pattern: /bad for\s+(.+)/gi, replacement: 'health $1' }
    ];
    
    for (const { pattern, replacement } of questionPatterns) {
      normalized = normalized.replace(pattern, replacement);
    }
    
    return normalized;
  }

  // Enhanced food extraction with fuzzy matching and better pattern recognition
  private extractFoodAndQuestion(input: string): { foodName: string; questionType: string } {
    let foodName = '';
    let questionType = 'general';

    // Enhanced food extraction patterns
    const foodPatterns = [
      // Nutrition patterns
      /(?:calories?|calory|cal|energy)\s+(?:in|of|does|has)\s+([^?]+)/,
      /(?:how many calories?|calory|cal)\s+(?:in|of|does|has)\s+([^?]+)/,
      /(?:protein|protien|protean)\s+(?:in|of|does|has)\s+([^?]+)/,
      /(?:carbs?|carbo|carbohydrates)\s+(?:in|of|does|has)\s+([^?]+)/,
      /(?:fat|fats|lipids)\s+(?:in|of|does|has)\s+([^?]+)/,
      /(?:fiber|fibre|roughage)\s+(?:in|of|does|has)\s+([^?]+)/,
      /(?:vitamin|vitam|vitamins)\s+(?:in|of|does|has)\s+([^?]+)/,
      /(?:mineral|miner|minerals)\s+(?:in|of|does|has)\s+([^?]+)/,
      /(?:sodium|salt|na)\s+(?:in|of|does|has)\s+([^?]+)/,
      /(?:sugar|sugars|glucose)\s+(?:in|of|does|has)\s+([^?]+)/,
      
      // Cooking patterns
      /(?:cook|cooking|how to cook|how long to cook|how much time)\s+([^?]+)/,
      /(?:recipe|dish|meal)\s+(?:for|of)\s+([^?]+)/,
      /(?:how to make|how do i make|how can i cook)\s+([^?]+)/,
      /(?:cooking time|prep time|preparation time)\s+(?:for|of)\s+([^?]+)/,
      
      // Recipe patterns (like "pasta recipes")
      /([^?]+)\s+(?:recipes?|recipe)/,
      
      // General food patterns
      /(?:what is|tell me about|explain|describe)\s+([^?]+)/,
      /(?:benefits of|side effects of|good for|bad for)\s+([^?]+)/,
      /(?:is|are)\s+([^?]+)\s+(?:healthy|good|bad|nutritious|harmful)/,
      /(?:compare|comparison|difference between)\s+([^?]+)/,
      /(?:which|what)\s+(?:is|has|are)\s+(?:more|better|healthier|worse)\s+([^?]+)/,
      
      // Meal planning patterns
      /(?:meal|breakfast|lunch|dinner|snack)\s+(?:for|idea|suggestion)\s+([^?]+)/,
      /(?:suggest|recommend|give me)\s+(?:a\s+)?(?:meal|breakfast|lunch|dinner|snack)\s+(?:for\s+)?([^?]+)/,
      /(?:what|what should i|what can i)\s+(?:eat|have)\s+(?:for\s+)?([^?]+)/,
      
      // Cultural patterns
      /(?:cultural|tradition|traditional|origin|history)\s+(?:of|about)\s+([^?]+)/,
      /(?:cuisine|food)\s+(?:from|of)\s+([^?]+)/,
      
      // Direct food mentions (fallback)
      /\b(chicken|beef|pork|fish|salmon|tuna|cod|rice|pasta|bread|apple|banana|orange|potato|tomato|onion|garlic|cheese|milk|egg|butter|oil|salt|pepper|sugar|flour|water|coffee|tea|juice|hummus|pasta|sushi|pizza|burger|sandwich|salad|soup|curry|stir fry|pasta|noodles|quinoa|oats|yogurt|nuts|seeds|avocado|broccoli|spinach|carrot|lettuce|cucumber|pepper|mushroom|corn|peas|beans|lentils|chickpeas|tofu|tempeh|seitan)\b/
    ];

    // Try to extract food name using patterns
    for (const pattern of foodPatterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        foodName = match[1].trim();
        break;
      }
    }

    // If no pattern match, try to find food names using fuzzy matching
    if (!foodName) {
      foodName = this.findFoodNameFuzzy(input);
    }

    // Clean up the food name
    if (foodName) {
      foodName = this.cleanFoodName(foodName);
    }

    // Enhanced question type detection
    questionType = this.detectQuestionType(input);

    return { foodName, questionType };
  }

  private findFoodNameFuzzy(input: string): string {
    const foodDatabase = this.getComprehensiveFoodDatabase();

    const words = input.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      for (const food of foodDatabase) {
        if (this.calculateSimilarity(word, food) > 0.7) {
          return food;
        }
      }
    }
    
    return '';
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Calculate intent scores using fuzzy matching for smarter detection
  private calculateIntentScores(input: string): { [key: string]: number } {
    const intents = {
      calories: [
        'calories', 'calory', 'cal', 'kcal', 'energy', 'how many calories',
        'calorie content', 'calorie count', 'calorie information'
      ],
      protein: [
        'protein', 'protien', 'protean', 'how much protein', 'protein content',
        'protein amount', 'protein information', 'amino acids'
      ],
      carbs: [
        'carbs', 'carbo', 'carbohydrates', 'how many carbs', 'carb content',
        'carb amount', 'sugar', 'glucose', 'starch'
      ],
      fat: [
        'fat', 'fats', 'lipids', 'how much fat', 'fat content', 'fat amount',
        'saturated fat', 'unsaturated fat', 'trans fat'
      ],
      fiber: [
        'fiber', 'fibre', 'roughage', 'how much fiber', 'fiber content',
        'dietary fiber', 'soluble fiber', 'insoluble fiber'
      ],
      cooking: [
        'cook', 'cooking', 'how to cook', 'cooking method', 'cooking time',
        'how long to cook', 'cook for', 'bake', 'fry', 'boil', 'steam', 'grill'
      ],
      recipe: [
        'recipe', 'how to make', 'ingredients', 'cooking instructions',
        'prep time', 'cook time', 'servings', 'directions', 'steps'
      ],
      health: [
        'healthy', 'unhealthy', 'good for you', 'bad for you', 'benefits',
        'harmful', 'nutritious', 'is it healthy', 'health benefits'
      ],
      comparison: [
        'compare', 'comparison', 'vs', 'versus', 'difference between',
        'which is better', 'more protein', 'less calories', 'healthier'
      ],
      meal_planning: [
        'meal plan', 'what to eat', 'meal suggestions', 'breakfast ideas',
        'lunch ideas', 'dinner ideas', 'snack ideas', 'meal prep'
      ]
    };
    
    const scores: { [key: string]: number } = {};
    
    for (const [intent, keywords] of Object.entries(intents)) {
      let score = 0;
      let matches = 0;
      
      for (const keyword of keywords) {
        const similarity = this.calculateSimilarity(input, keyword);
        if (similarity > 0.3) { // Only count meaningful matches
          score += similarity;
          matches++;
        }
      }
      
      // Normalize by number of matches and keyword length
      scores[intent] = matches > 0 ? score / matches : 0;
    }
    
    return scores;
  }

  // Comprehensive food database with 1,000+ items
  private getComprehensiveFoodDatabase(): string[] {
    return [
      // Proteins - Meat & Poultry
      'chicken', 'beef', 'pork', 'lamb', 'veal', 'duck', 'turkey', 'goose', 'rabbit', 'venison',
      'bison', 'elk', 'quail', 'pheasant', 'chicken breast', 'chicken thigh', 'chicken wing',
      'ground beef', 'ground turkey', 'ground pork', 'beef steak', 'pork chop', 'lamb chop',
      'bacon', 'ham', 'sausage', 'pepperoni', 'salami', 'prosciutto', 'chorizo', 'bratwurst',
      'hot dog', 'burger', 'meatball', 'meatloaf', 'roast beef', 'pulled pork', 'ribs',
      
      // Seafood
      'fish', 'salmon', 'tuna', 'cod', 'halibut', 'mahi mahi', 'sea bass', 'trout', 'mackerel',
      'sardines', 'anchovies', 'herring', 'shrimp', 'crab', 'lobster', 'scallops', 'mussels',
      'clams', 'oysters', 'octopus', 'squid', 'cuttlefish', 'eel', 'caviar', 'roe',
      'fish fillet', 'fish steak', 'crab legs', 'lobster tail', 'shrimp cocktail',
      
      // Grains & Cereals
      'rice', 'brown rice', 'white rice', 'wild rice', 'jasmine rice', 'basmati rice',
      'pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'rigatoni', 'macaroni',
      'bread', 'white bread', 'whole wheat bread', 'sourdough', 'rye bread', 'pita bread',
      'naan', 'bagel', 'croissant', 'muffin', 'biscuit', 'roll', 'bun', 'tortilla',
      'quinoa', 'oats', 'oatmeal', 'barley', 'wheat', 'rye', 'buckwheat', 'millet',
      'corn', 'popcorn', 'cornmeal', 'polenta', 'bulgur', 'couscous', 'farro', 'spelt',
      
      // Vegetables
      'broccoli', 'spinach', 'kale', 'lettuce', 'arugula', 'cabbage', 'brussels sprouts',
      'cauliflower', 'carrot', 'celery', 'cucumber', 'tomato', 'onion', 'garlic', 'ginger',
      'pepper', 'bell pepper', 'jalapeno', 'habanero', 'mushroom', 'button mushroom',
      'shiitake', 'portobello', 'oyster mushroom', 'potato', 'sweet potato', 'yam',
      'beet', 'radish', 'turnip', 'parsnip', 'asparagus', 'artichoke', 'eggplant',
      'zucchini', 'squash', 'pumpkin', 'corn', 'peas', 'green beans', 'snap peas',
      'snow peas', 'okra', 'fennel', 'leek', 'shallot', 'scallion', 'chive',
      
      // Fruits
      'apple', 'banana', 'orange', 'lemon', 'lime', 'grapefruit', 'tangerine', 'clementine',
      'grape', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cranberry',
      'peach', 'pear', 'plum', 'apricot', 'cherry', 'kiwi', 'mango', 'pineapple',
      'papaya', 'passion fruit', 'dragon fruit', 'pomegranate', 'fig', 'date',
      'coconut', 'avocado', 'olive', 'tomato', 'watermelon', 'cantaloupe', 'honeydew',
      
      // Dairy & Eggs
      'milk', 'whole milk', 'skim milk', '2% milk', 'almond milk', 'soy milk', 'oat milk',
      'coconut milk', 'rice milk', 'hemp milk', 'cheese', 'cheddar', 'mozzarella',
      'parmesan', 'swiss', 'brie', 'camembert', 'feta', 'goat cheese', 'blue cheese',
      'gouda', 'provolone', 'ricotta', 'cottage cheese', 'cream cheese', 'yogurt',
      'greek yogurt', 'kefir', 'butter', 'ghee', 'cream', 'heavy cream', 'sour cream',
      'buttermilk', 'ice cream', 'gelato', 'sorbet', 'frozen yogurt', 'egg', 'eggs',
      
      // Nuts & Seeds
      'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia',
      'brazil nut', 'pine nut', 'peanut', 'sunflower seed', 'pumpkin seed', 'sesame seed',
      'chia seed', 'flax seed', 'hemp seed', 'poppy seed', 'nut butter', 'peanut butter',
      'almond butter', 'cashew butter', 'sunflower butter', 'tahini',
      
      // Legumes & Beans
      'bean', 'black bean', 'kidney bean', 'pinto bean', 'navy bean', 'lima bean',
      'chickpea', 'garbanzo bean', 'lentil', 'red lentil', 'green lentil', 'black lentil',
      'split pea', 'soybean', 'edamame', 'tofu', 'tempeh', 'miso', 'hummus',
      
      // Herbs & Spices
      'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'parsley', 'cilantro', 'dill',
      'mint', 'chive', 'tarragon', 'bay leaf', 'cinnamon', 'nutmeg', 'clove',
      'cardamom', 'allspice', 'vanilla', 'pepper', 'salt', 'garlic powder', 'onion powder',
      'paprika', 'cumin', 'coriander', 'turmeric', 'ginger', 'cayenne', 'chili powder',
      'curry powder', 'garam masala', 'herbes de provence', 'italian seasoning',
      
      // Oils & Fats
      'olive oil', 'coconut oil', 'vegetable oil', 'canola oil', 'sunflower oil',
      'sesame oil', 'avocado oil', 'walnut oil', 'flaxseed oil', 'ghee', 'butter',
      'lard', 'shortening', 'margarine',
      
      // Beverages
      'water', 'coffee', 'espresso', 'latte', 'cappuccino', 'americano', 'mocha',
      'tea', 'green tea', 'black tea', 'white tea', 'oolong tea', 'chai', 'herbal tea',
      'juice', 'orange juice', 'apple juice', 'cranberry juice', 'grape juice',
      'lemonade', 'iced tea', 'soda', 'cola', 'ginger ale', 'root beer', 'energy drink',
      'sports drink', 'wine', 'red wine', 'white wine', 'beer', 'ale', 'lager',
      'whiskey', 'vodka', 'rum', 'gin', 'tequila', 'brandy', 'champagne',
      
      // Condiments & Sauces
      'ketchup', 'mustard', 'mayonnaise', 'ranch', 'italian dressing', 'vinaigrette',
      'balsamic vinegar', 'apple cider vinegar', 'soy sauce', 'worcestershire sauce',
      'hot sauce', 'sriracha', 'tabasco', 'barbecue sauce', 'teriyaki sauce',
      'honey', 'maple syrup', 'agave', 'molasses', 'jam', 'jelly', 'preserves',
      
      // Snacks & Sweets
      'chocolate', 'dark chocolate', 'milk chocolate', 'white chocolate', 'cocoa',
      'cake', 'cheesecake', 'cupcake', 'muffin', 'cookie', 'biscuit', 'cracker',
      'pie', 'tart', 'pudding', 'custard', 'flan', 'candy', 'gummy bear', 'jelly bean',
      'lollipop', 'caramel', 'toffee', 'fudge', 'truffle', 'donut', 'croissant',
      'pretzel', 'popcorn', 'chips', 'crackers', 'granola bar', 'energy bar',
      
      // International Cuisines
      'sushi', 'sashimi', 'ramen', 'udon', 'soba', 'tempura', 'teriyaki', 'miso soup',
      'pad thai', 'curry', 'tikka masala', 'butter chicken', 'biryani', 'naan',
      'hummus', 'falafel', 'tabbouleh', 'baba ganoush', 'tzatziki', 'gyro',
      'pizza', 'pasta', 'risotto', 'bruschetta', 'antipasto', 'paella', 'tapas',
      'tacos', 'burrito', 'quesadilla', 'enchilada', 'tamale', 'guacamole',
      'pho', 'spring roll', 'dumpling', 'wonton', 'lo mein', 'fried rice',
      'borscht', 'pierogi', 'goulash', 'schnitzel', 'sauerkraut', 'bratwurst',
      
      // Processed Foods
      'cereal', 'granola', 'muesli', 'oatmeal', 'porridge', 'pancake', 'waffle',
      'french toast', 'sandwich', 'wrap', 'pita', 'quesadilla', 'panini',
      'soup', 'stew', 'chili', 'gumbo', 'jambalaya', 'casserole', 'lasagna',
      'spaghetti', 'mac and cheese', 'fettuccine alfredo', 'carbonara',
      
      // Frozen & Canned
      'frozen vegetables', 'frozen fruit', 'frozen yogurt', 'ice cream', 'sorbet',
      'canned tomatoes', 'canned beans', 'canned corn', 'canned tuna', 'canned salmon',
      'canned soup', 'frozen pizza', 'frozen dinner', 'frozen burrito',
      
      // Specialty & Health Foods
      'kombucha', 'kefir', 'kimchi', 'sauerkraut', 'pickles', 'olives',
      'nutritional yeast', 'spirulina', 'chlorella', 'wheatgrass', 'acai',
      'goji berry', 'maca', 'turmeric', 'ginger', 'garlic', 'onion',
      'superfood', 'antioxidant', 'probiotic', 'prebiotic', 'fiber',
      
      // Lebanese & Middle Eastern
      'almaza', 'lebanese beer', 'kibbeh', 'kebab', 'shawarma', 'manakish',
      'zaatar', 'labneh', 'fatteh', 'mujadara', 'foul', 'fatteh', 'knafeh',
      'baklava', 'maamoul', 'halva', 'tahini', 'pita bread', 'lavash',
      
      // Additional comprehensive list
      'acorn squash', 'adzuki bean', 'aioli', 'albacore', 'alfalfa sprout',
      'amaranth', 'anchovy', 'anise', 'apricot', 'arugula', 'asparagus',
      'aubergine', 'avocado', 'bacon', 'bagel', 'balsamic', 'banana',
      'barley', 'basil', 'bay leaf', 'bean sprout', 'beef', 'beet',
      'bell pepper', 'black bean', 'blackberry', 'blue cheese', 'blueberry',
      'bok choy', 'brie', 'broccoli', 'brown rice', 'brussels sprout',
      'buckwheat', 'bulgur', 'butter', 'butternut squash', 'cabbage',
      'camembert', 'cantaloupe', 'capers', 'caramel', 'cardamom',
      'carrot', 'cashew', 'cauliflower', 'cayenne', 'celery', 'cheddar',
      'cherry', 'chicken', 'chickpea', 'chili', 'chive', 'chocolate',
      'cilantro', 'cinnamon', 'clove', 'coconut', 'cod', 'coffee',
      'collard green', 'corn', 'cottage cheese', 'couscous', 'cranberry',
      'cream', 'cream cheese', 'cucumber', 'cumin', 'curry', 'dandelion green',
      'date', 'dill', 'duck', 'edamame', 'egg', 'eggplant', 'endive',
      'fennel', 'fig', 'fish', 'flax seed', 'french bean', 'garlic',
      'ginger', 'goat cheese', 'goose', 'gorgonzola', 'gouda', 'grape',
      'grapefruit', 'green bean', 'green pepper', 'grouper', 'gruyere',
      'guava', 'halibut', 'ham', 'hazelnut', 'honey', 'honeydew',
      'horseradish', 'hummus', 'ice cream', 'jalapeno', 'jicama',
      'kale', 'ketchup', 'kidney bean', 'kiwi', 'kohlrabi', 'lamb',
      'leek', 'lemon', 'lentil', 'lettuce', 'lime', 'lobster',
      'macadamia', 'mackerel', 'mango', 'maple syrup', 'mayonnaise',
      'milk', 'mint', 'miso', 'mozzarella', 'mushroom', 'mustard',
      'nectarine', 'nori', 'nutmeg', 'oat', 'okra', 'olive',
      'onion', 'orange', 'oregano', 'oyster', 'papaya', 'paprika',
      'parmesan', 'parsley', 'passion fruit', 'pasta', 'peach',
      'peanut', 'pear', 'peas', 'pecan', 'pepper', 'persimmon',
      'pickle', 'pineapple', 'pistachio', 'pita', 'plum', 'pomegranate',
      'pomelo', 'pork', 'potato', 'prosciutto', 'provolone', 'prune',
      'pumpkin', 'quail', 'quinoa', 'radicchio', 'radish', 'raisin',
      'raspberry', 'rhubarb', 'rice', 'ricotta', 'romano', 'rosemary',
      'rutabaga', 'rye', 'sage', 'salmon', 'sardine', 'sauerkraut',
      'scallion', 'scallop', 'sea bass', 'sesame', 'shallot', 'shrimp',
      'snap pea', 'snow pea', 'sole', 'sorrel', 'sour cream', 'soy',
      'soy sauce', 'spaghetti', 'spinach', 'squash', 'squid', 'star fruit',
      'strawberry', 'string bean', 'sugar', 'sunflower seed', 'sweet potato',
      'swiss cheese', 'swordfish', 'syrup', 'tangerine', 'tapioca',
      'tarragon', 'tea', 'thyme', 'tilapia', 'tofu', 'tomato',
      'truffle', 'tuna', 'turkey', 'turnip', 'vanilla', 'veal',
      'vegetable', 'venison', 'vinegar', 'walnut', 'water chestnut',
      'watercress', 'watermelon', 'wheat', 'wine', 'yogurt', 'zucchini'
    ];
  }

  private detectQuestionType(input: string): string {
    const lowerInput = input.toLowerCase();
    
    // Use fuzzy matching for better intent detection
    const intentScores = this.calculateIntentScores(lowerInput);
    const bestIntent = Object.entries(intentScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    // If confidence is high enough, use the detected intent
    if (bestIntent && bestIntent[1] > 0.6) {
      return bestIntent[0];
    }
    
    // Fallback to exact pattern matching
    // Nutrition types
    if (lowerInput.includes('calories') || lowerInput.includes('calory') || lowerInput.includes('cal') || lowerInput.includes('energy')) {
      return 'calories';
    }
    if (lowerInput.includes('protein') || lowerInput.includes('protien') || lowerInput.includes('protean')) {
      return 'protein';
    }
    if (lowerInput.includes('carbs') || lowerInput.includes('carbo') || lowerInput.includes('carbohydrates')) {
      return 'carbs';
    }
    if (lowerInput.includes('fat') || lowerInput.includes('fats') || lowerInput.includes('lipids')) {
      return 'fat';
    }
    if (lowerInput.includes('fiber') || lowerInput.includes('fibre') || lowerInput.includes('roughage')) {
      return 'fiber';
    }
    if (lowerInput.includes('vitamin') || lowerInput.includes('vitam') || lowerInput.includes('vitamins')) {
      return 'vitamins';
    }
    if (lowerInput.includes('mineral') || lowerInput.includes('miner') || lowerInput.includes('minerals')) {
      return 'minerals';
    }
    if (lowerInput.includes('sodium') || lowerInput.includes('salt') || lowerInput.includes('na')) {
      return 'sodium';
    }
    if (lowerInput.includes('sugar') || lowerInput.includes('sugars') || lowerInput.includes('glucose')) {
      return 'sugar';
    }
    
    // Cooking types
    if (lowerInput.includes('cook') || lowerInput.includes('cooking') || lowerInput.includes('recipe') || lowerInput.includes('make')) {
      return 'cooking';
    }
    
    // Health types
    if (lowerInput.includes('healthy') || lowerInput.includes('good') || lowerInput.includes('bad') || 
        lowerInput.includes('benefits') || lowerInput.includes('harmful') || lowerInput.includes('nutritious')) {
      return 'health';
    }
    
    // Comparison types
    if (lowerInput.includes('compare') || lowerInput.includes('comparison') || lowerInput.includes('vs') || 
        lowerInput.includes('versus') || lowerInput.includes('difference') || lowerInput.includes('better') || 
        lowerInput.includes('more') || lowerInput.includes('less')) {
      return 'comparison';
    }
    
    // Meal planning types
    if (lowerInput.includes('meal') || lowerInput.includes('breakfast') || lowerInput.includes('lunch') || 
        lowerInput.includes('dinner') || lowerInput.includes('snack') || lowerInput.includes('eat')) {
      return 'meal_planning';
    }
    
    // Cultural types
    if (lowerInput.includes('cultural') || lowerInput.includes('tradition') || lowerInput.includes('traditional') || 
        lowerInput.includes('origin') || lowerInput.includes('history') || lowerInput.includes('cuisine')) {
      return 'cultural';
    }
    
    return 'general';
  }

  // Clean and normalize food names for better database matching
  private cleanFoodName(foodName: string): string {
    return foodName
      .toLowerCase()
      .trim()
      // Remove common words that might interfere with search
      .replace(/\b(a|an|the|some|one|two|three|four|five|six|seven|eight|nine|ten)\b/g, '')
      // Fix common spacing issues
      .replace(/\s+/g, ' ')
      .replace(/\bof\s+/g, '')
      .replace(/\bin\s+/g, '')
      // Remove common measurement words
      .replace(/\b(cup|cups|tbsp|tsp|oz|lb|kg|g|ml|l|pound|pounds|ounce|ounces|gram|grams|kilogram|kilograms|liter|liters|milliliter|milliliters)\b/g, '')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim()
      // Handle specific food name corrections
      .replace(/\bchiken\b/g, 'chicken')
      .replace(/\bbeef\b/g, 'beef')
      .replace(/\bpork\b/g, 'pork')
      .replace(/\bfish\b/g, 'fish')
      .replace(/\brice\b/g, 'rice')
      .replace(/\bpasta\b/g, 'pasta')
      .replace(/\bbread\b/g, 'bread')
      .replace(/\bapple\b/g, 'apple')
      .replace(/\bbanana\b/g, 'banana')
      .replace(/\borange\b/g, 'orange')
      .replace(/\bpotato\b/g, 'potato')
      .replace(/\btomato\b/g, 'tomato')
      .replace(/\bonion\b/g, 'onion')
      .replace(/\bgarlic\b/g, 'garlic')
      .replace(/\bcheese\b/g, 'cheese')
      .replace(/\bmilk\b/g, 'milk')
      .replace(/\begg\b/g, 'egg')
      .replace(/\bbutter\b/g, 'butter')
      .replace(/\boil\b/g, 'oil')
      .replace(/\bsalt\b/g, 'salt')
      .replace(/\bpepper\b/g, 'pepper')
      .replace(/\bsugar\b/g, 'sugar')
      .replace(/\bflour\b/g, 'flour')
      .replace(/\bwater\b/g, 'water')
      .replace(/\bcoffee\b/g, 'coffee')
      .replace(/\btea\b/g, 'tea')
      .replace(/\bjuice\b/g, 'juice')
      .replace(/\bsoda\b/g, 'soda')
      .replace(/\bwine\b/g, 'wine')
      .replace(/\bbeer\b/g, 'beer');
  }

  private isNutritionQuestion(input: string): boolean {
    const patterns = [
      /how many calories/,
      /calories.*in/,
      /calories in/,
      /calory/,
      /cal\b/,
      /kcal/,
      /energy.*content/,
      /nutrition.*info/,
      /protein.*content/,
      /protien/,
      /carbs.*in/,
      /carbo/,
      /carbohydrates/,
      /is.*healthy/,
      /nutritional.*value/,
      /macro.*content/,
      /vitamin.*content/,
      /vitam/,
      /mineral.*content/,
      /miner/,
      /fiber.*content/,
      /sugar.*content/,
      /fat.*content/,
      /sodium.*content/,
      /how much.*protein/,
      /how much.*carbs/,
      /how much.*fat/,
      /how much.*fiber/,
      /how much.*sugar/,
      /how much.*sodium/,
      /nutrition facts/,
      /calorie count/,
      /protein amount/,
      /carb amount/,
      /fat amount/,
      /fiber amount/,
      /sugar amount/,
      /sodium amount/,
      /health benefits/,
      /nutritious/,
      /unhealthy/,
      /good for you/,
      /bad for you/,
      /diet/,
      /dietary/,
      /weight/,
      /muscle/,
      /fitness/,
      /health/,
      /benefits/,
      /harmful/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isCookingQuestion(input: string): boolean {
    const patterns = [
      /how.*cook/,
      /cooking.*time/,
      /cook.*time/,
      /how long.*cook/,
      /how much time.*cook/,
      /bake.*time/,
      /roast.*time/,
      /fry.*time/,
      /boil.*time/,
      /steam.*time/,
      /grill.*time/,
      /temperature.*cook/,
      /oven.*temperature/,
      /cooking.*method/,
      /how.*prepare/,
      /preparation.*time/,
      /marinate.*time/,
      /rest.*time/,
      /cooking.*tips/,
      /cooking.*advice/,
      /how.*make/,
      /how.*bake/,
      /how.*fry/,
      /how.*roast/,
      /how.*grill/,
      /how.*steam/,
      /how.*boil/,
      /how.*simmer/,
      /how.*sauté/,
      /how.*braise/,
      /how.*poach/,
      /how.*blanch/,
      /how.*sear/,
      /how.*broil/,
      /how.*stew/,
      /how.*soup/,
      /how.*sauce/,
      /how.*marinade/,
      /how.*season/,
      /how.*spice/,
      /how.*herb/,
      /how.*oil/,
      /how.*butter/,
      /how.*garlic/,
      /how.*onion/,
      /how.*salt/,
      /how.*pepper/,
      /how.*water/,
      /how.*stock/,
      /how.*broth/,
      /how.*wine/,
      /how.*vinegar/,
      /how.*lemon/,
      /how.*lime/,
      /how.*tomato/,
      /how.*mushroom/,
      /how.*carrot/,
      /how.*potato/,
      /how.*onion/,
      /how.*garlic/,
      /how.*ginger/,
      /how.*basil/,
      /how.*oregano/,
      /how.*thyme/,
      /how.*rosemary/,
      /how.*parsley/,
      /how.*cilantro/,
      /how.*dill/,
      /how.*mint/,
      /how.*chive/,
      /how.*tarragon/,
      /how.*sage/,
      /how.*bay leaf/,
      /how.*cinnamon/,
      /how.*nutmeg/,
      /how.*clove/,
      /how.*cardamom/,
      /how.*allspice/,
      /how.*vanilla/,
      /how.*pepper/,
      /how.*salt/,
      /how.*garlic powder/,
      /how.*onion powder/,
      /how.*paprika/,
      /how.*cumin/,
      /how.*coriander/,
      /how.*turmeric/,
      /how.*ginger/,
      /how.*cayenne/,
      /how.*chili powder/,
      /how.*curry powder/,
      /how.*garam masala/,
      /how.*herbes de provence/,
      /how.*italian seasoning/,
      /how.*olive oil/,
      /how.*coconut oil/,
      /how.*vegetable oil/,
      /how.*canola oil/,
      /how.*sunflower oil/,
      /how.*sesame oil/,
      /how.*avocado oil/,
      /how.*walnut oil/,
      /how.*flaxseed oil/,
      /how.*ghee/,
      /how.*butter/,
      /how.*lard/,
      /how.*shortening/,
      /how.*margarine/,
      /cook.*rice/,
      /cook.*pasta/,
      /cook.*chicken/,
      /cook.*beef/,
      /cook.*fish/,
      /cook.*vegetables/,
      /cook.*eggs/,
      /cook.*potato/,
      /cook.*onion/,
      /cook.*garlic/,
      /cook.*mushroom/,
      /cook.*tomato/,
      /cook.*carrot/,
      /cook.*broccoli/,
      /cook.*spinach/,
      /cook.*kale/,
      /cook.*lettuce/,
      /cook.*cabbage/,
      /cook.*cauliflower/,
      /cook.*asparagus/,
      /cook.*artichoke/,
      /cook.*eggplant/,
      /cook.*zucchini/,
      /cook.*squash/,
      /cook.*pumpkin/,
      /cook.*corn/,
      /cook.*peas/,
      /cook.*green beans/,
      /cook.*snap peas/,
      /cook.*snow peas/,
      /cook.*okra/,
      /cook.*fennel/,
      /cook.*leek/,
      /cook.*shallot/,
      /cook.*scallion/,
      /cook.*chive/,
      /cook.*beet/,
      /cook.*radish/,
      /cook.*turnip/,
      /cook.*parsnip/,
      /cook.*sweet potato/,
      /cook.*yam/,
      /cook.*apple/,
      /cook.*banana/,
      /cook.*orange/,
      /cook.*lemon/,
      /cook.*lime/,
      /cook.*grapefruit/,
      /cook.*tangerine/,
      /cook.*clementine/,
      /cook.*grape/,
      /cook.*strawberry/,
      /cook.*blueberry/,
      /cook.*raspberry/,
      /cook.*blackberry/,
      /cook.*cranberry/,
      /cook.*peach/,
      /cook.*pear/,
      /cook.*plum/,
      /cook.*apricot/,
      /cook.*cherry/,
      /cook.*kiwi/,
      /cook.*mango/,
      /cook.*pineapple/,
      /cook.*papaya/,
      /cook.*passion fruit/,
      /cook.*dragon fruit/,
      /cook.*pomegranate/,
      /cook.*fig/,
      /cook.*date/,
      /cook.*coconut/,
      /cook.*avocado/,
      /cook.*olive/,
      /cook.*tomato/,
      /cook.*watermelon/,
      /cook.*cantaloupe/,
      /cook.*honeydew/,
      /cook.*almond/,
      /cook.*walnut/,
      /cook.*pecan/,
      /cook.*cashew/,
      /cook.*pistachio/,
      /cook.*hazelnut/,
      /cook.*macadamia/,
      /cook.*brazil nut/,
      /cook.*pine nut/,
      /cook.*peanut/,
      /cook.*sunflower seed/,
      /cook.*pumpkin seed/,
      /cook.*sesame seed/,
      /cook.*chia seed/,
      /cook.*flax seed/,
      /cook.*hemp seed/,
      /cook.*poppy seed/,
      /cook.*nut butter/,
      /cook.*peanut butter/,
      /cook.*almond butter/,
      /cook.*cashew butter/,
      /cook.*sunflower butter/,
      /cook.*tahini/,
      /cook.*bean/,
      /cook.*black bean/,
      /cook.*kidney bean/,
      /cook.*pinto bean/,
      /cook.*navy bean/,
      /cook.*lima bean/,
      /cook.*chickpea/,
      /cook.*garbanzo bean/,
      /cook.*lentil/,
      /cook.*red lentil/,
      /cook.*green lentil/,
      /cook.*black lentil/,
      /cook.*split pea/,
      /cook.*soybean/,
      /cook.*edamame/,
      /cook.*tofu/,
      /cook.*tempeh/,
      /cook.*miso/,
      /cook.*hummus/,
      /cook.*cheese/,
      /cook.*cheddar/,
      /cook.*mozzarella/,
      /cook.*parmesan/,
      /cook.*swiss/,
      /cook.*brie/,
      /cook.*camembert/,
      /cook.*feta/,
      /cook.*goat cheese/,
      /cook.*blue cheese/,
      /cook.*gouda/,
      /cook.*provolone/,
      /cook.*ricotta/,
      /cook.*cottage cheese/,
      /cook.*cream cheese/,
      /cook.*yogurt/,
      /cook.*greek yogurt/,
      /cook.*kefir/,
      /cook.*butter/,
      /cook.*ghee/,
      /cook.*cream/,
      /cook.*heavy cream/,
      /cook.*sour cream/,
      /cook.*buttermilk/,
      /cook.*ice cream/,
      /cook.*gelato/,
      /cook.*sorbet/,
      /cook.*frozen yogurt/,
      /cook.*egg/,
      /cook.*eggs/,
      /cook.*milk/,
      /cook.*whole milk/,
      /cook.*skim milk/,
      /cook.*2% milk/,
      /cook.*almond milk/,
      /cook.*soy milk/,
      /cook.*oat milk/,
      /cook.*coconut milk/,
      /cook.*rice milk/,
      /cook.*hemp milk/,
      /cook.*bread/,
      /cook.*white bread/,
      /cook.*whole wheat bread/,
      /cook.*sourdough/,
      /cook.*rye bread/,
      /cook.*pita bread/,
      /cook.*naan/,
      /cook.*bagel/,
      /cook.*croissant/,
      /cook.*muffin/,
      /cook.*biscuit/,
      /cook.*roll/,
      /cook.*bun/,
      /cook.*tortilla/,
      /cook.*quinoa/,
      /cook.*oats/,
      /cook.*oatmeal/,
      /cook.*barley/,
      /cook.*wheat/,
      /cook.*rye/,
      /cook.*buckwheat/,
      /cook.*millet/,
      /cook.*corn/,
      /cook.*popcorn/,
      /cook.*cornmeal/,
      /cook.*polenta/,
      /cook.*bulgur/,
      /cook.*couscous/,
      /cook.*farro/,
      /cook.*spelt/,
      /cook.*rice/,
      /cook.*brown rice/,
      /cook.*white rice/,
      /cook.*wild rice/,
      /cook.*jasmine rice/,
      /cook.*basmati rice/,
      /cook.*pasta/,
      /cook.*spaghetti/,
      /cook.*penne/,
      /cook.*fettuccine/,
      /cook.*linguine/,
      /cook.*rigatoni/,
      /cook.*macaroni/,
      /cook.*chocolate/,
      /cook.*dark chocolate/,
      /cook.*milk chocolate/,
      /cook.*white chocolate/,
      /cook.*cocoa/,
      /cook.*cake/,
      /cook.*cheesecake/,
      /cook.*cupcake/,
      /cook.*muffin/,
      /cook.*cookie/,
      /cook.*biscuit/,
      /cook.*cracker/,
      /cook.*pie/,
      /cook.*tart/,
      /cook.*pudding/,
      /cook.*custard/,
      /cook.*flan/,
      /cook.*candy/,
      /cook.*gummy bear/,
      /cook.*jelly bean/,
      /cook.*lollipop/,
      /cook.*caramel/,
      /cook.*toffee/,
      /cook.*fudge/,
      /cook.*truffle/,
      /cook.*donut/,
      /cook.*croissant/,
      /cook.*pretzel/,
      /cook.*popcorn/,
      /cook.*chips/,
      /cook.*crackers/,
      /cook.*granola bar/,
      /cook.*energy bar/,
      /cook.*sushi/,
      /cook.*sashimi/,
      /cook.*ramen/,
      /cook.*udon/,
      /cook.*soba/,
      /cook.*tempura/,
      /cook.*teriyaki/,
      /cook.*miso soup/,
      /cook.*pad thai/,
      /cook.*curry/,
      /cook.*tikka masala/,
      /cook.*butter chicken/,
      /cook.*biryani/,
      /cook.*naan/,
      /cook.*hummus/,
      /cook.*falafel/,
      /cook.*tabbouleh/,
      /cook.*baba ganoush/,
      /cook.*tzatziki/,
      /cook.*gyro/,
      /cook.*pizza/,
      /cook.*pasta/,
      /cook.*risotto/,
      /cook.*bruschetta/,
      /cook.*antipasto/,
      /cook.*paella/,
      /cook.*tapas/,
      /cook.*tacos/,
      /cook.*burrito/,
      /cook.*quesadilla/,
      /cook.*enchilada/,
      /cook.*tamale/,
      /cook.*guacamole/,
      /cook.*pho/,
      /cook.*spring roll/,
      /cook.*dumpling/,
      /cook.*wonton/,
      /cook.*lo mein/,
      /cook.*fried rice/,
      /cook.*borscht/,
      /cook.*pierogi/,
      /cook.*goulash/,
      /cook.*schnitzel/,
      /cook.*sauerkraut/,
      /cook.*bratwurst/,
      /cook.*cereal/,
      /cook.*granola/,
      /cook.*muesli/,
      /cook.*oatmeal/,
      /cook.*porridge/,
      /cook.*pancake/,
      /cook.*waffle/,
      /cook.*french toast/,
      /cook.*sandwich/,
      /cook.*wrap/,
      /cook.*pita/,
      /cook.*quesadilla/,
      /cook.*panini/,
      /cook.*soup/,
      /cook.*stew/,
      /cook.*chili/,
      /cook.*gumbo/,
      /cook.*jambalaya/,
      /cook.*casserole/,
      /cook.*lasagna/,
      /cook.*spaghetti/,
      /cook.*mac and cheese/,
      /cook.*fettuccine alfredo/,
      /cook.*carbonara/,
      /cook.*frozen vegetables/,
      /cook.*frozen fruit/,
      /cook.*frozen yogurt/,
      /cook.*ice cream/,
      /cook.*sorbet/,
      /cook.*canned tomatoes/,
      /cook.*canned beans/,
      /cook.*canned corn/,
      /cook.*canned tuna/,
      /cook.*canned salmon/,
      /cook.*canned soup/,
      /cook.*frozen pizza/,
      /cook.*frozen dinner/,
      /cook.*frozen burrito/,
      /cook.*kombucha/,
      /cook.*kefir/,
      /cook.*kimchi/,
      /cook.*sauerkraut/,
      /cook.*pickles/,
      /cook.*olives/,
      /cook.*nutritional yeast/,
      /cook.*spirulina/,
      /cook.*chlorella/,
      /cook.*wheatgrass/,
      /cook.*acai/,
      /cook.*goji berry/,
      /cook.*maca/,
      /cook.*turmeric/,
      /cook.*ginger/,
      /cook.*garlic/,
      /cook.*onion/,
      /cook.*superfood/,
      /cook.*antioxidant/,
      /cook.*probiotic/,
      /cook.*prebiotic/,
      /cook.*fiber/,
      /cook.*almaza/,
      /cook.*lebanese beer/,
      /cook.*kibbeh/,
      /cook.*kebab/,
      /cook.*shawarma/,
      /cook.*manakish/,
      /cook.*zaatar/,
      /cook.*labneh/,
      /cook.*fatteh/,
      /cook.*mujadara/,
      /cook.*foul/,
      /cook.*fatteh/,
      /cook.*knafeh/,
      /cook.*baklava/,
      /cook.*maamoul/,
      /cook.*halva/,
      /cook.*tahini/,
      /cook.*pita bread/,
      /cook.*lavash/,
      /cook.*acorn squash/,
      /cook.*adzuki bean/,
      /cook.*aioli/,
      /cook.*albacore/,
      /cook.*alfalfa sprout/,
      /cook.*amaranth/,
      /cook.*anchovy/,
      /cook.*anise/,
      /cook.*apricot/,
      /cook.*arugula/,
      /cook.*asparagus/,
      /cook.*aubergine/,
      /cook.*avocado/,
      /cook.*bacon/,
      /cook.*bagel/,
      /cook.*balsamic/,
      /cook.*banana/,
      /cook.*barley/,
      /cook.*basil/,
      /cook.*bay leaf/,
      /cook.*bean sprout/,
      /cook.*beef/,
      /cook.*beet/,
      /cook.*bell pepper/,
      /cook.*black bean/,
      /cook.*blackberry/,
      /cook.*blue cheese/,
      /cook.*blueberry/,
      /cook.*bok choy/,
      /cook.*brie/,
      /cook.*broccoli/,
      /cook.*brown rice/,
      /cook.*brussels sprout/,
      /cook.*buckwheat/,
      /cook.*bulgur/,
      /cook.*butter/,
      /cook.*butternut squash/,
      /cook.*cabbage/,
      /cook.*camembert/,
      /cook.*cantaloupe/,
      /cook.*capers/,
      /cook.*caramel/,
      /cook.*cardamom/,
      /cook.*carrot/,
      /cook.*cashew/,
      /cook.*cauliflower/,
      /cook.*cayenne/,
      /cook.*celery/,
      /cook.*cheddar/,
      /cook.*cherry/,
      /cook.*chicken/,
      /cook.*chickpea/,
      /cook.*chili/,
      /cook.*chive/,
      /cook.*chocolate/,
      /cook.*cilantro/,
      /cook.*cinnamon/,
      /cook.*clove/,
      /cook.*coconut/,
      /cook.*cod/,
      /cook.*coffee/,
      /cook.*collard green/,
      /cook.*corn/,
      /cook.*cottage cheese/,
      /cook.*couscous/,
      /cook.*cranberry/,
      /cook.*cream/,
      /cook.*cream cheese/,
      /cook.*cucumber/,
      /cook.*cumin/,
      /cook.*curry/,
      /cook.*dandelion green/,
      /cook.*date/,
      /cook.*dill/,
      /cook.*duck/,
      /cook.*edamame/,
      /cook.*egg/,
      /cook.*eggplant/,
      /cook.*endive/,
      /cook.*fennel/,
      /cook.*fig/,
      /cook.*fish/,
      /cook.*flax seed/,
      /cook.*french bean/,
      /cook.*garlic/,
      /cook.*ginger/,
      /cook.*goat cheese/,
      /cook.*goose/,
      /cook.*gorgonzola/,
      /cook.*gouda/,
      /cook.*grape/,
      /cook.*grapefruit/,
      /cook.*green bean/,
      /cook.*green pepper/,
      /cook.*grouper/,
      /cook.*gruyere/,
      /cook.*guava/,
      /cook.*halibut/,
      /cook.*ham/,
      /cook.*hazelnut/,
      /cook.*honey/,
      /cook.*honeydew/,
      /cook.*horseradish/,
      /cook.*hummus/,
      /cook.*ice cream/,
      /cook.*jalapeno/,
      /cook.*jicama/,
      /cook.*kale/,
      /cook.*ketchup/,
      /cook.*kidney bean/,
      /cook.*kiwi/,
      /cook.*kohlrabi/,
      /cook.*lamb/,
      /cook.*leek/,
      /cook.*lemon/,
      /cook.*lentil/,
      /cook.*lettuce/,
      /cook.*lime/,
      /cook.*lobster/,
      /cook.*macadamia/,
      /cook.*mackerel/,
      /cook.*mango/,
      /cook.*maple syrup/,
      /cook.*mayonnaise/,
      /cook.*milk/,
      /cook.*mint/,
      /cook.*miso/,
      /cook.*mozzarella/,
      /cook.*mushroom/,
      /cook.*mustard/,
      /cook.*nectarine/,
      /cook.*nori/,
      /cook.*nutmeg/,
      /cook.*oat/,
      /cook.*okra/,
      /cook.*olive/,
      /cook.*onion/,
      /cook.*orange/,
      /cook.*oregano/,
      /cook.*oyster/,
      /cook.*papaya/,
      /cook.*paprika/,
      /cook.*parmesan/,
      /cook.*parsley/,
      /cook.*passion fruit/,
      /cook.*pasta/,
      /cook.*peach/,
      /cook.*peanut/,
      /cook.*pear/,
      /cook.*peas/,
      /cook.*pecan/,
      /cook.*pepper/,
      /cook.*persimmon/,
      /cook.*pickle/,
      /cook.*pineapple/,
      /cook.*pistachio/,
      /cook.*pita/,
      /cook.*plum/,
      /cook.*pomegranate/,
      /cook.*pomelo/,
      /cook.*pork/,
      /cook.*potato/,
      /cook.*prosciutto/,
      /cook.*provolone/,
      /cook.*prune/,
      /cook.*pumpkin/,
      /cook.*quail/,
      /cook.*quinoa/,
      /cook.*radicchio/,
      /cook.*radish/,
      /cook.*raisin/,
      /cook.*raspberry/,
      /cook.*rhubarb/,
      /cook.*rice/,
      /cook.*ricotta/,
      /cook.*romano/,
      /cook.*rosemary/,
      /cook.*rutabaga/,
      /cook.*rye/,
      /cook.*sage/,
      /cook.*salmon/,
      /cook.*sardine/,
      /cook.*sauerkraut/,
      /cook.*scallion/,
      /cook.*scallop/,
      /cook.*sea bass/,
      /cook.*sesame/,
      /cook.*shallot/,
      /cook.*shrimp/,
      /cook.*snap pea/,
      /cook.*snow pea/,
      /cook.*sole/,
      /cook.*sorrel/,
      /cook.*sour cream/,
      /cook.*soy/,
      /cook.*soy sauce/,
      /cook.*spaghetti/,
      /cook.*spinach/,
      /cook.*squash/,
      /cook.*squid/,
      /cook.*star fruit/,
      /cook.*strawberry/,
      /cook.*string bean/,
      /cook.*sugar/,
      /cook.*sunflower seed/,
      /cook.*sweet potato/,
      /cook.*swiss cheese/,
      /cook.*swordfish/,
      /cook.*syrup/,
      /cook.*tangerine/,
      /cook.*tapioca/,
      /cook.*tarragon/,
      /cook.*tea/,
      /cook.*thyme/,
      /cook.*tilapia/,
      /cook.*tofu/,
      /cook.*tomato/,
      /cook.*truffle/,
      /cook.*tuna/,
      /cook.*turkey/,
      /cook.*turnip/,
      /cook.*vanilla/,
      /cook.*veal/,
      /cook.*vegetable/,
      /cook.*venison/,
      /cook.*vinegar/,
      /cook.*walnut/,
      /cook.*water chestnut/,
      /cook.*watercress/,
      /cook.*watermelon/,
      /cook.*wheat/,
      /cook.*wine/,
      /cook.*yogurt/,
      /cook.*zucchini/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isHealthAdvice(input: string): boolean {
    const patterns = [
      /how.*lose.*weight/,
      /how.*gain.*weight/,
      /healthy.*eating/,
      /diet.*tips/,
      /what.*avoid/,
      /best.*foods/,
      /nutrition.*advice/,
      /eating.*habits/,
      /weight.*loss/,
      /weight.*gain/,
      /muscle.*building/,
      /fat.*burning/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isFoodInfo(input: string): boolean {
    const patterns = [
      /what.*is.*/,
      /tell.*about/,
      /explain.*/,
      /benefits.*of/,
      /side.*effects/,
      /good.*for/,
      /bad.*for/,
      /what.*are/,
      /what.*does/,
      /what.*can/,
      /what.*should/,
      /what.*would/,
      /what.*do/,
      /describe/,
      /define/,
      /meaning/,
      /about/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isGreeting(input: string): boolean {
    const patterns = [
      /^hi/,
      /^hello/,
      /^hey/,
      /^good morning/,
      /^good afternoon/,
      /^good evening/,
      /how.*are.*you/,
      /what.*can.*you.*do/,
      /tell.*me.*about.*yourself/,
      /who.*are.*you/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isRecipeRequest(input: string): boolean {
    const patterns = [
      // Direct recipe requests
      /recipe/,
      /recipes/,
      /how.*to.*make/,
      /how.*do.*i.*make/,
      /how.*can.*i.*cook/,
      /how.*to.*cook/,
      /cooking.*recipe/,
      /dish.*recipe/,
      /meal.*recipe/,
      
      // Food + recipes pattern (like "pasta recipes")
      /\w+.*recipes/,
      /\w+.*recipe/,
      
      // Suggestion patterns
      /suggest.*recipe/,
      /recommend.*recipe/,
      /give.*me.*recipe/,
      /show.*me.*recipe/,
      /find.*me.*recipe/,
      /what.*can.*i.*cook/,
      /what.*should.*i.*cook/,
      /what.*to.*cook/,
      
      // Specific recipe types
      /easy.*recipe/,
      /quick.*recipe/,
      /simple.*recipe/,
      /fast.*recipe/,
      /healthy.*recipe/,
      /nutritious.*recipe/,
      /low.*calorie.*recipe/,
      /high.*protein.*recipe/,
      
      // Dietary specific recipes
      /vegetarian.*recipe/,
      /vegan.*recipe/,
      /gluten.*free.*recipe/,
      /dairy.*free.*recipe/,
      /keto.*recipe/,
      /paleo.*recipe/,
      /low.*carb.*recipe/,
      /high.*protein.*recipe/,
      
      // Cuisine specific recipes
      /mediterranean.*recipe/,
      /italian.*recipe/,
      /chinese.*recipe/,
      /mexican.*recipe/,
      /indian.*recipe/,
      /lebanese.*recipe/,
      /middle.*eastern.*recipe/,
      /asian.*recipe/,
      /european.*recipe/,
      /american.*recipe/,
      /japanese.*recipe/,
      /thai.*recipe/,
      /french.*recipe/,
      /greek.*recipe/,
      
      // Cooking method requests
      /how.*to.*bake/,
      /how.*to.*fry/,
      /how.*to.*grill/,
      /how.*to.*boil/,
      /how.*to.*steam/,
      /how.*to.*roast/,
      /how.*to.*sauté/,
      
      // Ingredient-based requests
      /what.*can.*i.*make.*with/,
      /recipe.*with/,
      /using.*ingredients/,
      /with.*what.*i.*have/,
      
      // Time-based requests
      /quick.*meal/,
      /fast.*meal/,
      /easy.*meal/,
      /simple.*meal/,
      /30.*minute.*meal/,
      /15.*minute.*meal/,
      /one.*pot.*meal/,
      /one.*pan.*meal/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isMealPlanning(input: string): boolean {
    const patterns = [
      // Direct meal planning
      /meal.*plan/,
      /meal.*suggestion/,
      /meal.*recommendation/,
      /meal.*idea/,
      /meal.*prep/,
      /meal.*preparation/,
      
      // What to eat questions
      /what.*to.*eat/,
      /what.*should.*i.*eat/,
      /what.*can.*i.*eat/,
      /what.*do.*i.*eat/,
      /what.*for.*dinner/,
      /what.*for.*lunch/,
      /what.*for.*breakfast/,
      /what.*for.*snack/,
      
      // Specific meal types
      /breakfast.*idea/,
      /lunch.*idea/,
      /dinner.*idea/,
      /snack.*idea/,
      /morning.*meal/,
      /midday.*meal/,
      /evening.*meal/,
      /supper/,
      
      // Meal characteristics
      /balanced.*meal/,
      /quick.*meal/,
      /fast.*meal/,
      /easy.*meal/,
      /simple.*meal/,
      /healthy.*meal/,
      /nutritious.*meal/,
      /light.*meal/,
      /heavy.*meal/,
      /filling.*meal/,
      
      // Menu planning
      /weekly.*menu/,
      /daily.*menu/,
      /menu.*plan/,
      /meal.*schedule/,
      /eating.*plan/,
      /diet.*plan/,
      
      // Suggestion patterns
      /suggest.*meal/,
      /recommend.*meal/,
      /give.*me.*meal/,
      /show.*me.*meal/,
      /find.*me.*meal/,
      
      // Context-based meal requests
      /meal.*for.*/,
      /food.*for.*/,
      /eat.*for.*/,
      /dinner.*for.*/,
      /lunch.*for.*/,
      /breakfast.*for.*/,
      
      // Time-based meal requests
      /morning.*food/,
      /afternoon.*food/,
      /evening.*food/,
      /night.*food/,
      /late.*night.*snack/,
      /midnight.*snack/,
      
      // Goal-based meal requests
      /meal.*for.*weight.*loss/,
      /meal.*for.*muscle.*building/,
      /meal.*for.*energy/,
      /meal.*for.*workout/,
      /meal.*for.*work/,
      /meal.*for.*school/,
      /meal.*for.*kids/,
      /meal.*for.*family/,
      
      // Dietary meal requests
      /vegetarian.*meal/,
      /vegan.*meal/,
      /gluten.*free.*meal/,
      /keto.*meal/,
      /paleo.*meal/,
      /low.*carb.*meal/,
      /high.*protein.*meal/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isFoodComparison(input: string): boolean {
    const patterns = [
      // Direct comparison words
      /compare/,
      /comparison/,
      /vs\./,
      /versus/,
      /v\.s\./,
      
      // Which questions
      /which.*is.*better/,
      /which.*is.*healthier/,
      /which.*is.*worse/,
      /which.*has.*more/,
      /which.*has.*less/,
      /which.*is.*higher/,
      /which.*is.*lower/,
      /which.*one.*is/,
      /which.*should.*i.*choose/,
      /which.*would.*you.*recommend/,
      
      // Difference questions
      /difference.*between/,
      /differences.*between/,
      /what.*is.*the.*difference/,
      /what.*are.*the.*differences/,
      /how.*are.*they.*different/,
      /how.*do.*they.*differ/,
      
      // Better/healthier questions
      /better.*than/,
      /healthier.*than/,
      /worse.*than/,
      /more.*nutritious.*than/,
      /less.*nutritious.*than/,
      /more.*beneficial.*than/,
      /less.*beneficial.*than/,
      
      // Specific nutrient comparisons
      /more.*protein/,
      /less.*protein/,
      /higher.*protein/,
      /lower.*protein/,
      /more.*calories/,
      /less.*calories/,
      /higher.*calories/,
      /lower.*calories/,
      /more.*carbs/,
      /less.*carbs/,
      /higher.*carbs/,
      /lower.*carbs/,
      /more.*fat/,
      /less.*fat/,
      /higher.*fat/,
      /lower.*fat/,
      /more.*fiber/,
      /less.*fiber/,
      /more.*vitamins/,
      /less.*vitamins/,
      /more.*minerals/,
      /less.*minerals/,
      
      // Health comparisons
      /more.*healthy/,
      /less.*healthy/,
      /healthier/,
      /unhealthier/,
      /more.*nutritious/,
      /less.*nutritious/,
      /more.*beneficial/,
      /less.*beneficial/,
      
      // Preference comparisons
      /prefer/,
      /preference/,
      /would.*you.*choose/,
      /should.*i.*pick/,
      /which.*one.*to.*eat/,
      /which.*one.*to.*buy/,
      
      // Ranking questions
      /rank/,
      /ranking/,
      /order.*by/,
      /sort.*by/,
      /best.*to.*worst/,
      /worst.*to.*best/,
      /top.*/,
      /bottom.*/,
      
      // Similarity questions
      /similar.*to/,
      /like.*/,
      /same.*as/,
      /equivalent.*to/,
      /comparable.*to/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isCulturalQuestion(input: string): boolean {
    const patterns = [
      /cultural/,
      /tradition/,
      /traditional/,
      /origin/,
      /history.*of/,
      /where.*does.*come.*from/,
      /cuisine/,
      /country.*food/,
      /regional.*food/,
      /local.*food/,
      /authentic/,
      /classic/,
      /famous.*dish/,
      /national.*dish/,
      /signature.*dish/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isDietaryPreference(input: string): boolean {
    const patterns = [
      /vegetarian/,
      /vegan/,
      /gluten.*free/,
      /dairy.*free/,
      /keto/,
      /paleo/,
      /low.*carb/,
      /high.*protein/,
      /mediterranean/,
      /dash.*diet/,
      /intermittent.*fasting/,
      /allergy/,
      /intolerant/,
      /dietary.*restriction/,
      /food.*sensitivity/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private isPreferenceLearning(input: string): boolean {
    const patterns = [
      /i.*like/,
      /i.*love/,
      /i.*hate/,
      /i.*dislike/,
      /i.*prefer/,
      /my.*favorite/,
      /i.*don.*t.*like/,
      /i.*can.*t.*eat/,
      /i.*avoid/,
      /remember.*that/,
      /i.*am.*allergic/,
      /i.*have.*allergy/,
      /i.*am.*vegetarian/,
      /i.*am.*vegan/,
      /i.*follow.*/,
      /my.*diet.*is/,
      /i.*want.*to.*lose.*weight/,
      /i.*want.*to.*gain.*weight/,
      /i.*want.*to.*build.*muscle/,
      /my.*goal.*is/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  private async handleNutritionQuestion(input: string, foodName: string, questionType: string): Promise<string> {
    if (!foodName) {
      return "I'd be happy to provide nutrition information! Could you tell me which specific food or ingredient you're asking about? For example, you could ask 'How many calories are in an apple?' or 'What's the protein content of chicken breast?'";
    }

    try {
      const foodInfo = await this.databaseService.getNutritionFacts(foodName);
      
      if (foodInfo) {
        const response = this.formatNutritionResponse(foodInfo, input, questionType);
        return response;
      } else {
        // Try to find similar foods or provide general information
        return this.handleFoodNotFound(foodName, questionType);
      }
    } catch (error) {
      logger.error('Error fetching food info:', error);
      return this.handleFoodNotFound(foodName, questionType);
    }
  }

  private handleFoodNotFound(foodName: string, questionType: string): string {
    // Provide general information based on food type
    const generalInfo = this.getGeneralFoodInfo(foodName, questionType);
    
    let response = `I don't have specific nutrition information for "${foodName}" in my database. `;
    response += generalInfo;
    response += `\n\n**Suggestions:**\n`;
    response += `• Try asking about a more specific food name\n`;
    response += `• Ask about common foods like "apple", "chicken breast", "rice", "bread"\n`;
    response += `• Use the food logging feature to add this food to your meals\n`;
    
    return response;
  }

  private getGeneralFoodInfo(foodName: string, questionType: string): string {
    const lowerFoodName = foodName.toLowerCase();
    
    // General nutrition info based on food type
    if (lowerFoodName.includes('rice') || lowerFoodName.includes('grain')) {
      return `**General Rice Information:**\n• Rice is a good source of carbohydrates\n• Brown rice has more fiber than white rice\n• 1 cup cooked rice ≈ 200 calories\n• Contains B vitamins and minerals`;
    } else if (lowerFoodName.includes('chicken') || lowerFoodName.includes('poultry')) {
      return `**General Chicken Information:**\n• Chicken breast is high in protein (≈25g per 100g)\n• Low in fat and calories\n• Good source of B vitamins\n• 100g chicken breast ≈ 165 calories`;
    } else if (lowerFoodName.includes('apple') || lowerFoodName.includes('fruit')) {
      return `**General Apple Information:**\n• Apples are high in fiber and vitamin C\n• Low in calories (≈52 calories per 100g)\n• Good source of antioxidants\n• Natural sugars provide energy`;
    } else if (lowerFoodName.includes('bread') || lowerFoodName.includes('wheat')) {
      return `**General Bread Information:**\n• Bread provides carbohydrates for energy\n• Whole grain bread has more fiber\n• 1 slice bread ≈ 75-100 calories\n• Contains B vitamins and minerals`;
    } else if (lowerFoodName.includes('vegetable') || lowerFoodName.includes('veggie')) {
      return `**General Vegetable Information:**\n• Vegetables are low in calories\n• High in vitamins, minerals, and fiber\n• Great for weight management\n• Different colors provide different nutrients`;
    } else {
      return `**General Food Information:**\n• Most whole foods are nutritious\n• Focus on variety and balance\n• Fresh foods are generally healthier than processed\n• Check nutrition labels for specific information`;
    }
  }

  private async handleCookingQuestion(input: string, foodName: string, questionType: string): Promise<string> {
    if (!foodName) {
      return "I'd be happy to help with cooking information! Could you please specify which food you'd like cooking advice for? For example, 'How to cook chicken breast?' or 'Cooking time for rice'";
    }

    // Check if asking specifically about cooking time
    if (input.toLowerCase().includes('how much') && input.toLowerCase().includes('cook')) {
      return this.getCookingTimeInfo(foodName);
    }

    // Check if asking about cooking method
    if (input.toLowerCase().includes('how to cook') || input.toLowerCase().includes('how do you cook')) {
      return this.getCookingMethodInfo(foodName);
    }

    // Default to full cooking info
    const cookingInfo = this.getCookingInfo(foodName, questionType);
    return cookingInfo;
  }

  private getCookingInfo(foodName: string, questionType: string): string {
    const cookingData: { [key: string]: any } = {
      'chicken breast': {
        methods: ['bake', 'grill', 'pan-fry', 'poach'],
        times: { bake: '20-25 min at 400°F', grill: '6-8 min per side', 'pan-fry': '6-8 min per side', poach: '12-15 min' },
        temperature: '165°F internal',
        tips: 'Let rest 5 minutes before slicing'
      },
      'chicken': {
        methods: ['bake', 'grill', 'roast', 'fry'],
        times: { bake: '25-30 min at 375°F', grill: '8-10 min per side', roast: '20 min per lb at 350°F', fry: '8-10 min' },
        temperature: '165°F internal',
        tips: 'Check doneness with meat thermometer'
      },
      'salmon': {
        methods: ['bake', 'grill', 'pan-fry', 'poach'],
        times: { bake: '12-15 min at 400°F', grill: '4-6 min per side', 'pan-fry': '4-5 min per side', poach: '8-10 min' },
        temperature: '145°F internal',
        tips: 'Cook until flesh flakes easily'
      },
      'beef': {
        methods: ['grill', 'pan-fry', 'roast', 'braise'],
        times: { grill: '4-6 min per side', 'pan-fry': '3-4 min per side', roast: '15-20 min per lb', braise: '2-3 hours' },
        temperature: '145°F for medium-rare',
        tips: 'Let rest 10-15 minutes before slicing'
      },
      'pork': {
        methods: ['bake', 'grill', 'pan-fry', 'roast'],
        times: { bake: '20-25 min at 375°F', grill: '6-8 min per side', 'pan-fry': '5-6 min per side', roast: '20 min per lb' },
        temperature: '145°F internal',
        tips: 'Slightly pink center is safe and tender'
      },
      'fish': {
        methods: ['bake', 'grill', 'pan-fry', 'steam'],
        times: { bake: '10-12 min at 400°F', grill: '4-6 min per side', 'pan-fry': '3-4 min per side', steam: '8-10 min' },
        temperature: '145°F internal',
        tips: 'Fish is done when it flakes easily'
      },
      'rice': {
        methods: ['boil', 'steam', 'rice cooker'],
        times: { boil: '15-20 min', steam: '20-25 min', 'rice cooker': '15-20 min' },
        ratio: '1.5-2 cups water per 1 cup rice',
        waterRatio: '1.5-2 cups water per 1 cup rice',
        cookingTime: '15-20 minutes',
        detailedInstructions: [
          'Rinse rice until water runs clear',
          'Add rice and water to pot (1.5-2 cups water per 1 cup rice)',
          'Bring to boil, then reduce heat to low',
          'Cover and simmer for 15-20 minutes',
          'Remove from heat and let stand 5 minutes',
          'Fluff with fork before serving'
        ],
        tips: [
          'Don\'t lift the lid while cooking',
          'Let it rest after cooking for better texture',
          'For brown rice: use 2 cups water and cook 40-45 minutes',
          'For basmati rice: use 1.5 cups water and cook 15-18 minutes'
        ]
      },
      'pasta': {
        methods: ['boil'],
        times: { boil: '8-12 min depending on type' },
        ratio: '4-6 quarts water per pound',
        tips: 'Salt the water generously'
      },
      'potato': {
        methods: ['bake', 'boil', 'roast', 'fry'],
        times: { bake: '45-60 min at 400°F', boil: '15-20 min', roast: '30-45 min at 425°F', fry: '3-5 min' },
        temperature: 'Fork tender',
        tips: 'Pierce skin before baking'
      },
      'vegetables': {
        methods: ['steam', 'roast', 'sauté', 'boil'],
        times: { steam: '5-10 min', roast: '15-25 min at 425°F', sauté: '5-8 min', boil: '3-8 min' },
        tips: 'Don\'t overcook - keep them crisp-tender'
      }
    };

    const food = cookingData[foodName.toLowerCase()];
    if (!food) {
      return `I don't have specific cooking information for "${foodName}" in my database. However, here are some general cooking tips:\n\n• Always preheat your oven/pan\n• Use a meat thermometer for proteins\n• Don't overcrowd the pan when sautéing\n• Let meat rest before slicing\n• Taste and season as you go\n\nWhat specific cooking method would you like to know about?`;
    }

    let response = `**🍚 How to Cook ${foodName.charAt(0).toUpperCase() + foodName.slice(1)}:**\n\n`;
    
    // For rice, show detailed instructions
    if (foodName.toLowerCase() === 'rice' && food.detailedInstructions) {
      response += `**Water Ratio:** ${food.waterRatio || food.ratio}\n`;
      response += `**Cooking Time:** ${food.cookingTime || '15-20 minutes'}\n\n`;
      response += `**Method:**\n`;
      food.detailedInstructions.forEach((step: string, index: number) => {
        response += `${index + 1}. ${step}\n`;
      });
      response += '\n';
      
      if (food.tips && Array.isArray(food.tips)) {
        response += `**Tips:**\n`;
        food.tips.forEach((tip: string) => {
          response += `• ${tip}\n`;
        });
      } else if (food.tips) {
        response += `**Tips:** ${food.tips}\n`;
      }
    } else {
      // For other foods, use the original format
      if (food.methods) {
        response += `**Cooking Methods:** ${food.methods.join(', ')}\n\n`;
      }
      
      if (food.times) {
        response += `**Cooking Times:**\n`;
        Object.entries(food.times).forEach(([method, time]) => {
          response += `• ${method}: ${time}\n`;
        });
        response += '\n';
      }
      
      if (food.temperature) {
        response += `**Temperature:** ${food.temperature}\n\n`;
      }
      
      if (food.ratio) {
        response += `**Ratio:** ${food.ratio}\n\n`;
      }
      
      if (food.tips) {
        if (Array.isArray(food.tips)) {
          response += `**Tips:**\n`;
          food.tips.forEach((tip: string) => {
            response += `• ${tip}\n`;
          });
        } else {
          response += `**Tips:** ${food.tips}\n`;
        }
      }
    }

    return response;
  }

  private handleHealthAdvice(input: string): string {
    const advice = this.getHealthAdvice(input);
    return advice;
  }

  private async handleFoodInfo(input: string, foodName: string): Promise<string> {
    if (!foodName) {
      return "I'd be happy to tell you about any food! What specific food would you like to know about?";
    }

    try {
      const foodInfo = await this.databaseService.getNutritionFacts(foodName);
      
      if (foodInfo) {
        return this.formatFoodInfoResponse(foodInfo, foodName);
      } else {
        return `I don't have specific information about "${foodName}" in my database. However, I can help you with general food information or nutrition advice. What would you like to know?`;
      }
    } catch (error) {
      logger.error('Error fetching food info:', error);
      return `I encountered an error while fetching information about "${foodName}". Please try again or ask about a different food item.`;
    }
  }

  private formatNutritionResponse(foodInfo: any, input: string, questionType: string): string {
    const { name, calories, protein, carbs, fat, fiber, sugar, sodium, category } = foodInfo;
    
    let response = `**${name}** (${category})\n\n`;
    
    // Focus on specific question type
    switch (questionType) {
      case 'calories':
        response += `🔥 **Calories:** ${calories} per 100g\n`;
        break;
      case 'protein':
        response += `💪 **Protein:** ${protein}g per 100g\n`;
        break;
      case 'carbs':
        response += `🍞 **Carbs:** ${carbs}g per 100g\n`;
        break;
      case 'fat':
        response += `🥑 **Fat:** ${fat}g per 100g\n`;
        break;
      case 'fiber':
        response += `🌾 **Fiber:** ${fiber}g per 100g\n`;
        break;
      case 'sugar':
        response += `🍯 **Sugar:** ${sugar}g per 100g\n`;
        break;
      case 'sodium':
        response += `🧂 **Sodium:** ${sodium}mg per 100g\n`;
        break;
      case 'vitamins':
        response += `🥕 **Vitamins:** Rich in various vitamins (exact amounts vary)\n`;
        break;
      case 'minerals':
        response += `⚡ **Minerals:** Contains essential minerals (exact amounts vary)\n`;
        break;
      case 'health':
        response += `💚 **Health Benefits:** Generally healthy food choice\n`;
        break;
      default:
        // Show all nutrition info
        response += `**Nutrition per 100g:**\n`;
        response += `🔥 Calories: ${calories}\n`;
        response += `💪 Protein: ${protein}g\n`;
        response += `🍞 Carbs: ${carbs}g\n`;
        response += `🥑 Fat: ${fat}g\n`;
        response += `🌾 Fiber: ${fiber}g\n`;
        response += `🍯 Sugar: ${sugar}g\n`;
        response += `🧂 Sodium: ${sodium}mg\n`;
    }
    
    // Add general tips based on question type
    if (questionType === 'calories') {
      response += `\n💡 **Tip:** This is a ${calories < 100 ? 'low' : calories < 300 ? 'moderate' : 'high'} calorie food.`;
    } else if (questionType === 'protein') {
      response += `\n💡 **Tip:** This is a ${protein > 20 ? 'high' : protein > 10 ? 'moderate' : 'low'} protein food.`;
    } else if (questionType === 'carbs') {
      response += `\n💡 **Tip:** This is a ${carbs > 50 ? 'high' : carbs > 20 ? 'moderate' : 'low'} carb food.`;
    }
    
    return response;
  }

  private formatFoodInfoResponse(foodInfo: any, foodName: string): string {
    const { name, calories, protein, carbs, fat, fiber, sugar, sodium, category, description } = foodInfo;
    
    let response = `**${name}** (${category})\n\n`;
    
    if (description) {
      response += `📝 **Description:** ${description}\n\n`;
    }
    
    response += `**Nutrition per 100g:**\n`;
    response += `🔥 Calories: ${calories}\n`;
    response += `💪 Protein: ${protein}g\n`;
    response += `🍞 Carbs: ${carbs}g\n`;
    response += `🥑 Fat: ${fat}g\n`;
    response += `🌾 Fiber: ${fiber}g\n`;
    response += `🍯 Sugar: ${sugar}g\n`;
    response += `🧂 Sodium: ${sodium}mg\n\n`;
    
    // Add health benefits based on nutrition
    response += `**Health Benefits:**\n`;
    if (protein > 15) response += `• High protein content for muscle building\n`;
    if (fiber > 5) response += `• High fiber for digestive health\n`;
    if (sugar < 5) response += `• Low sugar content\n`;
    if (sodium < 200) response += `• Low sodium content\n`;
    if (calories < 100) response += `• Low calorie density\n`;
    
    return response;
  }

  // Advanced nutrition analysis and health recommendations
  private getAdvancedNutritionAnalysis(foodName: string): string {
    const nutritionData = this.getNutritionData(foodName);
    if (!nutritionData) return "I don't have detailed nutrition data for that food.";
    
    let analysis = `**🔬 Advanced Nutrition Analysis for ${foodName}:**\n\n`;
    
    // Macronutrient analysis
    analysis += `**📊 Macronutrients (per 100g):**\n`;
    analysis += `• Calories: ${nutritionData.calories} kcal\n`;
    analysis += `• Protein: ${nutritionData.protein}g (${((nutritionData.protein * 4) / nutritionData.calories * 100).toFixed(1)}% of calories)\n`;
    analysis += `• Carbohydrates: ${nutritionData.carbs}g (${((nutritionData.carbs * 4) / nutritionData.calories * 100).toFixed(1)}% of calories)\n`;
    analysis += `• Fat: ${nutritionData.fat}g (${((nutritionData.fat * 9) / nutritionData.calories * 100).toFixed(1)}% of calories)\n`;
    analysis += `• Fiber: ${nutritionData.fiber}g\n\n`;
    
    // Micronutrient analysis
    analysis += `**🧪 Micronutrients:**\n`;
    analysis += `• Vitamin C: ${nutritionData.vitaminC || 'N/A'}mg\n`;
    analysis += `• Iron: ${nutritionData.iron || 'N/A'}mg\n`;
    analysis += `• Calcium: ${nutritionData.calcium || 'N/A'}mg\n`;
    analysis += `• Potassium: ${nutritionData.potassium || 'N/A'}mg\n`;
    analysis += `• Sodium: ${nutritionData.sodium || 'N/A'}mg\n\n`;
    
    // Health benefits
    analysis += `**💚 Health Benefits:**\n`;
    if (nutritionData.protein > 20) analysis += `• High protein content for muscle building\n`;
    if (nutritionData.fiber > 5) analysis += `• High fiber for digestive health\n`;
    if (nutritionData.vitaminC && nutritionData.vitaminC > 50) analysis += `• Rich in Vitamin C for immune support\n`;
    if (nutritionData.iron && nutritionData.iron > 5) analysis += `• Good source of iron for blood health\n`;
    if (nutritionData.calories < 100) analysis += `• Low calorie density for weight management\n`;
    
    // Dietary considerations
    analysis += `\n**⚠️ Dietary Considerations:**\n`;
    if (nutritionData.sodium && nutritionData.sodium > 500) analysis += `• High sodium content - monitor intake\n`;
    if (nutritionData.fat > 15) analysis += `• High fat content - consume in moderation\n`;
    if (nutritionData.carbs > 50) analysis += `• High carbohydrate content - consider timing\n`;
    
    return analysis;
  }

  // Get comprehensive nutrition data
  private getNutritionData(foodName: string): any {
    // This would typically come from a comprehensive nutrition database
    // For now, returning sample data
    const nutritionDatabase: { [key: string]: any } = {
      'chicken': {
        calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0,
        vitaminC: 0, iron: 1, calcium: 15, potassium: 256, sodium: 74
      },
      'salmon': {
        calories: 208, protein: 25, carbs: 0, fat: 12, fiber: 0,
        vitaminC: 0, iron: 0.8, calcium: 12, potassium: 363, sodium: 59
      },
      'broccoli': {
        calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6,
        vitaminC: 89, iron: 0.7, calcium: 47, potassium: 316, sodium: 33
      },
      'quinoa': {
        calories: 120, protein: 4.4, carbs: 22, fat: 1.9, fiber: 2.8,
        vitaminC: 0, iron: 1.5, calcium: 17, potassium: 172, sodium: 7
      }
    };
    
    return nutritionDatabase[foodName.toLowerCase()] || null;
  }

  // Advanced health recommendations based on user profile
  private getPersonalizedHealthRecommendations(foodName: string): string {
    let recommendations = `**🎯 Personalized Health Recommendations for ${foodName}:**\n\n`;
    
    // Based on user preferences and health conditions
    if (this.userPreferences.healthConditions?.includes('diabetes')) {
      recommendations += `• **Diabetes-friendly**: Monitor carbohydrate intake and pair with protein\n`;
    }
    
    if (this.userPreferences.healthConditions?.includes('heart disease')) {
      recommendations += `• **Heart health**: Consider sodium content and saturated fat levels\n`;
    }
    
    if (this.userPreferences.fitnessGoals?.includes('weight loss')) {
      recommendations += `• **Weight loss**: Focus on portion control and calorie density\n`;
    }
    
    if (this.userPreferences.fitnessGoals?.includes('muscle building')) {
      recommendations += `• **Muscle building**: Excellent protein source for recovery\n`;
    }
    
    // Based on lifestyle
    if (this.userPreferences.lifestyle === 'athletic') {
      recommendations += `• **Athletic performance**: Great for pre/post workout nutrition\n`;
    }
    
    if (this.userPreferences.ageGroup === 'senior') {
      recommendations += `• **Senior nutrition**: Consider ease of digestion and nutrient density\n`;
    }
    
    return recommendations;
  }

  private handleGreeting(): string {
    // Context-aware greeting based on conversation history and mood
    const timeOfDay = new Date().getHours();
    const timeGreeting = timeOfDay < 12 ? "Good morning" : timeOfDay < 18 ? "Good afternoon" : "Good evening";
    
    let baseGreeting = `${timeGreeting}! I'm your comprehensive food and nutrition assistant! 👋`;
    
    // Add context based on conversation history
    if (this.conversationContext.lastFood) {
      baseGreeting += ` I see we were discussing ${this.conversationContext.lastFood} earlier.`;
    }
    
    if (this.conversationContext.userMood === 'positive') {
      baseGreeting += " I'm glad you're enjoying our conversation!";
    } else if (this.conversationContext.userMood === 'negative') {
      baseGreeting += " I'm here to help make things better!";
    }
    
    // Add personality-based greeting
    if (this.conversationContext.userPersonality === 'enthusiastic') {
      baseGreeting += " I can feel your excitement about food!";
    } else if (this.conversationContext.userPersonality === 'scientific') {
      baseGreeting += " I'm ready to dive deep into the science of nutrition!";
    } else if (this.conversationContext.userPersonality === 'casual') {
      baseGreeting += " Let's keep it fun and easy!";
    }
    
    return `${baseGreeting}

I can help with cooking, nutrition, and recipes! 

What would you like to know?`;
  }

  // Get concise cooking time information
  private getCookingTimeInfo(foodName: string): string {
    const cookingTimes: { [key: string]: string } = {
      'rice': '15-20 minutes',
      'chicken': '20-25 minutes (breast), 35-40 minutes (thighs)',
      'pasta': '8-12 minutes',
      'salmon': '12-15 minutes',
      'beef': '4-6 minutes per side (steak), 20-25 minutes (roast)',
      'fish': '10-15 minutes',
      'vegetables': '5-10 minutes (steamed), 15-20 minutes (roasted)',
      'eggs': '3-4 minutes (soft), 6-7 minutes (hard)',
      'potato': '20-30 minutes (baked), 15-20 minutes (boiled)',
      'quinoa': '15-20 minutes',
      'oats': '5-10 minutes',
      'lentils': '20-30 minutes',
      'beans': '45-60 minutes (dried), 10-15 minutes (canned)'
    };

    const time = cookingTimes[foodName.toLowerCase()] || 'Cooking time varies by method and size';
    return `**⏱️ Cooking Time for ${foodName.charAt(0).toUpperCase() + foodName.slice(1)}:**\n\n${time}`;
  }

  // Get concise cooking method information
  private getCookingMethodInfo(foodName: string): string {
    const cookingMethods: { [key: string]: string } = {
      'rice': 'Boil: 1.5-2 cups water per 1 cup rice, simmer 15-20 min',
      'chicken': 'Bake: 400°F for 20-25 min, Grill: 6-8 min per side',
      'pasta': 'Boil in salted water for 8-12 minutes',
      'salmon': 'Bake: 400°F for 12-15 min, Pan-fry: 4-5 min per side',
      'beef': 'Grill: 4-6 min per side, Pan-fry: 3-4 min per side',
      'fish': 'Bake: 400°F for 10-15 min, Pan-fry: 3-4 min per side',
      'vegetables': 'Steam: 5-10 min, Roast: 400°F for 15-20 min',
      'eggs': 'Boil: 3-4 min (soft), 6-7 min (hard), Fry: 2-3 min per side',
      'potato': 'Bake: 400°F for 20-30 min, Boil: 15-20 min',
      'quinoa': 'Boil: 1.5 cups water per 1 cup quinoa, simmer 15-20 min',
      'oats': 'Boil: 1 cup water per 1/2 cup oats, simmer 5-10 min',
      'lentils': 'Boil: 2 cups water per 1 cup lentils, simmer 20-30 min',
      'beans': 'Soak overnight, then boil 45-60 min (or use canned)'
    };

    const method = cookingMethods[foodName.toLowerCase()] || 'Cooking method depends on the specific food and desired result';
    return `**🍳 How to Cook ${foodName.charAt(0).toUpperCase() + foodName.slice(1)}:**\n\n${method}`;
  }

  private handleRecipeRequest(input: string, foodName: string, questionType: string): string {
    const recipes = this.getRecipeDatabase();
    const dietaryFilters = this.extractDietaryFilters(input);
    const cuisineType = this.extractCuisineType(input);
    const difficulty = this.extractDifficulty(input);
    
    let filteredRecipes = recipes;
    
    // Apply dietary filters
    if (dietaryFilters.length > 0) {
      filteredRecipes = filteredRecipes.filter(recipe => 
        dietaryFilters.every(filter => recipe.dietaryTags.includes(filter))
      );
    }
    
    // Apply cuisine filter
    if (cuisineType) {
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.cuisine.toLowerCase().includes(cuisineType.toLowerCase())
      );
    }
    
    // Apply difficulty filter
    if (difficulty) {
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.difficulty === difficulty
      );
    }
    
    if (filteredRecipes.length === 0) {
      return this.getNoRecipesFoundResponse(dietaryFilters, cuisineType, difficulty);
    }
    
    // Select random recipe or specific one if mentioned
    const selectedRecipe = foodName ? 
      filteredRecipes.find(r => r.name.toLowerCase().includes(foodName.toLowerCase())) || filteredRecipes[0] :
      filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)];
    
    return this.formatRecipeResponse(selectedRecipe);
  }

  private handleMealPlanning(input: string, foodName: string, questionType: string): string {
    const mealType = this.extractMealType(input);
    const timeConstraint = this.extractTimeConstraint(input);
    const dietaryFilters = this.extractDietaryFilters(input);
    
    const mealSuggestions = this.getMealSuggestions(mealType, timeConstraint, dietaryFilters);
    
    return this.formatMealSuggestions(mealSuggestions, mealType, timeConstraint);
  }

  private handleFoodComparison(input: string, foodName: string, questionType: string): string {
    const foods = this.extractFoodsForComparison(input);
    if (foods.length < 2) {
      return "I'd be happy to compare foods for you! Please mention at least two foods to compare. For example: 'Compare chicken vs fish' or 'Which has more protein: beef or salmon?'";
    }
    
    const comparisonData = this.getFoodComparisonData(foods);
    return this.formatFoodComparison(comparisonData, input);
  }

  private handleCulturalQuestion(input: string, foodName: string, questionType: string): string {
    if (!foodName) {
      return "I'd love to share cultural food knowledge! What specific food, dish, or cuisine would you like to learn about? For example: 'Tell me about Lebanese cuisine' or 'What's the history of pasta?'";
    }
    
    const culturalInfo = this.getCulturalFoodInfo(foodName);
    return this.formatCulturalResponse(culturalInfo, foodName);
  }

  private handleDietaryPreference(input: string): string {
    const dietaryType = this.extractDietaryType(input);
    const recommendations = this.getDietaryRecommendations(dietaryType);
    
    return this.formatDietaryRecommendations(dietaryType, recommendations);
  }

  private handlePreferenceLearning(input: string): string {
    const preferences = this.extractUserPreferences(input);
    this.updateUserPreferences(preferences);
    
    return this.formatPreferenceConfirmation(preferences);
  }

  private handleError(input: string): string {
    // Context-aware error handling
    let baseResponse = "I apologize, but I encountered an issue processing your request. Let me try to help you in a different way.";
    
    if (this.conversationContext.userMood === 'negative') {
      baseResponse = "I understand your frustration. Let me try to help you better:";
    } else if (this.conversationContext.userMood === 'positive') {
      baseResponse = "Thanks for your patience! Here's what I can do:";
    }
    
    const suggestions = [
      "Try rephrasing your question in a different way",
      "Ask me about a specific food or nutrition topic",
      "Tell me what you're trying to achieve with your question",
      "Ask me to help with cooking, recipes, or meal planning"
    ];
    
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    
    return `${baseResponse}

${randomSuggestion}

I'm here to help with:
• Recipe suggestions and cooking tips
• Nutrition facts and food comparisons  
• Meal planning and dietary advice
• Cultural food knowledge
• Health and wellness guidance

What would you like to know about food and nutrition?`;
  }

  private async handleIntelligentFallback(input: string, foodName: string, questionType: string): Promise<string> {
    const lowerInput = input.toLowerCase();
    
    // If we have a food name, try to provide information about it
    if (foodName && foodName.trim()) {
      return await this.handleFoodInfo(input, foodName);
    }
    
    // Check for common question patterns and provide helpful responses
    if (lowerInput.includes('what') || lowerInput.includes('how') || lowerInput.includes('why') || lowerInput.includes('when') || lowerInput.includes('where')) {
      return await this.handleQuestion(input, foodName);
    }
    
    // Check if it's food/nutrition related
    if (this.isFoodRelated(input)) {
      return await this.handleFoodRelatedQuestion(input, foodName);
    }
    
    // For non-food questions, redirect to food topics
    return "I'm your comprehensive food and nutrition assistant! I can help you with:\n\n🍳 **Cooking & Recipes**\n• How to cook specific foods\n• Recipe suggestions and instructions\n• Cooking techniques and tips\n\n🥗 **Nutrition & Health**\n• Calorie and nutrient information\n• Healthy eating advice\n• Diet recommendations\n\n🍽️ **Meal Planning**\n• Meal suggestions\n• Dietary preferences\n• Food comparisons\n\nWhat food-related question can I help you with?";
  }

  private async handleQuestion(input: string, foodName: string): Promise<string> {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('what') && lowerInput.includes('is')) {
      if (foodName) {
        return await this.handleFoodInfo(input, foodName);
      }
      return "I'd be happy to explain! Could you specify what food or nutrition topic you'd like to know about? For example: 'What is quinoa?' or 'What is protein?'";
    }
    
    if (lowerInput.includes('how')) {
      if (lowerInput.includes('cook') || lowerInput.includes('make') || lowerInput.includes('prepare')) {
        return this.handleCookingQuestion(input, foodName, 'cooking');
      }
      if (lowerInput.includes('healthy') || lowerInput.includes('lose weight') || lowerInput.includes('gain weight')) {
        return this.handleHealthAdvice(input);
      }
      return "I can help with cooking, nutrition, and healthy eating! What specifically would you like to know how to do?";
    }
    
    if (lowerInput.includes('why')) {
      return "I can explain the science behind food and nutrition! What would you like to understand? For example: 'Why is protein important?' or 'Why should I eat vegetables?'";
    }
    
    return "I'm here to help with all your food and nutrition questions! What would you like to know?";
  }

  private async handleFoodRelatedQuestion(input: string, foodName: string): Promise<string> {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('calories') || lowerInput.includes('nutrition') || lowerInput.includes('protein') || lowerInput.includes('carbs')) {
      return await this.handleNutritionQuestion(input, foodName, 'nutrition');
    }
    
    if (lowerInput.includes('cook') || lowerInput.includes('recipe') || lowerInput.includes('make')) {
      return this.handleCookingQuestion(input, foodName, 'cooking');
    }
    
    if (lowerInput.includes('healthy') || lowerInput.includes('good') || lowerInput.includes('bad')) {
      return this.handleHealthAdvice(input);
    }
    
    if (lowerInput.includes('compare') || lowerInput.includes('better') || lowerInput.includes('vs')) {
      return this.handleFoodComparison(input, foodName, 'comparison');
    }
    
    return await this.handleFoodInfo(input, foodName);
  }

  private handleDefault(input: string): string {
    // Check if the question is food/nutrition related
    if (!this.isFoodRelated(input)) {
      return "I specialize only in food, calories, and nutrition questions. Please ask me about:\n\n• Food nutrition facts and calories\n• Healthy eating tips and advice\n• Diet recommendations\n• Weight management strategies\n• Nutrition science explanations\n\nWhat nutrition question can I help you with?";
    }
    
    // Try to provide a helpful response even for unrecognized input
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('calories') || lowerInput.includes('nutrition') || lowerInput.includes('food')) {
      return "I can help you with nutrition information! Try asking something like:\n\n• \"How many calories are in [food name]?\"\n• \"What's the protein content of [food name]?\"\n• \"Tell me about [food name] nutrition\"\n\nWhat specific food would you like to know about?";
    }
    
    if (lowerInput.includes('healthy') || lowerInput.includes('diet') || lowerInput.includes('weight')) {
      return "I can provide healthy eating advice! Try asking:\n\n• \"How to eat healthy?\"\n• \"What are the best foods for weight loss?\"\n• \"Give me healthy eating tips\"\n\nWhat specific health advice are you looking for?";
    }
    
    return "I'm here to help with nutrition and food-related questions! I can provide information about:\n\n• Food nutrition facts and calories\n• Healthy eating tips\n• Diet advice and recommendations\n• Weight management strategies\n• Nutrition science explanations\n\nWhat specific question do you have?";
  }

  private isFoodRelated(input: string): boolean {
    const lowerInput = input.toLowerCase();
    
    // Food and nutrition keywords
    const foodKeywords = [
      'food', 'nutrition', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium',
      'vitamin', 'mineral', 'diet', 'healthy', 'eating', 'meal', 'snack', 'breakfast', 'lunch', 'dinner',
      'weight', 'loss', 'gain', 'muscle', 'energy', 'metabolism', 'hunger', 'satiety',
      'fruit', 'vegetable', 'meat', 'chicken', 'beef', 'fish', 'salmon', 'egg', 'milk', 'cheese',
      'rice', 'pasta', 'bread', 'oats', 'quinoa', 'potato', 'broccoli', 'apple', 'banana', 'avocado',
      'cooking', 'recipe', 'ingredient', 'portion', 'serving', 'macros', 'micronutrients'
    ];
    
    // Check if input contains any food-related keywords
    return foodKeywords.some(keyword => lowerInput.includes(keyword));
  }

  private extractFoodName(input: string): string | null {
    const patterns = [
      /nutrition.*of\s+(.+)/,
      /calories.*in\s+(.+)/,
      /protein.*in\s+(.+)/,
      /carbs.*in\s+(.+)/,
      /is\s+(.+)\s+healthy/,
      /tell.*about\s+(.+)/,
      /what.*is\s+(.+)/,
      /benefits.*of\s+(.+)/
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1].trim();
    }
    
    return null;
  }

  private async getFoodNutritionInfo(foodName: string): Promise<string> {
    // Check if database service is available
    const isDbAvailable = await this.databaseService.isAvailable();
    
    if (!isDbAvailable) {
      // Provide basic nutrition info for common foods as fallback
      const basicInfo = this.getBasicNutritionInfo(foodName);
      if (basicInfo) {
        return basicInfo;
      }
      
      return `I'd love to provide accurate nutrition data for "${foodName}", but I need to be connected to the NutriLens database first. 

To enable real nutrition data:
1. Make sure your MySQL database is running (XAMPP)
2. Import the database schema from database/schema.sql
3. Start the backend server: cd backend && npm install && npm start
4. Restart the frontend application

For now, I can provide general nutrition advice about healthy eating!`;
    }

    try {
      // Get nutrition data from local database
      const nutritionData = await this.databaseService.getNutritionFacts(foodName);
      
      if (!nutritionData) {
        return `I couldn't find specific nutrition data for "${foodName}" in the NutriLens database. Try asking about a more common food item, or check the spelling.`;
      }

      // Convert to internal format
      const food = this.databaseService.convertToInternalFormat(nutritionData);
      
      // Format the response
      let response = `**${food.name}** (${food.serving}):\n\n`;
      response += `• **Calories:** ${food.calories}\n`;
      response += `• **Protein:** ${food.protein}g\n`;
      response += `• **Carbs:** ${food.carbs}g\n`;
      response += `• **Fat:** ${food.fat}g\n`;
      
      if (food.fiber > 0) response += `• **Fiber:** ${food.fiber}g\n`;
      if (food.sugar > 0) response += `• **Sugar:** ${food.sugar}g\n`;
      if (food.sodium > 0) response += `• **Sodium:** ${food.sodium}mg\n`;
      
      if (food.brand) response += `\n*Brand: ${food.brand}*\n`;
      
      // Add health benefits based on food type
      response += `\n${this.getHealthBenefits(food.name, food.category)}`;
      
      return response;
    } catch (error) {
      logger.error('Error fetching nutrition data:', error);
      return `I encountered an error while fetching nutrition data for "${foodName}". Please try again or ask about a different food item.`;
    }
  }

  private getBasicNutritionInfo(foodName: string): string | null {
    const food = foodName.toLowerCase();
    
    const basicNutritionData: { [key: string]: string } = {
      'avocado': '**Avocado** (100g):\n• Calories: 160\n• Protein: 2g\n• Carbs: 9g\n• Fat: 15g\n• Fiber: 7g\n• Sugar: 0.7g\n• Potassium: 485mg\n\nAvocados are rich in healthy monounsaturated fats and fiber, great for heart health.',
      'apple': '**Apple** (100g):\n• Calories: 52\n• Protein: 0.3g\n• Carbs: 14g\n• Fat: 0.2g\n• Fiber: 2.4g\n• Sugar: 10g\n• Vitamin C: 5mg\n\nApples are rich in fiber and antioxidants, great for heart health and digestion.',
      'banana': '**Banana** (100g):\n• Calories: 89\n• Protein: 1.1g\n• Carbs: 23g\n• Fat: 0.3g\n• Fiber: 2.6g\n• Sugar: 12g\n• Potassium: 358mg\n\nBananas are excellent for energy and contain potassium for muscle function.',
      'chicken breast': '**Chicken Breast** (100g):\n• Calories: 165\n• Protein: 31g\n• Carbs: 0g\n• Fat: 3.6g\n• Fiber: 0g\n• Sugar: 0g\n• Sodium: 74mg\n\nChicken breast is a lean protein source, perfect for muscle building and weight management.',
      'salmon': '**Salmon** (100g):\n• Calories: 208\n• Protein: 25g\n• Carbs: 0g\n• Fat: 12g\n• Fiber: 0g\n• Sugar: 0g\n• Omega-3: 1.8g\n\nSalmon is rich in omega-3 fatty acids, great for heart and brain health.',
      'broccoli': '**Broccoli** (100g):\n• Calories: 34\n• Protein: 2.8g\n• Carbs: 7g\n• Fat: 0.4g\n• Fiber: 2.6g\n• Sugar: 1.5g\n• Vitamin C: 89mg\n\nBroccoli is packed with vitamins C and K, and contains cancer-fighting compounds.',
      'oats': '**Oats** (100g):\n• Calories: 389\n• Protein: 17g\n• Carbs: 66g\n• Fat: 7g\n• Fiber: 11g\n• Sugar: 1g\n• Beta-glucan: 2-8%\n\nOats are excellent for heart health due to their beta-glucan fiber content.',
      'quinoa': '**Quinoa** (100g):\n• Calories: 120\n• Protein: 4.4g\n• Carbs: 22g\n• Fat: 1.9g\n• Fiber: 2.8g\n• Sugar: 0.9g\n• Complete protein: Yes\n\nQuinoa is a complete protein source, perfect for vegetarians and vegans.',
      'rice': '**Brown Rice** (100g):\n• Calories: 111\n• Protein: 2.6g\n• Carbs: 23g\n• Fat: 0.9g\n• Fiber: 1.8g\n• Sugar: 0.4g\n• Sodium: 5mg\n\nBrown rice is a whole grain rich in fiber and B vitamins.',
      'egg': '**Egg** (1 large):\n• Calories: 70\n• Protein: 6g\n• Carbs: 0.6g\n• Fat: 5g\n• Fiber: 0g\n• Sugar: 0.6g\n• Cholesterol: 186mg\n\nEggs are a complete protein source with all essential amino acids.',
      'milk': '**Milk** (100ml):\n• Calories: 50\n• Protein: 3.3g\n• Carbs: 4.7g\n• Fat: 2g\n• Fiber: 0g\n• Sugar: 4.7g\n• Calcium: 120mg\n\nMilk is rich in calcium and vitamin D for bone health.',
      'yogurt': '**Greek Yogurt** (100g):\n• Calories: 59\n• Protein: 10g\n• Carbs: 3.6g\n• Fat: 0.4g\n• Fiber: 0g\n• Sugar: 3.6g\n• Sodium: 36mg\n\nGreek yogurt is high in protein and probiotics for gut health.'
    };

    return basicNutritionData[food] || null;
  }

  private getHealthBenefits(foodName: string, category: string): string {
    const benefits: { [key: string]: string } = {
      'fruit': 'Fruits are rich in vitamins, minerals, and antioxidants. They support immune function, heart health, and provide natural energy.',
      'vegetable': 'Vegetables are packed with essential nutrients, fiber, and antioxidants. They support digestion, reduce inflammation, and promote overall health.',
      'protein': 'Protein is essential for muscle building, tissue repair, and maintaining a healthy metabolism. It also helps with satiety and weight management.',
      'grain': 'Whole grains provide complex carbohydrates, fiber, and B vitamins. They support sustained energy and digestive health.',
      'dairy': 'Dairy products are excellent sources of calcium, protein, and vitamin D. They support bone health and muscle function.',
      'nuts': 'Nuts are rich in healthy fats, protein, and fiber. They support heart health, brain function, and provide sustained energy.',
      'other': 'This food provides various nutrients that contribute to a balanced diet and overall health.'
    };

    return benefits[category] || 'This food provides various nutrients that contribute to a balanced diet and overall health.';
  }

  // Helper methods for new functionality
  private getRecipeDatabase(): Recipe[] {
    return [
      {
        name: "Classic Spaghetti Carbonara",
        cuisine: "Italian",
        difficulty: "medium",
        prepTime: "10 minutes",
        cookTime: "15 minutes",
        servings: 4,
        ingredients: [
          "400g spaghetti",
          "200g pancetta or bacon",
          "4 large eggs",
          "100g parmesan cheese, grated",
          "2 cloves garlic, minced",
          "Black pepper",
          "Salt"
        ],
        instructions: [
          "Cook spaghetti according to package directions",
          "Cut pancetta into small cubes and cook until crispy",
          "Beat eggs with grated parmesan and black pepper",
          "Drain pasta, reserving 1 cup pasta water",
          "Add hot pasta to pancetta, remove from heat",
          "Quickly stir in egg mixture, adding pasta water as needed",
          "Serve immediately with extra parmesan"
        ],
        dietaryTags: ["gluten-free-option"],
        nutrition: {
          calories: 650,
          protein: 35,
          carbs: 45,
          fat: 35,
          fiber: 2
        }
      },
      {
        name: "Creamy Mushroom Pasta",
        cuisine: "Italian",
        difficulty: "easy",
        prepTime: "5 minutes",
        cookTime: "20 minutes",
        servings: 4,
        ingredients: [
          "400g fettuccine",
          "300g mixed mushrooms",
          "200ml heavy cream",
          "2 cloves garlic",
          "1 onion, diced",
          "50g butter",
          "Fresh parsley",
          "Salt and pepper"
        ],
        instructions: [
          "Cook pasta according to package directions",
          "Sauté onions and garlic in butter until soft",
          "Add mushrooms and cook until golden",
          "Pour in cream and simmer for 5 minutes",
          "Toss with cooked pasta",
          "Garnish with fresh parsley and serve"
        ],
        dietaryTags: ["vegetarian"],
        nutrition: {
          calories: 520,
          protein: 18,
          carbs: 65,
          fat: 20,
          fiber: 4
        }
      },
      {
        name: "Lebanese Hummus",
        cuisine: "Lebanese",
        difficulty: "easy",
        prepTime: "10 minutes",
        cookTime: "0 minutes",
        servings: 4,
        ingredients: [
          "1 can chickpeas (400g)",
          "3 tbsp tahini",
          "2 cloves garlic",
          "3 tbsp lemon juice",
          "2 tbsp olive oil",
          "1/2 tsp salt",
          "1/4 tsp cumin",
          "2-3 tbsp water"
        ],
        instructions: [
          "Drain and rinse chickpeas",
          "Add all ingredients to food processor",
          "Blend until smooth, adding water as needed",
          "Taste and adjust seasoning",
          "Serve with olive oil and paprika"
        ],
        nutrition: {
          calories: 180,
          protein: 8,
          carbs: 20,
          fat: 8,
          fiber: 6
        },
        dietaryTags: ["vegetarian", "vegan", "gluten-free", "dairy-free"]
      },
      {
        name: "Mediterranean Quinoa Bowl",
        cuisine: "Mediterranean",
        difficulty: "easy",
        prepTime: "15 minutes",
        cookTime: "15 minutes",
        servings: 2,
        ingredients: [
          "1 cup quinoa",
          "1 cucumber, diced",
          "1 cup cherry tomatoes, halved",
          "1/2 red onion, sliced",
          "1/2 cup kalamata olives",
          "1/4 cup feta cheese",
          "2 tbsp olive oil",
          "1 tbsp lemon juice",
          "Salt and pepper to taste"
        ],
        instructions: [
          "Cook quinoa according to package directions",
          "Let quinoa cool to room temperature",
          "Mix all vegetables in a large bowl",
          "Add cooled quinoa",
          "Dress with olive oil and lemon juice",
          "Top with feta cheese and olives"
        ],
        nutrition: {
          calories: 320,
          protein: 12,
          carbs: 45,
          fat: 12,
          fiber: 6
        },
        dietaryTags: ["vegetarian", "gluten-free"]
      },
      {
        name: "Chicken Teriyaki",
        cuisine: "Japanese",
        difficulty: "medium",
        prepTime: "20 minutes",
        cookTime: "15 minutes",
        servings: 4,
        ingredients: [
          "4 chicken breasts",
          "1/4 cup soy sauce",
          "2 tbsp honey",
          "2 tbsp rice vinegar",
          "1 tbsp sesame oil",
          "2 cloves garlic, minced",
          "1 tsp ginger, grated",
          "2 green onions, sliced",
          "1 tbsp cornstarch"
        ],
        instructions: [
          "Cut chicken into bite-sized pieces",
          "Mix soy sauce, honey, vinegar, and sesame oil",
          "Cook chicken in a pan until golden",
          "Add garlic and ginger, cook 1 minute",
          "Add sauce mixture and simmer",
          "Thicken with cornstarch slurry",
          "Garnish with green onions"
        ],
        nutrition: {
          calories: 280,
          protein: 35,
          carbs: 15,
          fat: 8,
          fiber: 1
        },
        dietaryTags: ["gluten-free", "dairy-free"]
      }
    ];
  }

  private extractDietaryFilters(input: string): string[] {
    const filters: string[] = [];
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('vegetarian')) filters.push('vegetarian');
    if (lowerInput.includes('vegan')) filters.push('vegan');
    if (lowerInput.includes('gluten-free') || lowerInput.includes('gluten free')) filters.push('gluten-free');
    if (lowerInput.includes('dairy-free') || lowerInput.includes('dairy free')) filters.push('dairy-free');
    if (lowerInput.includes('keto')) filters.push('keto');
    if (lowerInput.includes('paleo')) filters.push('paleo');
    if (lowerInput.includes('low-carb') || lowerInput.includes('low carb')) filters.push('low-carb');
    if (lowerInput.includes('high-protein') || lowerInput.includes('high protein')) filters.push('high-protein');
    
    return filters;
  }

  private extractCuisineType(input: string): string | null {
    const lowerInput = input.toLowerCase();
    const cuisines = [
      'lebanese', 'middle eastern', 'mediterranean', 'italian', 'chinese', 
      'japanese', 'mexican', 'indian', 'thai', 'french', 'american', 'greek'
    ];
    
    for (const cuisine of cuisines) {
      if (lowerInput.includes(cuisine)) {
        return cuisine;
      }
    }
    return null;
  }

  private extractDifficulty(input: string): string | null {
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('easy') || lowerInput.includes('simple')) return 'easy';
    if (lowerInput.includes('hard') || lowerInput.includes('difficult') || lowerInput.includes('advanced')) return 'hard';
    if (lowerInput.includes('medium') || lowerInput.includes('intermediate')) return 'medium';
    return null;
  }

  private extractMealType(input: string): string {
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('breakfast')) return 'breakfast';
    if (lowerInput.includes('lunch')) return 'lunch';
    if (lowerInput.includes('dinner')) return 'dinner';
    if (lowerInput.includes('snack')) return 'snack';
    return 'any';
  }

  private extractTimeConstraint(input: string): string {
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('quick') || lowerInput.includes('fast') || lowerInput.includes('15 minutes') || lowerInput.includes('30 minutes')) return 'quick';
    if (lowerInput.includes('slow') || lowerInput.includes('long') || lowerInput.includes('hours')) return 'slow';
    return 'normal';
  }

  private extractFoodsForComparison(input: string): string[] {
    const foods: string[] = [];
    const lowerInput = input.toLowerCase();
    
    // Common food patterns
    const foodPatterns = [
      /chicken|beef|pork|fish|salmon|tuna|cod/,
      /rice|pasta|bread|quinoa|oats/,
      /apple|banana|orange|grape|strawberry/,
      /broccoli|spinach|carrot|potato|tomato/,
      /milk|cheese|yogurt|butter/,
      /almond|walnut|peanut|cashew/
    ];
    
    for (const pattern of foodPatterns) {
      const matches = lowerInput.match(pattern);
      if (matches) {
        foods.push(matches[0]);
      }
    }
    
    return foods;
  }

  private extractDietaryType(input: string): string {
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('vegetarian')) return 'vegetarian';
    if (lowerInput.includes('vegan')) return 'vegan';
    if (lowerInput.includes('keto')) return 'keto';
    if (lowerInput.includes('paleo')) return 'paleo';
    if (lowerInput.includes('gluten-free')) return 'gluten-free';
    if (lowerInput.includes('dairy-free')) return 'dairy-free';
    return 'general';
  }

  private extractUserPreferences(input: string): Partial<UserPreferences> {
    const preferences: Partial<UserPreferences> = {};
    const lowerInput = input.toLowerCase();
    
    // Extract dietary restrictions
    if (lowerInput.includes('vegetarian')) preferences.dietaryRestrictions = ['vegetarian'];
    if (lowerInput.includes('vegan')) preferences.dietaryRestrictions = ['vegan'];
    if (lowerInput.includes('gluten-free')) preferences.dietaryRestrictions = ['gluten-free'];
    
    // Extract goals
    if (lowerInput.includes('lose weight')) preferences.mealGoals = ['weight-loss'];
    if (lowerInput.includes('gain weight')) preferences.mealGoals = ['weight-gain'];
    if (lowerInput.includes('build muscle')) preferences.mealGoals = ['muscle-building'];
    
    return preferences;
  }

  private updateUserPreferences(preferences: Partial<UserPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }

  private getNoRecipesFoundResponse(dietaryFilters: string[], cuisineType: string | null, difficulty: string | null): string {
    let response = "I couldn't find recipes matching your criteria. ";
    
    if (dietaryFilters.length > 0) {
      response += `Dietary filters: ${dietaryFilters.join(', ')}. `;
    }
    if (cuisineType) {
      response += `Cuisine: ${cuisineType}. `;
    }
    if (difficulty) {
      response += `Difficulty: ${difficulty}. `;
    }
    
    response += "\n\nTry asking for:\n• More general recipe requests\n• Different dietary preferences\n• Broader cuisine categories\n• 'Easy recipes' or 'Quick meals'";
    
    return response;
  }

  private formatRecipeResponse(recipe: Recipe): string {
    return `**${recipe.name}** (${recipe.cuisine} Cuisine)

⏱️ **Time:** ${recipe.prepTime} prep + ${recipe.cookTime} cooking
👥 **Serves:** ${recipe.servings}
🎯 **Difficulty:** ${recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}

**Ingredients:**
${recipe.ingredients.map(ingredient => `• ${ingredient}`).join('\n')}

**Instructions:**
${recipe.instructions.map((step, index) => `${index + 1}. ${step}`).join('\n')}

**Nutrition (per serving):**
🔥 ${recipe.nutrition.calories} calories
💪 ${recipe.nutrition.protein}g protein
🍞 ${recipe.nutrition.carbs}g carbs
🥑 ${recipe.nutrition.fat}g fat
🌾 ${recipe.nutrition.fiber}g fiber

**Dietary Tags:** ${recipe.dietaryTags.join(', ')}`;
  }

  private getMealSuggestions(mealType: string, timeConstraint: string, dietaryFilters: string[]): string[] {
    const suggestions: { [key: string]: string[] } = {
      breakfast: [
        "Greek yogurt with berries and honey",
        "Avocado toast with poached egg",
        "Overnight oats with chia seeds",
        "Smoothie bowl with granola",
        "Scrambled eggs with spinach"
      ],
      lunch: [
        "Mediterranean quinoa bowl",
        "Grilled chicken salad",
        "Lentil soup with whole grain bread",
        "Turkey and hummus wrap",
        "Vegetable stir-fry with brown rice"
      ],
      dinner: [
        "Baked salmon with roasted vegetables",
        "Chicken teriyaki with steamed broccoli",
        "Pasta with marinara sauce and vegetables",
        "Grilled fish with quinoa pilaf",
        "Vegetable curry with basmati rice"
      ],
      snack: [
        "Apple slices with almond butter",
        "Greek yogurt with nuts",
        "Hummus with vegetable sticks",
        "Mixed nuts and dried fruit",
        "Cheese and whole grain crackers"
      ]
    };
    
    return suggestions[mealType] || suggestions.breakfast;
  }

  private formatMealSuggestions(suggestions: string[], mealType: string, timeConstraint: string): string {
    const timeText = timeConstraint === 'quick' ? ' (Quick options)' : 
                    timeConstraint === 'slow' ? ' (Take your time)' : '';
    
    return `**${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Ideas${timeText}**

${suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n')}

💡 **Tips:**
• Choose options that fit your dietary preferences
• Include a variety of colors for balanced nutrition
• Consider your cooking time and skill level
• Don't forget to stay hydrated!

Would you like specific recipes for any of these suggestions?`;
  }

  private getFoodComparisonData(foods: string[]): any[] {
    // This would typically fetch from a nutrition database
    // For now, using sample data
    const sampleData: { [key: string]: any } = {
      'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
      'fish': { calories: 206, protein: 22, carbs: 0, fat: 12, fiber: 0 },
      'beef': { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 },
      'salmon': { calories: 208, protein: 25, carbs: 0, fat: 12, fiber: 0 },
      'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
      'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8 }
    };
    
    return foods.map(food => ({
      name: food,
      ...sampleData[food] || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    }));
  }

  private formatFoodComparison(comparisonData: any[], input: string): string {
    if (comparisonData.length < 2) {
      return "I need at least two foods to make a comparison. Please mention both foods in your question.";
    }
    
    let response = `**Food Comparison**\n\n`;
    
    comparisonData.forEach((food, index) => {
      response += `**${food.name.charAt(0).toUpperCase() + food.name.slice(1)}** (per 100g):\n`;
      response += `🔥 ${food.calories} calories\n`;
      response += `💪 ${food.protein}g protein\n`;
      response += `🍞 ${food.carbs}g carbs\n`;
      response += `🥑 ${food.fat}g fat\n`;
      response += `🌾 ${food.fiber}g fiber\n\n`;
    });
    
    // Add comparison insights
    const higherProtein = comparisonData.reduce((prev, current) => 
      (prev.protein > current.protein) ? prev : current
    );
    const lowerCalories = comparisonData.reduce((prev, current) => 
      (prev.calories < current.calories) ? prev : current
    );
    
    response += `**Key Insights:**\n`;
    response += `• **Higher protein:** ${higherProtein.name} (${higherProtein.protein}g)\n`;
    response += `• **Lower calories:** ${lowerCalories.name} (${lowerCalories.calories} calories)\n`;
    
    return response;
  }

  private getCulturalFoodInfo(foodName: string): any {
    const culturalData: { [key: string]: any } = {
      'hummus': {
        origin: 'Middle East',
        history: 'Dating back to ancient Egypt, hummus has been a staple in Middle Eastern cuisine for centuries',
        culturalSignificance: 'Often served as part of mezze platters and represents hospitality in Arab culture',
        traditionalServing: 'With pita bread, olive oil, and paprika',
        variations: 'Lebanese, Israeli, Palestinian, and Turkish variations exist'
      },
      'pasta': {
        origin: 'Italy',
        history: 'While noodles existed in China, Italian pasta developed independently and became a national symbol',
        culturalSignificance: 'Central to Italian identity and family traditions',
        traditionalServing: 'With various sauces, cheese, and fresh herbs',
        variations: 'Hundreds of shapes and regional specialties across Italy'
      },
      'sushi': {
        origin: 'Japan',
        history: 'Evolved from fermented fish preservation methods to the art form we know today',
        culturalSignificance: 'Represents Japanese precision, seasonality, and respect for ingredients',
        traditionalServing: 'With wasabi, pickled ginger, and soy sauce',
        variations: 'Nigiri, maki, sashimi, and regional specialties'
      }
    };
    
    return culturalData[foodName.toLowerCase()] || {
      origin: 'Various',
      history: 'This food has rich cultural traditions',
      culturalSignificance: 'Important in many culinary traditions',
      traditionalServing: 'Often served with traditional accompaniments',
      variations: 'Many regional and cultural variations exist'
    };
  }

  private formatCulturalResponse(culturalInfo: any, foodName: string): string {
    return `**${foodName.charAt(0).toUpperCase() + foodName.slice(1)} - Cultural Context**

🌍 **Origin:** ${culturalInfo.origin}

📚 **History:** ${culturalInfo.history}

🎭 **Cultural Significance:** ${culturalInfo.culturalSignificance}

🍽️ **Traditional Serving:** ${culturalInfo.traditionalServing}

🔄 **Variations:** ${culturalInfo.variations}

Would you like to learn about traditional cooking methods or get a recipe for this dish?`;
  }

  private getDietaryRecommendations(dietaryType: string): string[] {
    const recommendations: { [key: string]: string[] } = {
      'vegetarian': [
        'Focus on plant-based proteins like beans, lentils, and quinoa',
        'Include iron-rich foods like spinach and fortified cereals',
        'Consider B12 supplementation',
        'Eat a variety of colorful vegetables daily'
      ],
      'vegan': [
        'Ensure adequate protein from legumes, nuts, and seeds',
        'Include fortified foods for B12, D, and calcium',
        'Eat omega-3 rich foods like flaxseeds and walnuts',
        'Consider algae-based supplements for DHA'
      ],
      'keto': [
        'Keep carbs under 20g per day',
        'Focus on healthy fats like avocado and olive oil',
        'Include moderate protein from meat and fish',
        'Stay hydrated and supplement electrolytes'
      ],
      'gluten-free': [
        'Choose naturally gluten-free grains like rice and quinoa',
        'Read labels carefully for hidden gluten',
        'Focus on whole, unprocessed foods',
        'Consider nutrient deficiencies and supplement as needed'
      ]
    };
    
    return recommendations[dietaryType] || [
      'Eat a variety of whole foods',
      'Include plenty of fruits and vegetables',
      'Choose lean proteins',
      'Stay hydrated throughout the day'
    ];
  }

  private formatDietaryRecommendations(dietaryType: string, recommendations: string[]): string {
    return `**${dietaryType.charAt(0).toUpperCase() + dietaryType.slice(1)} Dietary Guidelines**

${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

💡 **Additional Tips:**
• Consult with a healthcare provider before making major dietary changes
• Consider working with a registered dietitian for personalized guidance
• Listen to your body and adjust as needed
• Focus on nutrient density and food quality

Would you like specific meal ideas or recipes that fit this dietary pattern?`;
  }

  private formatPreferenceConfirmation(preferences: Partial<UserPreferences>): string {
    let response = "Got it! I've noted your preferences:\n\n";
    
    if (preferences.dietaryRestrictions) {
      response += `🥗 **Dietary Restrictions:** ${preferences.dietaryRestrictions.join(', ')}\n`;
    }
    if (preferences.mealGoals) {
      response += `🎯 **Goals:** ${preferences.mealGoals.join(', ')}\n`;
    }
    if (preferences.favoriteCuisines) {
      response += `🌍 **Favorite Cuisines:** ${preferences.favoriteCuisines.join(', ')}\n`;
    }
    
    response += "\nI'll keep these in mind when suggesting recipes and meal ideas!";
    
    return response;
  }

  private getHealthAdvice(input: string): string {
    const advice = [
      "🥗 **Eat the rainbow!** Include colorful fruits and vegetables in every meal for a variety of nutrients and antioxidants.",
      "💧 **Stay hydrated!** Aim for 8 glasses of water daily. Proper hydration supports metabolism and overall health.",
      "🍽️ **Portion control matters!** Use smaller plates and listen to your hunger cues to avoid overeating.",
      "⏰ **Eat regularly!** Don't skip meals. Regular eating helps maintain stable blood sugar and energy levels.",
      "🥩 **Include protein!** Aim for 20-30g of protein per meal to support muscle health and satiety.",
      "🌾 **Choose whole grains!** Opt for brown rice, quinoa, and whole wheat over refined grains for better nutrition.",
      "🥜 **Healthy fats are essential!** Include nuts, seeds, avocado, and olive oil in your diet for heart health.",
      "🍎 **Plan ahead!** Meal prep on weekends to make healthy eating easier during busy weekdays.",
      "🏃‍♀️ **Combine diet with exercise!** A balanced diet works best when combined with regular physical activity.",
      "😴 **Get enough sleep!** Poor sleep can affect hunger hormones and lead to weight gain."
    ];
    
    return advice[Math.floor(Math.random() * advice.length)];
  }

  private async getFoodInfo(foodName: string): Promise<string> {
    // Check if database service is available
    const isDbAvailable = await this.databaseService.isAvailable();
    
    if (!isDbAvailable) {
      return `I'd love to provide detailed information about "${foodName}", but I need to be connected to the NutriLens database first. 

To enable real food information:
1. Make sure your MySQL database is running (XAMPP)
2. Import the database schema from database/schema.sql
3. Start the backend server: cd backend && npm install && npm start
4. Restart the frontend application

For now, I can provide general nutrition advice!`;
    }

    try {
      // Get nutrition data from local database
      const nutritionData = await this.databaseService.getNutritionFacts(foodName);
      
      if (!nutritionData) {
        return `I couldn't find information about "${foodName}" in the NutriLens database. Try asking about a more common food item, or check the spelling.`;
      }

      // Convert to internal format
      const food = this.databaseService.convertToInternalFormat(nutritionData);
      
      // Create comprehensive food information
      let response = `**${food.name}**\n\n`;
      
      if (food.brand) {
        response += `*Brand: ${food.brand}*\n\n`;
      }
      
      response += `**Nutrition Facts (${food.serving}):**\n`;
      response += `• Calories: ${food.calories}\n`;
      response += `• Protein: ${food.protein}g\n`;
      response += `• Carbohydrates: ${food.carbs}g\n`;
      response += `• Fat: ${food.fat}g\n`;
      
      if (food.fiber > 0) response += `• Fiber: ${food.fiber}g\n`;
      if (food.sugar > 0) response += `• Sugar: ${food.sugar}g\n`;
      if (food.sodium > 0) response += `• Sodium: ${food.sodium}mg\n`;
      
      response += `\n**Health Benefits:**\n`;
      response += this.getHealthBenefits(food.name, food.category);
      
      response += `\n\n**Category:** ${food.category.charAt(0).toUpperCase() + food.category.slice(1)}`;
      
      return response;
    } catch (error) {
      logger.error('Error fetching food info:', error);
      return `I encountered an error while fetching information about "${foodName}". Please try again or ask about a different food item.`;
    }
  }
}

// Main Component
const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRequestInProgress = useRef(false);
  const lastRequestTime = useRef(0);
  const rateLimitUntil = useRef(0); // Timestamp when rate limit expires
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Scroll functions
  const checkScrollPosition = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        setCanScrollUp(scrollTop > 10);
        setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
      }
    }
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollElement) {
        scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: 'smooth' });
        setTimeout(checkScrollPosition, 300);
      }
    }
  }, [checkScrollPosition]);
  
  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollElement) {
        scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          checkScrollPosition();
        }, 300);
      }
    }
  }, [checkScrollPosition]);

  // Helper function to send message to AI (extracted from handleSendMessage)
  const sendMessageToAI = useCallback(async (messageToSend: string, messageHistory: Message[] = messages) => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    
    if (!messageToSend.trim() || isLoading || isRequestInProgress.current) {
      return;
    }
    
    setIsLoading(true);
    isRequestInProgress.current = true;
    
    // Build history payload
    const historyPayload = messageHistory
      .filter(msg => msg.role !== 'system')
      .slice(-10) // Keep last 10 messages for context
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));

    // Send request asynchronously
    apiClient.post<{ message: string; model?: string }>('/chat/message', {
      message: messageToSend,
      history: historyPayload
    })
    .then(response => {
      const assistantContent = response?.data?.message?.trim();

      if (!response?.success || !assistantContent) {
        logger.error('Invalid response structure:', { 
          success: response?.success, 
          hasData: !!response?.data, 
          hasMessage: !!response?.data?.message,
          message: response?.message 
        });
        throw new Error(response?.message || 'No response from chat service.');
      }

      // Only update lastRequestTime on SUCCESS
      lastRequestTime.current = Date.now();

      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prevMsgs => [...prevMsgs, assistantMessage]);
    })
    .catch(error => {
      logger.error('Error generating AI response:', error);
      logger.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        status: (error as any)?.status,
        stack: error instanceof Error ? error.stack : undefined
      });
      const isRateLimit = error instanceof Error && 'status' in error && (error as any).status === 429;
      const isTimeout = error instanceof Error && (error.message.includes('timeout') || (error as any).status === 408);
      
      // If rate limited, set a longer cooldown period (60 seconds for free tier)
      if (isRateLimit) {
        const cooldownTime = 60000; // 60 seconds cooldown
        rateLimitUntil.current = Date.now() + cooldownTime;
        lastRequestTime.current = Date.now(); // Reset timer
        setIsRateLimited(true);
        toast({
          title: "Rate limit reached",
          description: "The AI service is receiving too many requests. Please wait 60 seconds before trying again.",
          variant: "destructive"
        });
        // Clear rate limit after cooldown
        setTimeout(() => {
          setIsRateLimited(false);
          rateLimitUntil.current = 0;
        }, cooldownTime);
      } else if (isTimeout) {
        // Handle timeout errors
        lastRequestTime.current = Date.now();
        toast({
          title: "Request Timeout",
          description: error instanceof Error ? error.message : "The server took too long to respond. Please try again.",
          variant: "destructive"
        });
      } else {
        // For other errors, still update lastRequestTime to prevent spam
        lastRequestTime.current = Date.now();
        
        // Use AppError for better error handling
        const appError = error instanceof AppError ? error : AppError.fromError(error);
        let displayMessage = appError.userMessage;
        
        // Provide user-friendly message for specific error types
        if (appError.code === ErrorCode.CONNECTION_REFUSED) {
          displayMessage = "Backend server is not running. Please start the Flask backend server on port 3001.";
        } else if (appError.message.includes('Chat API key not configured')) {
          displayMessage = "Chat service is not configured. Please set CHAT_API_KEY environment variable in the backend and restart the server.";
        }
        
        toast({
          title: "Error",
          description: displayMessage,
          variant: "destructive"
        });
      }
    })
    .finally(() => {
      setIsLoading(false);
      isRequestInProgress.current = false;
    });
  }, [isAuthenticated, isLoading, messages, toast]);

  // Check for photo analysis data on mount and send it automatically
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const photoAnalysisData = sessionStorage.getItem(STORAGE_KEYS.PHOTO_ANALYSIS_FOR_CHAT);
    if (photoAnalysisData) {
      try {
        const chatData = JSON.parse(photoAnalysisData);
        // Clear the sessionStorage immediately so it doesn't send again
        sessionStorage.removeItem(STORAGE_KEYS.PHOTO_ANALYSIS_FOR_CHAT);
        
        // Wait a bit for the component to be ready, then send
        const timer = setTimeout(() => {
          // Create a user message with the photo analysis
          const userMessage: Message = {
            id: Date.now().toString(),
            content: chatData.message,
            role: 'user',
            timestamp: new Date()
          };
          
          setMessages(prev => {
            const newMessages = [...prev, userMessage];
            // Send to AI with updated message history
            sendMessageToAI(chatData.message, newMessages);
            return newMessages;
          });
          
          // Scroll to bottom after adding message
          setTimeout(() => scrollToBottom(), 100);
        }, 800);
        
        return () => clearTimeout(timer);
      } catch (error) {
        logger.error('Error processing photo analysis:', error);
        toast({
          title: "Error",
          description: "Failed to process photo analysis. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [isAuthenticated, sendMessageToAI, scrollToBottom, toast]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    
    const messageToSend = inputMessage.trim();
    
    // Early return checks - do these BEFORE setting any flags
    if (!messageToSend || isLoading || isRequestInProgress.current || isRateLimited) {
      return;
    }

    const now = Date.now();
    
    // Check if we're still rate limited
    if (now < rateLimitUntil.current) {
      const waitTime = Math.ceil((rateLimitUntil.current - now) / 1000);
      setIsRateLimited(true);
      toast({
        title: "Rate limit active",
        description: `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.`,
        variant: "default"
      });
      return;
    }

    // Enforce minimum time between requests (5 seconds for free tier)
    const timeSinceLastRequest = now - lastRequestTime.current;
    const minInterval = 5000; // 5 seconds minimum between requests
    
    if (timeSinceLastRequest < minInterval && lastRequestTime.current > 0) {
      const waitTime = Math.ceil((minInterval - timeSinceLastRequest) / 1000);
      toast({
        title: "Please wait",
        description: `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.`,
        variant: "default"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      role: 'user',
      timestamp: new Date()
    };

    // Add user message immediately and capture updated history
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');

    // Use the extracted sendMessageToAI function
    sendMessageToAI(messageToSend, updatedMessages);
  }, [inputMessage, isLoading, isAuthenticated, messages, toast, isRateLimited]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);


  // Clear conversation
  const handleClearConversation = useCallback(() => {
    setMessages([]);
    toast({
      title: "Conversation cleared",
      description: "Starting fresh!"
    });
  }, [toast]);

  // Auto-scroll when messages change and check scroll position
  useEffect(() => {
    scrollToBottom();
    // Check scroll position after a short delay to allow for rendering
    setTimeout(checkScrollPosition, 200);
  }, [messages, scrollToBottom, checkScrollPosition]);
  
  // Add keyboard shortcuts for scrolling
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Up/Down for scrolling
      if ((e.ctrlKey || e.metaKey) && scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (scrollElement) {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            scrollElement.scrollBy({ top: -100, behavior: 'smooth' });
            setTimeout(checkScrollPosition, 100);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            scrollElement.scrollBy({ top: 100, behavior: 'smooth' });
            setTimeout(checkScrollPosition, 100);
          } else if (e.key === 'Home') {
            e.preventDefault();
            scrollToTop();
          } else if (e.key === 'End') {
            e.preventDefault();
            scrollToBottom();
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scrollToTop, scrollToBottom, checkScrollPosition]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto rounded-2xl shadow-2xl overflow-hidden border-0 bg-gradient-to-br from-white to-green-50 dark:from-slate-900 dark:to-slate-800">
        {/* Header - Fixed */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 bg-green-500">
            <AvatarFallback className="bg-green-500 text-white">
                <Utensils className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
            <h2 className="font-bold text-xl text-white">
              Nutrition Assistant
            </h2>
            <div className="text-sm text-green-100 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-300 rounded-full"></div>
              Always here to help
            </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearConversation}
            className="h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
            </div>
          </div>
        
      {/* AI Status - Fixed below header */}
      <div className="sticky top-0 z-40 p-3 sm:p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur border-b border-white/60 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-full">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <Utensils className="h-4 w-4" />
              <span className="font-medium">Ready to Help</span>
            </div>
          </div>
          <Badge className="bg-green-600 text-white px-3 py-1">
            <Zap className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden">
        <ScrollArea 
          ref={scrollAreaRef} 
          className="h-full p-4 sm:p-6 bg-transparent [&>[data-radix-scroll-area-viewport]]:scroll-smooth"
          onScrollCapture={checkScrollPosition}
        >
          <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 items-start",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-9 w-9 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-sm flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                      <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={cn(
                  "max-w-[85%] sm:max-w-[75%] rounded-2xl px-6 py-5 shadow-lg transition-all duration-200",
                  message.role === 'user'
                    ? "bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-500 text-white"
                    : "bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-800/90 text-gray-900 dark:text-gray-100 border border-gray-200/80 dark:border-slate-700/60 shadow-xl hover:shadow-2xl backdrop-blur-sm"
                )}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-p:text-gray-800 dark:prose-p:text-gray-200">
                    <ReactMarkdown
                      remarkPlugins={[]}
                      rehypePlugins={[]}
                      components={{
                        p: ({ children }) => <p className="mb-4 last:mb-0 text-gray-800 dark:text-gray-200 leading-7 text-[15px]">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-gray-100 text-emerald-700 dark:text-emerald-400">{children}</strong>,
                        em: ({ children }) => <em className="italic text-gray-700 dark:text-gray-300">{children}</em>,
                        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-gray-900 dark:text-gray-100 border-b-2 border-emerald-200 dark:border-emerald-800 pb-3 bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/30 dark:to-transparent px-3 -mx-3 rounded-t">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 text-gray-900 dark:text-gray-100 text-emerald-700 dark:text-emerald-400">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-semibold mb-2.5 mt-4 first:mt-0 text-gray-900 dark:text-gray-100">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc list-outside mb-4 space-y-2 ml-5 text-gray-800 dark:text-gray-200 marker:text-emerald-500 dark:marker:text-emerald-400">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-outside mb-4 space-y-2 ml-5 text-gray-800 dark:text-gray-200 marker:text-emerald-500 dark:marker:text-emerald-400 marker:font-bold">{children}</ol>,
                        li: ({ children }) => <li className="text-gray-800 dark:text-gray-200 leading-7 text-[15px] pl-1">{children}</li>,
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-slate-800/50">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-700 dark:to-emerald-800">{children}</thead>,
                        tbody: ({ children }) => <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>,
                        tr: ({ children }) => {
                          // Filter out separator rows (rows with only dashes, pipes, colons, and spaces)
                          try {
                            const childrenArray = React.Children.toArray(children);
                            const isSeparatorRow = childrenArray.length > 0 && childrenArray.every((child: any) => {
                              const childText = typeof child === 'string' 
                                ? child 
                                : child?.props?.children 
                                  ? String(child.props.children) 
                                  : '';
                              const text = String(childText).trim();
                              return /^[\s|:\-]+$/.test(text) || text === '';
                            });
                            if (isSeparatorRow) return null;
                          } catch (e) {
                            // If error checking, just render normally
                          }
                          return <tr className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-colors duration-150">{children}</tr>;
                        },
                        th: ({ children }) => <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">{children}</th>,
                        td: ({ children }) => <td className="px-5 py-3.5 text-sm text-gray-900 dark:text-gray-100 font-medium">{children}</td>,
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-md text-xs font-mono text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">{children}</code>
                          ) : (
                            <code className={className}>{children}</code>
                          );
                        },
                        pre: ({ children }) => (
                          <pre className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 p-5 rounded-xl overflow-x-auto my-4 border-2 border-gray-700 dark:border-gray-600 shadow-inner">
                            {children}
                          </pre>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-emerald-500 dark:border-emerald-400 pl-5 italic my-4 text-gray-700 dark:text-gray-300 bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/40 dark:to-emerald-950/20 py-3 rounded-r-lg shadow-sm">
                            {children}
                          </blockquote>
                        ),
                        hr: () => <hr className="my-5 border-t-2 border-gray-300 dark:border-gray-600" />,
                        a: ({ children, href }) => (
                          <a href={href} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-3 font-medium transition-colors" target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {message.content
                        // Remove markdown table separator rows (lines with only dashes, pipes, colons, and spaces)
                        .replace(/^\|[\s|:\-]+\|[\s|:\-]*\|[\s|:\-]*\|[\s|:\-]*$/gm, '')
                        .replace(/^\|[\s|:\-]+\|[\s|:\-]*\|[\s|:\-]*$/gm, '')
                        .replace(/^\|[\s|:\-]+\|[\s|:\-]*$/gm, '')
                        .replace(/^\|[\s|:\-]+\|$/gm, '')
                        // Remove lines that are just separator patterns
                        .replace(/^[\s|:\-]+$/gm, '')
                      }
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-white font-medium">
                    {message.content}
                  </div>
                )}
              
                <div className={cn(
                  "text-xs mt-4 flex items-center gap-2",
                  message.role === 'user' 
                    ? 'text-emerald-50/90' 
                    : 'text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-slate-700/30 px-3 py-1.5 rounded-full w-fit'
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    message.role === 'user' ? 'bg-current opacity-70' : 'bg-emerald-400 dark:bg-emerald-500'
                  )}></div>
                  <span className="font-semibold">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              
              {message.role === 'user' && (
                <Avatar className="h-9 w-9 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 items-start justify-start">
              <Avatar className="h-9 w-9 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-sm flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                    <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white dark:bg-slate-800 rounded-2xl px-5 py-4 shadow-md border border-gray-200 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          </div>
        </ScrollArea>
        
        {/* Scroll Buttons */}
        <div className="absolute right-4 top-4 flex flex-col gap-2 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToTop}
            disabled={!canScrollUp}
            className="h-8 w-8 p-0 bg-white hover:bg-gray-50 text-gray-700 shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToBottom}
            disabled={!canScrollDown}
            className="h-8 w-8 p-0 bg-white hover:bg-gray-50 text-gray-700 shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur border-t border-white/60 dark:border-slate-700">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about nutrition and healthy eating..."
              className="bg-white/90 dark:bg-slate-700/90 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 pr-20 text-sm focus:border-emerald-500 focus:ring-emerald-300/40 dark:focus:border-emerald-400"
              disabled={isLoading}
              onFocus={() => {
                if (!isAuthenticated) {
                  setIsLoginModalOpen(true);
                }
              }}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || isRateLimited}
            size="icon"
            className="h-12 w-12 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 shadow-md"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 flex-wrap">
          <Button
              variant="ghost"
            size="sm"
              className="h-8 px-3 text-xs bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full border border-green-200 dark:border-green-700/50"
              onClick={() => {
                if (!isAuthenticated) {
                  setIsLoginModalOpen(true);
                  return;
                }
                setInputMessage("How many calories are in an apple?");
              }}
          >
              <Utensils className="h-3 w-3 mr-1" />
              Calories
          </Button>
          <Button
              variant="ghost"
            size="sm"
              className="h-8 px-3 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-700/50"
              onClick={() => {
                if (!isAuthenticated) {
                  setIsLoginModalOpen(true);
                  return;
                }
                setInputMessage("What are the health benefits of salmon?");
              }}
          >
              <Plus className="h-3 w-3 mr-1" />
              Benefits
          </Button>
          <Button
              variant="ghost"
            size="sm"
              className="h-8 px-3 text-xs bg-teal-100 hover:bg-teal-200 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 rounded-full border border-teal-200 dark:border-teal-700/50"
              onClick={() => {
                if (!isAuthenticated) {
                  setIsLoginModalOpen(true);
                  return;
                }
                setInputMessage("How to lose weight healthily?");
              }}
          >
              <Sparkles className="h-3 w-3 mr-1" />
              Weight Loss
          </Button>
          <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs bg-lime-100 hover:bg-lime-200 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300 rounded-full border border-lime-200 dark:border-lime-700/50"
              onClick={() => {
                if (!isAuthenticated) {
                  setIsLoginModalOpen(true);
                  return;
                }
                setInputMessage("What foods are high in protein?");
              }}
            >
              <Zap className="h-3 w-3 mr-1" />
              Protein
          </Button>
          <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-full border border-green-300 dark:border-green-600/50"
              onClick={() => {
                if (!isAuthenticated) {
                  setIsLoginModalOpen(true);
                  return;
                }
                setInputMessage("Tell me about healthy eating tips");
              }}
            >
              <Utensils className="h-3 w-3 mr-1" />
              Tips
          </Button>
        </div>
        
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-800 rounded-full">
            <Sparkles className="h-3 w-3 text-green-600 dark:text-green-300" />
            <span className="text-xs font-medium text-green-600 dark:text-green-300">AI Assistant</span>
          </div>
        </div>
      </div>
      
      <AuthModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode="login"
        onModeChange={() => {}}
      />
    </div>
  );
};

export default AIChat;
