import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

interface User {
  id?: string;
  user_id?: number;
  email: string;
  name?: string;
  username?: string;
  created_at?: string;
  is_admin?: boolean;
  permissions: {
    canUseChat: boolean;
    canAnalyzeFood: boolean;
    canTrackProgress: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isLoading: boolean;
  updateProfile: (name: string, email: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  isDatabaseAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDatabaseAvailable, setIsDatabaseAvailable] = useState(true);

  // Helper function to get auth token
  const getAuthToken = () => {
    return localStorage.getItem('nutriai_token');
  };

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('nutriai_user');
    const savedToken = localStorage.getItem('nutriai_token');
    
    if (savedUser && savedToken) {
      // Parse saved user to check admin status
      try {
        const parsedUser = JSON.parse(savedUser);
        // Always verify token with backend to get latest admin status
        verifyToken();
      } catch {
        // If parsing fails, verify token anyway
        verifyToken();
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Verify token with backend
  const verifyToken = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data?.user) {
        const userData = {
          ...response.data.user,
          is_admin: response.data.user.is_admin || false,
          permissions: {
            canUseChat: true,
            canAnalyzeFood: true,
            canTrackProgress: true
          }
        };
        setUser(userData);
        localStorage.setItem('nutriai_user', JSON.stringify(userData));
        setIsDatabaseAvailable(true);
      } else {
        // Token is invalid, clear storage silently
        localStorage.removeItem('nutriai_user');
        localStorage.removeItem('nutriai_token');
      }
    } catch (error) {
      // Check if it's a database unavailable error
      if (error instanceof Error && error.message.includes('Authentication service temporarily unavailable')) {
        console.warn('Database not available - authentication features disabled');
        setIsDatabaseAvailable(false);
        // Don't clear storage for database unavailability
        setIsLoading(false);
        return;
      }
      
      // Only log non-401 errors (401 is expected when token is expired/invalid)
      const status = (error as any)?.status;
      if (status !== 401) {
        console.error('Token verification failed:', error);
      }
      // Token is invalid or expired, clear storage silently
      localStorage.removeItem('nutriai_user');
      localStorage.removeItem('nutriai_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(email, password);

      if (response.success && response.data?.user && response.data?.token) {
        const userData = {
          ...response.data.user,
          is_admin: response.data.user.is_admin || false,
          permissions: {
            canUseChat: true,
            canAnalyzeFood: true,
            canTrackProgress: true
          }
        };
        
        setUser(userData);
        localStorage.setItem('nutriai_user', JSON.stringify(userData));
        localStorage.setItem('nutriai_token', response.data.token);
        setIsDatabaseAvailable(true);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error) {
      setIsLoading(false);
      
      // Check if it's a database unavailable error
      if (error instanceof Error && error.message.includes('Authentication service temporarily unavailable')) {
        console.warn('Database not available - authentication features disabled');
        setIsDatabaseAvailable(false);
        return { success: false, message: 'Authentication service temporarily unavailable. Please set up MySQL database to use authentication features.' };
      }
      
      console.error('Login error:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, message: error instanceof Error ? error.message : 'Login failed' };
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const response = await apiClient.register(name, email, password);

      if (response.success) {
        // Don't automatically log in after signup - user needs to verify email first
        // Return true to indicate successful registration
        setIsDatabaseAvailable(true);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, message: response.message || 'Registration failed' };
      }
    } catch (error) {
      setIsLoading(false);
      
      // Check if it's a database unavailable error
      if (error instanceof Error && error.message.includes('Authentication service temporarily unavailable')) {
        console.warn('Database not available - authentication features disabled');
        setIsDatabaseAvailable(false);
        return { success: false, message: 'Authentication service temporarily unavailable. Please set up MySQL database to use authentication features.' };
      }
      
      console.error('Signup error:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, message: error instanceof Error ? error.message : 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to invalidate token on server
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call result
      setUser(null);
      localStorage.removeItem('nutriai_user');
      localStorage.removeItem('nutriai_token');
    }
  };

  const updateProfile = async (name: string, email: string): Promise<boolean> => {
    try {
      const response = await apiClient.put('/auth/profile', { name, email });

      if (response.success && response.data?.user) {
        const userData = {
          ...response.data.user,
          is_admin: response.data.user.is_admin || false,
          permissions: {
            canUseChat: true,
            canAnalyzeFood: true,
            canTrackProgress: true
          }
        };
        
        setUser(userData);
        localStorage.setItem('nutriai_user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const response = await apiClient.put('/auth/change-password', { currentPassword, newPassword });

      return response.success;
    } catch (error) {
      console.error('Password change error:', error);
      return false;
    }
  };

  const isAuthenticated = !!user;

  const value = {
    user,
    isAuthenticated,
    isAdmin: user?.is_admin || false,
    login,
    signup,
    logout,
    isLoading,
    updateProfile,
    changePassword,
    isDatabaseAvailable
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
