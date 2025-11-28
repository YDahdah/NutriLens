import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Loader2,
  Target,
  Activity,
  Droplet,
  Flame,
  Clock
} from 'lucide-react';
import UserDataService, { 
  WeeklyReport, 
  MonthlyReport, 
  YearlyReport 
} from '@/services/UserDataService';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const Reports = () => {
  const { isAuthenticated } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const userDataService = UserDataService.getInstance();

  useEffect(() => {
    if (isAuthenticated) {
      loadReports();
    }
  }, [isAuthenticated, activeTab]);

  const loadReports = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      if (activeTab === 'weekly') {
        const report = await userDataService.getWeeklyReport();
        setWeeklyReport(report);
      } else if (activeTab === 'monthly') {
        const report = await userDataService.getMonthlyReport();
        setMonthlyReport(report);
      } else if (activeTab === 'yearly') {
        const report = await userDataService.getYearlyReport();
        setYearlyReport(report);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    calories: {
      label: 'Calories',
      color: '#3b82f6', // blue
    },
    protein: {
      label: 'Protein',
      color: '#2563eb', // darker blue
    },
    carbs: {
      label: 'Carbs',
      color: '#10b981', // green
    },
    fat: {
      label: 'Fat',
      color: '#f59e0b', // orange
    },
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <Card className="p-6 sm:p-8 text-center">
          <BarChart3 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Nutrition Reports</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-4">
            Sign in to view your weekly, monthly, and yearly nutrition reports with detailed histograms.
          </p>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Sign In to View Reports
          </button>
        </Card>
        <AuthModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          mode="login"
          onModeChange={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Nutrition Reports</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Track your nutrition trends with detailed weekly, monthly, and yearly reports
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'weekly' | 'monthly' | 'yearly')}>
        <TabsList className="grid w-full max-w-md grid-cols-3 text-xs sm:text-sm">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-6">
          {isLoading ? (
            <Card className="p-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Loading weekly report...</p>
            </Card>
          ) : weeklyReport ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Avg Calories</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold">{Math.round(weeklyReport.averages.calories)}</p>
                    </div>
                    <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary opacity-50" />
                  </div>
                </Card>
                <Card className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Avg Protein</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold">{Math.round(weeklyReport.averages.protein)}g</p>
                    </div>
                    <Target className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 opacity-50" />
                  </div>
                </Card>
                <Card className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Days Tracked</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold">{weeklyReport.daysTracked}/7</p>
                    </div>
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 opacity-50" />
                  </div>
                </Card>
                <Card className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Calories</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold">{Math.round(weeklyReport.totals.calories)}</p>
                    </div>
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 opacity-50" />
                  </div>
                </Card>
              </div>

              {/* Activity Summary Cards */}
              {(weeklyReport.totals.caloriesBurned > 0 || weeklyReport.totals.waterIntake > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Calories Burned</p>
                        <p className="text-2xl font-bold">{Math.round(weeklyReport.totals.caloriesBurned || 0)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg: {Math.round(weeklyReport.averages.caloriesBurned || 0)}/day</p>
                      </div>
                      <Flame className="h-8 w-8 text-red-600 opacity-50" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Exercise Duration</p>
                        <p className="text-2xl font-bold">{Math.round(weeklyReport.totals.exerciseDuration || 0)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg: {Math.round(weeklyReport.averages.exerciseDuration || 0)} min/day</p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-600 opacity-50" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Water Intake</p>
                        <p className="text-2xl font-bold">{(weeklyReport.totals.waterIntake / 1000 || 0).toFixed(1)}L</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg: {(weeklyReport.averages.waterIntake / 1000 || 0).toFixed(1)}L/day</p>
                      </div>
                      <Droplet className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                  </Card>
                </div>
              )}

              {/* Calories Histogram */}
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Daily Calories</h3>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={weeklyReport.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Calories', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="calories" 
                      fill={chartConfig.calories.color}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </Card>

              {/* Macros Histogram */}
              <Card className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Daily Macros</h3>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={weeklyReport.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Grams', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="protein" 
                      fill={chartConfig.protein.color}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="carbs" 
                      fill={chartConfig.carbs.color}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="fat" 
                      fill={chartConfig.fat.color}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </Card>

              {/* Activity Charts */}
              {(weeklyReport.totals.caloriesBurned > 0 || weeklyReport.totals.waterIntake > 0) && (
                <>
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Daily Calories Burned</h3>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <BarChart data={weeklyReport.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Calories', angle: -90, position: 'insideLeft' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="caloriesBurned" 
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Daily Water Intake</h3>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <BarChart data={weeklyReport.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Liters', angle: -90, position: 'insideLeft' }}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => `${(value / 1000).toFixed(1)}L`}
                        />
                        <Bar 
                          dataKey="waterIntake" 
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </Card>
                </>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No weekly data available</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="mt-6">
          {isLoading ? (
            <Card className="p-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Loading monthly report...</p>
            </Card>
          ) : monthlyReport ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Calories</p>
                      <p className="text-2xl font-bold">{Math.round(monthlyReport.averages.calories)}</p>
                    </div>
                    <Activity className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Protein</p>
                      <p className="text-2xl font-bold">{Math.round(monthlyReport.averages.protein)}g</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-600 opacity-50" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Days Tracked</p>
                      <p className="text-2xl font-bold">{monthlyReport.daysTracked}/30</p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-600 opacity-50" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Calories</p>
                      <p className="text-2xl font-bold">{Math.round(monthlyReport.totals.calories)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600 opacity-50" />
                  </div>
                </Card>
              </div>

              {/* Activity Summary Cards */}
              {(monthlyReport.totals.caloriesBurned > 0 || monthlyReport.totals.waterIntake > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Calories Burned</p>
                        <p className="text-2xl font-bold">{Math.round(monthlyReport.totals.caloriesBurned || 0)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg: {Math.round(monthlyReport.averages.caloriesBurned || 0)}/day</p>
                      </div>
                      <Flame className="h-8 w-8 text-red-600 opacity-50" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Exercise Duration</p>
                        <p className="text-2xl font-bold">{Math.round(monthlyReport.totals.exerciseDuration || 0)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg: {Math.round(monthlyReport.averages.exerciseDuration || 0)} min/day</p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-600 opacity-50" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Water Intake</p>
                        <p className="text-2xl font-bold">{(monthlyReport.totals.waterIntake / 1000 || 0).toFixed(1)}L</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg: {(monthlyReport.averages.waterIntake / 1000 || 0).toFixed(1)}L/day</p>
                      </div>
                      <Droplet className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                  </Card>
                </div>
              )}

              {/* Weekly Calories Histogram */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Weekly Calories</h3>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={monthlyReport.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Calories', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="calories" 
                      fill={chartConfig.calories.color}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </Card>

              {/* Weekly Macros Histogram */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Weekly Macros</h3>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={monthlyReport.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Grams', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="protein" 
                      fill={chartConfig.protein.color}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="carbs" 
                      fill={chartConfig.carbs.color}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="fat" 
                      fill={chartConfig.fat.color}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </Card>

              {/* Activity Charts */}
              {(monthlyReport.totals.caloriesBurned > 0 || monthlyReport.totals.waterIntake > 0) && (
                <>
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Weekly Calories Burned</h3>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <BarChart data={monthlyReport.weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Calories', angle: -90, position: 'insideLeft' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="caloriesBurned" 
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Weekly Water Intake</h3>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <BarChart data={monthlyReport.weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Liters', angle: -90, position: 'insideLeft' }}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => `${(value / 1000).toFixed(1)}L`}
                        />
                        <Bar 
                          dataKey="waterIntake" 
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </Card>
                </>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No monthly data available</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="yearly" className="mt-6">
          {isLoading ? (
            <Card className="p-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Loading yearly report...</p>
            </Card>
          ) : yearlyReport ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Calories</p>
                      <p className="text-2xl font-bold">{Math.round(yearlyReport.averages.calories)}</p>
                    </div>
                    <Activity className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Protein</p>
                      <p className="text-2xl font-bold">{Math.round(yearlyReport.averages.protein)}g</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-600 opacity-50" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Days Tracked</p>
                      <p className="text-2xl font-bold">{yearlyReport.daysTracked}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-600 opacity-50" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Calories</p>
                      <p className="text-2xl font-bold">{Math.round(yearlyReport.totals.calories)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600 opacity-50" />
                  </div>
                </Card>
              </div>

              {/* Activity Summary Cards */}
              {(yearlyReport.totals.caloriesBurned > 0 || yearlyReport.totals.waterIntake > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Calories Burned</p>
                        <p className="text-2xl font-bold">{Math.round(yearlyReport.totals.caloriesBurned || 0)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg: {Math.round(yearlyReport.averages.caloriesBurned || 0)}/day</p>
                      </div>
                      <Flame className="h-8 w-8 text-red-600 opacity-50" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Exercise Duration</p>
                        <p className="text-2xl font-bold">{Math.round(yearlyReport.totals.exerciseDuration || 0)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg: {Math.round(yearlyReport.averages.exerciseDuration || 0)} min/day</p>
                      </div>
                      <Clock className="h-8 w-8 text-purple-600 opacity-50" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Water Intake</p>
                        <p className="text-2xl font-bold">{(yearlyReport.totals.waterIntake / 1000 || 0).toFixed(1)}L</p>
                        <p className="text-xs text-muted-foreground mt-1">Avg: {(yearlyReport.averages.waterIntake / 1000 || 0).toFixed(1)}L/day</p>
                      </div>
                      <Droplet className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                  </Card>
                </div>
              )}

              {/* Monthly Calories Histogram */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Calories</h3>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={yearlyReport.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Calories', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="calories" 
                      fill={chartConfig.calories.color}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </Card>

              {/* Monthly Macros Histogram */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Macros</h3>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={yearlyReport.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Grams', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="protein" 
                      fill={chartConfig.protein.color}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="carbs" 
                      fill={chartConfig.carbs.color}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="fat" 
                      fill={chartConfig.fat.color}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </Card>

              {/* Activity Charts */}
              {(yearlyReport.totals.caloriesBurned > 0 || yearlyReport.totals.waterIntake > 0) && (
                <>
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Monthly Calories Burned</h3>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <BarChart data={yearlyReport.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Calories', angle: -90, position: 'insideLeft' }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="caloriesBurned" 
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Monthly Water Intake</h3>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <BarChart data={yearlyReport.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="label" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Liters', angle: -90, position: 'insideLeft' }}
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => `${(value / 1000).toFixed(1)}L`}
                        />
                        <Bar 
                          dataKey="waterIntake" 
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </Card>
                </>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No yearly data available</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;

