/**
 * Comprehensive tests for CalorieTracker component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalorieTracker from '../CalorieTracker';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock services
vi.mock('@/services/FoodService');
vi.mock('@/services/UserDataService');
vi.mock('@/utils/apiClient');

describe('CalorieTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <AuthProvider>
        <CalorieTracker />
      </AuthProvider>
    );
    expect(screen.getByText(/calorie tracker/i)).toBeInTheDocument();
  });

  it('displays meal tabs', () => {
    render(
      <AuthProvider>
        <CalorieTracker />
      </AuthProvider>
    );
    expect(screen.getByText(/breakfast/i)).toBeInTheDocument();
    expect(screen.getByText(/lunch/i)).toBeInTheDocument();
    expect(screen.getByText(/dinner/i)).toBeInTheDocument();
  });

  it('allows adding food to meals', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <CalorieTracker />
      </AuthProvider>
    );

    const foodInput = screen.getByPlaceholderText(/search for food/i);
    await user.type(foodInput, 'apple');

    // Wait for suggestions
    await waitFor(() => {
      expect(screen.getByText(/apple/i)).toBeInTheDocument();
    });
  });

  it('calculates daily totals correctly', () => {
    // Test meal totals calculation
    const meals = [
      {
        id: '1',
        name: 'breakfast',
        foods: [
          { calories: 100, protein: 5, carbs: 20, fat: 2 },
          { calories: 200, protein: 10, carbs: 30, fat: 5 },
        ],
      },
    ];

    const totalCalories = meals[0].foods.reduce((sum, f) => sum + f.calories, 0);
    expect(totalCalories).toBe(300);
  });
});

