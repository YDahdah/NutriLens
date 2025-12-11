import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { Plus, Trash2, Droplet, Activity as ActivityIcon, Clock, Flame, Loader2, History, Calendar, RefreshCw } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';

interface Exercise {
  name: string;
  duration: number; // minutes
  caloriesBurned: number;
  type: 'cardio' | 'strength' | 'yoga' | 'other';
  notes: string;
  timestamp?: string;
}

interface ActivityData {
  exercises: Exercise[];
  waterIntake: number; // ml
}

interface ActivityHistoryItem {
  date: string;
  exercisesCount: number;
  totalCaloriesBurned: number;
  totalDuration: number;
  waterIntake: number;
}

const Activity = () => {
  const { isAuthenticated } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [activity, setActivity] = useState<ActivityData>({ exercises: [], waterIntake: 0 });
  const [activityHistory, setActivityHistory] = useState<ActivityHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({
    name: '',
    duration: undefined,
    caloriesBurned: undefined,
    type: 'other',
    notes: ''
  });
  const [showManualWaterInput, setShowManualWaterInput] = useState(false);
  const [manualWaterAmount, setManualWaterAmount] = useState('');
  const [exerciseSuggestions, setExerciseSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEstimatingCalories, setIsEstimatingCalories] = useState(false);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

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
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadActivity();
      loadActivityHistory();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load exercise suggestions
  const loadExerciseSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setExerciseSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await apiClient.get(`/user-data/activity/exercise/suggestions?q=${encodeURIComponent(query)}`);
      if (response.success && response.data) {
        setExerciseSuggestions(response.data);
        setShowSuggestions(response.data.length > 0);
      }
    } catch (error) {
      console.error('Failed to load exercise suggestions:', error);
      setExerciseSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Estimate calories using AI
  const estimateCalories = useCallback(async (exerciseName: string, duration: number) => {
    if (!exerciseName.trim() || duration <= 0) {
      return;
    }

    try {
      setIsEstimatingCalories(true);
      const response = await apiClient.post('/user-data/activity/exercise/estimate-calories', {
        exerciseName: exerciseName.trim(),
        duration: duration
      });

      if (response.success && response.data?.estimatedCalories) {
        setNewExercise(prev => ({
          ...prev,
          caloriesBurned: response.data.estimatedCalories
        }));
        toast({
          title: 'Calories Estimated',
          description: `Estimated ${response.data.estimatedCalories} calories burned`,
        });
      }
    } catch (error: any) {
      console.error('Failed to estimate calories:', error);
      // Don't show error toast, just silently fail
    } finally {
      setIsEstimatingCalories(false);
    }
  }, [toast]);

  // Effect to estimate calories when exercise name and duration are both set
  useEffect(() => {
    if (newExercise.name?.trim() && newExercise.duration && newExercise.duration > 0) {
      // Debounce the calorie estimation
      const timeout = setTimeout(() => {
        estimateCalories(newExercise.name!, newExercise.duration!);
      }, 1000); // Wait 1 second after user stops typing

      return () => clearTimeout(timeout);
    }
  }, [newExercise.name, newExercise.duration, estimateCalories]);

  const loadActivity = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/user-data/activity/today');
      if (response.success && response.data) {
        const exercises = response.data.exercises || [];
        
        // Check if any exercises have 0 calories and notify user
        const exercisesWithZeroCalories = exercises.filter(
          ex => (ex.caloriesBurned === 0 || !ex.caloriesBurned) && ex.duration > 0
        );
        
        if (exercisesWithZeroCalories.length > 0 && exercises.length > 0) {
          // Backend should have recalculated, but if still 0, show a message
          const recalculated = exercises.filter(ex => ex.caloriesBurned > 0);
          if (recalculated.length < exercises.length) {
            toast({
              title: 'Calories Updated',
              description: `Calories have been calculated for your exercises.`,
            });
          }
        }
        
        setActivity({
          exercises: exercises,
          waterIntake: response.data.waterIntake || 0
        });
      }
    } catch (error) {
      console.error('Failed to load activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivityHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await apiClient.get('/user-data/activity/history?limit=30');
      if (response.success && response.data?.history) {
        setActivityHistory(response.data.history);
      }
    } catch (error) {
      console.error('Failed to load activity history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAddExercise = async () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!newExercise.name || !newExercise.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an exercise name.',
        variant: 'destructive'
      });
      return;
    }

    if (newExercise.duration !== undefined && newExercise.duration < 0) {
      toast({
        title: 'Validation Error',
        description: 'Duration cannot be negative.',
        variant: 'destructive'
      });
      return;
    }

    if (newExercise.duration !== undefined && newExercise.duration > 1400) {
      toast({
        title: 'Validation Error',
        description: 'Duration cannot exceed 1400 minutes.',
        variant: 'destructive'
      });
      return;
    }

    if (newExercise.caloriesBurned !== undefined && newExercise.caloriesBurned < 0) {
      toast({
        title: 'Validation Error',
        description: 'Calories burned cannot be negative.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await apiClient.post('/user-data/activity/exercise', {
        name: newExercise.name,
        duration: newExercise.duration || 0,
        caloriesBurned: newExercise.caloriesBurned || 0,
        type: newExercise.type || 'other',
        notes: newExercise.notes || ''
      });

      if (response.success) {
        const addedExercise = response.data?.exercise;
        const caloriesMsg = addedExercise?.caloriesBurned > 0 
          ? ` (${addedExercise.caloriesBurned} calories calculated)` 
          : '';
        toast({
          title: 'Exercise Added',
          description: `Your exercise has been logged successfully.${caloriesMsg}`
        });
        setNewExercise({
          name: '',
          duration: undefined,
          caloriesBurned: undefined,
          type: 'other',
          notes: ''
        });
        setShowExerciseForm(false);
        loadActivity();
        loadActivityHistory();
        // Notify other components (like CalorieTracker) that activity was updated
        window.dispatchEvent(new CustomEvent('activityUpdated'));
      } else {
        throw new Error(response.message || 'Failed to add exercise');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add exercise. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExercise = async (index: number) => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      setIsSaving(true);
      const response = await apiClient.delete(`/user-data/activity/exercise/${index}`);
      if (response.success) {
        toast({
          title: 'Exercise Removed',
          description: 'Exercise has been deleted.'
        });
        loadActivity();
        loadActivityHistory();
        // Notify other components (like CalorieTracker) that activity was updated
        window.dispatchEvent(new CustomEvent('activityUpdated'));
      } else {
        throw new Error(response.message || 'Failed to delete exercise');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete exercise. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWaterIntakeChange = async (amount: number) => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    // Calculate new water intake with constraints: minimum 0L, maximum 5L (5000ml)
    const newWaterIntake = Math.max(0, Math.min(5000, activity.waterIntake + amount));
    
    // Check if the change would exceed limits
    if (activity.waterIntake + amount > 5000) {
      toast({
        title: 'Maximum Reached',
        description: 'Water intake cannot exceed 5L (5000ml). Maximum is 5L.',
        variant: 'destructive'
      });
      return;
    }
    
    if (activity.waterIntake + amount < 0) {
      toast({
        title: 'Minimum Reached',
        description: 'Water intake cannot be negative. Minimum is 0L.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsSaving(true);
      const response = await apiClient.put('/user-data/activity/water', {
        waterIntake: newWaterIntake
      });

      if (response.success) {
        setActivity(prev => ({ ...prev, waterIntake: newWaterIntake }));
        toast({
          title: 'Water Intake Updated',
          description: `Total water intake: ${(newWaterIntake / 1000).toFixed(1)}L`
        });
      } else {
        throw new Error(response.message || 'Failed to update water intake');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update water intake. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualWaterSubmit = async () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    const amount = parseFloat(manualWaterAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: 'Invalid Input',
        description: amount < 0 ? 'Water intake cannot be negative. Minimum is 0L.' : 'Please enter a valid water amount.',
        variant: 'destructive'
      });
      return;
    }

    // Calculate new total by adding to existing water intake
    const newWaterIntake = activity.waterIntake + amount;

    if (newWaterIntake > 5000) {
      toast({
        title: 'Invalid Input',
        description: `Adding ${amount}ml would exceed the maximum of 5L (5000ml). Current: ${activity.waterIntake}ml, Maximum: 5000ml.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await apiClient.put('/user-data/activity/water', {
        waterIntake: newWaterIntake
      });

      if (response.success) {
        setActivity(prev => ({ ...prev, waterIntake: newWaterIntake }));
        setManualWaterAmount('');
        setShowManualWaterInput(false);
        toast({
          title: 'Water Intake Updated',
          description: `Added ${amount}ml. Total water intake: ${(newWaterIntake / 1000).toFixed(1)}L`
        });
      } else {
        throw new Error(response.message || 'Failed to update water intake');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update water intake. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateTotals = () => {
    const totalCalories = activity.exercises.reduce((sum, ex) => {
      const calories = ex.caloriesBurned || 0;
      return sum + calories;
    }, 0);
    const totalDuration = activity.exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);
    return { totalCalories: Math.round(totalCalories), totalDuration };
  };

  const { totalCalories, totalDuration } = calculateTotals();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto p-8 text-center">
            <ActivityIcon className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-4">Track Your Activity</h2>
            <p className="text-muted-foreground mb-6">
              Log your exercises and water intake to keep track of your fitness journey.
            </p>
            <Button onClick={() => setIsLoginModalOpen(true)} className="w-full">
              Sign In to Continue
            </Button>
          </Card>
        </div>
        <AuthModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Activity Tracker</h1>
            <p className="text-muted-foreground">Track your exercises and water intake</p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v as 'today' | 'history');
            if (v === 'history') {
              loadActivityHistory();
            }
          }}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="today">
                <ActivityIcon className="h-4 w-4 mr-2" />
                Today
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
              {/* Water Intake Section */}
              <Card className="p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Droplet className="h-6 w-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">Water Intake</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-3xl font-bold text-blue-600">
                      {(activity.waterIntake / 1000).toFixed(1)}L
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {activity.waterIntake} ml
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWaterIntakeChange(-250)}
                        disabled={isSaving || activity.waterIntake < 250}
                      >
                        -250ml
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWaterIntakeChange(250)}
                        disabled={isSaving || activity.waterIntake >= 5000}
                      >
                        +250ml
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWaterIntakeChange(500)}
                        disabled={isSaving || activity.waterIntake >= 5000}
                      >
                        +500ml
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWaterIntakeChange(1000)}
                        disabled={isSaving || activity.waterIntake >= 5000}
                      >
                        +1L
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowManualWaterInput(!showManualWaterInput);
                          if (showManualWaterInput) {
                            setManualWaterAmount('');
                          }
                        }}
                        disabled={isSaving}
                      >
                        {showManualWaterInput ? 'Cancel' : 'Manual'}
                      </Button>
                      {activity.waterIntake > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWaterIntakeChange(-activity.waterIntake)}
                          disabled={isSaving}
                          className="text-destructive hover:text-destructive"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                    {showManualWaterInput && (
                      <div className="flex gap-2 items-center">
                        <Input
                          id="manual-water-amount"
                          name="manualWaterAmount"
                          type="number"
                          placeholder="Enter amount (ml)"
                          value={manualWaterAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = parseFloat(value);
                            if (value === '' || (!isNaN(numValue) && numValue >= 0)) {
                              setManualWaterAmount(value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && manualWaterAmount && !isSaving) {
                              e.preventDefault();
                              handleManualWaterSubmit();
                            }
                          }}
                          className="w-32"
                          min="0"
                          max="5000"
                          step="1"
                          disabled={isSaving}
                        />
                        <span className="text-sm text-muted-foreground">ml</span>
                        <Button
                          size="sm"
                          onClick={handleManualWaterSubmit}
                          disabled={isSaving || !manualWaterAmount}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Set'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (activity.waterIntake / 5000) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Maximum: 5L (5000ml)
                  </div>
                </div>
              </Card>

              {/* Exercise Summary */}
              <Card className="p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <ActivityIcon className="h-6 w-6 text-green-500" />
                  <h2 className="text-xl font-semibold">Today's Summary</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{activity.exercises.length}</div>
                    <div className="text-sm text-muted-foreground">Exercises</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{totalDuration}</div>
                    <div className="text-sm text-muted-foreground">Minutes</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{totalCalories}</div>
                    <div className="text-sm text-muted-foreground">Calories Burned</div>
                  </div>
                </div>
              </Card>

              {/* Exercise List */}
              <Card className="p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Exercises</h2>
                  <div className="flex gap-2">
                    {activity.exercises.some(ex => (ex.caloriesBurned || 0) === 0 && ex.duration > 0) && (
                      <Button
                        onClick={async () => {
                          // Force reload to trigger backend recalculation
                          await loadActivity();
                          toast({
                            title: 'Recalculating Calories',
                            description: 'Calories are being recalculated for exercises with missing values.',
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recalculate Calories
                      </Button>
                    )}
                    <Button
                      onClick={() => setShowExerciseForm(!showExerciseForm)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Exercise
                    </Button>
                  </div>
                </div>

                {showExerciseForm && (
                  <Card className="p-4 mb-4 bg-muted/50">
                    <div className="space-y-4">
                      <div className="relative">
                        <Label htmlFor="exercise-name">Exercise Name *</Label>
                        <Input
                          id="exercise-name"
                          value={newExercise.name || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewExercise({ ...newExercise, name: value });
                            
                            // Clear previous suggestions timeout
                            if (suggestionTimeoutRef.current) {
                              clearTimeout(suggestionTimeoutRef.current);
                            }
                            
                            // Debounce suggestion loading
                            suggestionTimeoutRef.current = setTimeout(() => {
                              loadExerciseSuggestions(value);
                            }, 300);
                          }}
                          onFocus={() => {
                            if (newExercise.name && exerciseSuggestions.length > 0) {
                              setShowSuggestions(true);
                            }
                          }}
                          onBlur={() => {
                            // Delay hiding suggestions to allow clicking on them
                            setTimeout(() => setShowSuggestions(false), 200);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newExercise.name?.trim() && !isSaving) {
                              e.preventDefault();
                              if (showSuggestions && exerciseSuggestions.length > 0) {
                                // Select first suggestion
                                setNewExercise({ ...newExercise, name: exerciseSuggestions[0] });
                                setShowSuggestions(false);
                              } else {
                                handleAddExercise();
                              }
                            }
                          }}
                          placeholder="e.g., Running, Weight Lifting"
                          autoComplete="off"
                        />
                        {showSuggestions && exerciseSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                            {exerciseSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                                onClick={() => {
                                  setNewExercise({ ...newExercise, name: suggestion });
                                  setShowSuggestions(false);
                                }}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="duration">Duration (minutes)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={newExercise.duration ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? undefined : parseFloat(value);
                              if (numValue !== undefined && numValue < 0) {
                                return;
                              }
                              if (numValue !== undefined && numValue > 1400) {
                                return;
                              }
                              setNewExercise({ 
                                ...newExercise, 
                                duration: numValue || undefined 
                              });
                            }}
                            min="0"
                            max="1400"
                            step="1"
                            placeholder="0"
                          />
                        </div>
                        <div className="relative">
                          <Label htmlFor="calories">Calories Burned</Label>
                          <Input
                            id="calories"
                            type="number"
                            value={newExercise.caloriesBurned ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? undefined : parseFloat(value);
                              if (numValue !== undefined && numValue < 0) {
                                return;
                              }
                              setNewExercise({ 
                                ...newExercise, 
                                caloriesBurned: numValue || undefined 
                              });
                            }}
                            min="0"
                            step="1"
                            placeholder="0"
                          />
                          {isEstimatingCalories && (
                            <div className="absolute right-2 top-8">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="exercise-type">Type</Label>
                        <Select
                          value={newExercise.type || 'other'}
                          onValueChange={(value: any) => setNewExercise({ ...newExercise, type: value })}
                        >
                          <SelectTrigger id="exercise-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cardio">Cardio</SelectItem>
                            <SelectItem value="strength">Strength Training</SelectItem>
                            <SelectItem value="yoga">Yoga</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                          id="notes"
                          value={newExercise.notes || ''}
                          onChange={(e) => setNewExercise({ ...newExercise, notes: e.target.value })}
                          placeholder="Any additional notes..."
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddExercise}
                          disabled={isSaving || !newExercise.name?.trim()}
                          className="flex-1"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Add Exercise'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowExerciseForm(false);
                            setNewExercise({
                              name: '',
                              duration: undefined,
                              caloriesBurned: undefined,
                              type: 'other',
                              notes: ''
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {activity.exercises.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ActivityIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No exercises logged today. Add your first exercise!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activity.exercises.map((exercise, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{exercise.name}</h3>
                              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                                {exercise.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {exercise.duration} min
                              </div>
                              <div className="flex items-center gap-1">
                                <Flame className="h-4 w-4" />
                                <span className={exercise.caloriesBurned > 0 ? 'font-medium text-foreground' : ''}>
                                  {Math.round(exercise.caloriesBurned || 0)} kcal
                                </span>
                              </div>
                            </div>
                            {exercise.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{exercise.notes}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExercise(index)}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <History className="h-6 w-6" />
                    Activity History
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadActivityHistory}
                    disabled={isLoadingHistory}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {isLoadingHistory ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading history...</p>
                  </div>
                ) : activityHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No activity history yet. Start tracking your exercises and water intake!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activityHistory.map((item) => (
                      <Card
                        key={item.date}
                        className="p-4 cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{formatDate(item.date)}</h3>
                              <p className="text-sm text-muted-foreground">
                                {item.exercisesCount} exercise{item.exercisesCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">{item.totalCaloriesBurned} kcal</div>
                              <div className="text-xs text-muted-foreground">
                                {item.totalDuration} min | {(item.waterIntake / 1000).toFixed(1)}L water
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <AuthModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};

export default Activity;

