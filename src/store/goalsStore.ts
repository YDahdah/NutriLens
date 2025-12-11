/**
 * Zustand store for managing daily goals
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GoalsState {
  goals: DailyGoal;
  setGoals: (goals: DailyGoal) => void;
  goalsLoaded: boolean;
  setGoalsLoaded: (loaded: boolean) => void;
}

export const useGoalsStore = create<GoalsState>()(
  devtools(
    (set) => ({
      goals: {
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
      },
      goalsLoaded: false,
      setGoals: (goals) => set({ goals }, false, 'setGoals'),
      setGoalsLoaded: (loaded) =>
        set({ goalsLoaded: loaded }, false, 'setGoalsLoaded'),
    }),
    { name: 'GoalsStore' }
  )
);

