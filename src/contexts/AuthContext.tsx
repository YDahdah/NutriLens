import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../utils/apiClient';
import { AppError, ErrorCode } from '../utils/errors';

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
  googleSignIn: (accessToken: string, mode?: 'login' | 'signup') => Promise<{ success: boolean; message?: string; account_exists?: boolean }>;
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

  const getAuthToken = () => {
    return localStorage.getItem('nutriai_token');
  };

  // Helper function to handle database unavailable errors
  const handleDatabaseUnavailable = (): { success: false; message: string } => {
    console.warn('Database not available - authentication features disabled');
    setIsDatabaseAvailable(false);
    return { 
      success: false, 
      message: 'Authentication service temporarily unavailable. Please set up MySQL database to use authentication features.' 
    };
  };

  // Helper function to check if error is database unavailable
  const isDatabaseUnavailableError = (error: unknown): boolean => {
    return error instanceof Error && error.message.includes('Authentication service temporarily unavailable');
  };

  const verifyToken = useCallback(async () => {
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
        // Only update user if data actually changed to prevent unnecessary re-renders
        setUser(prevUser => {
          if (prevUser && JSON.stringify(prevUser) === JSON.stringify(userData)) {
            return prevUser; // Return same reference if data unchanged
          }
          return userData;
        });
        localStorage.setItem('nutriai_user', JSON.stringify(userData));
        setIsDatabaseAvailable(true);
      } else {
        setUser(null);
        localStorage.removeItem('nutriai_user');
        localStorage.removeItem('nutriai_token');
      }
    } catch (error: any) {
      if (isDatabaseUnavailableError(error)) {
        handleDatabaseUnavailable();
        setIsLoading(false);
        return;
      }
      
      const status = error?.status || (error?.response?.status);
      
      // Check if it's a connection refused error (backend not running)
      if (error instanceof AppError && error.code === ErrorCode.CONNECTION_REFUSED) {
        console.warn('Backend server not running. Please start the Flask backend server.');
        setUser(null);
        localStorage.removeItem('nutriai_user');
        localStorage.removeItem('nutriai_token');
        setIsLoading(false);
        return;
      }
      
      if (status === 401) {
        setUser(null);
        localStorage.removeItem('nutriai_user');
        localStorage.removeItem('nutriai_token');
        hasVerifiedTokenRef.current = false; // Reset on 401 to allow retry
      } else {
        console.error('Token verification failed:', error);
        setUser(null);
        localStorage.removeItem('nutriai_user');
        localStorage.removeItem('nutriai_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasVerifiedTokenRef = useRef(false);

  useEffect(() => {
    // Only verify token once on mount
    if (hasVerifiedTokenRef.current) {
      return;
    }

    const savedUser = localStorage.getItem('nutriai_user');
    const savedToken = localStorage.getItem('nutriai_token');
    
    if (savedUser && savedToken) {
      hasVerifiedTokenRef.current = true;
      try {
        const parsedUser = JSON.parse(savedUser);
        verifyToken().catch((error) => {
          if (error?.status !== 401) {
            console.error('Error verifying token:', error);
          }
          hasVerifiedTokenRef.current = false; // Allow retry on error
        });
      } catch {
        verifyToken().catch((error) => {
          if (error?.status !== 401) {
            console.error('Error verifying token:', error);
          }
          hasVerifiedTokenRef.current = false; // Allow retry on error
        });
      }
    } else {
      setIsLoading(false);
    }
  }, [verifyToken]);

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
      
      if (isDatabaseUnavailableError(error)) {
        return handleDatabaseUnavailable();
      }
      
      console.error('Login error:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, message: error instanceof Error ? error.message : 'Login failed' };
    }
  };

  const googleSignIn = async (accessToken: string, mode: 'login' | 'signup' = 'login'): Promise<{ success: boolean; message?: string; account_exists?: boolean }> => {
    setIsLoading(true);
    try {
      const response = await apiClient.googleSignIn(accessToken, mode);

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
        const accountExists = (response as any).account_exists || false;
        return { 
          success: false, 
          message: response.message || 'Google sign-in failed',
          account_exists: accountExists
        };
      }
    } catch (error) {
      setIsLoading(false);
      
      if (isDatabaseUnavailableError(error)) {
        return handleDatabaseUnavailable();
      }
      
      console.error('Google sign-in error:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, message: error instanceof Error ? error.message : 'Google sign-in failed' };
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string; verificationCode?: string; emailSent?: boolean }> => {
    setIsLoading(true);
    try {
      const response = await apiClient.register(name, email, password);

      if (response.success) {
        setIsDatabaseAvailable(true);
        setIsLoading(false);
        return { 
          success: true,
          verificationCode: response.data?.verificationCode,
          emailSent: response.data?.emailSent,
          message: response.message
        };
      } else {
        setIsLoading(false);
        return { success: false, message: response.message || 'Registration failed' };
      }
    } catch (error) {
      setIsLoading(false);
      
      if (isDatabaseUnavailableError(error)) {
        return handleDatabaseUnavailable();
      }
      
      // Don't log validation errors (409, 400) as errors - they're expected user input issues
      const status = (error as any)?.status || (error as any)?.statusCode;
      const isValidationError = status === 409 || status === 400 || 
                                (error instanceof AppError && 
                                 (error.code === ErrorCode.VALIDATION_ERROR || 
                                  error.statusCode === 409 || 
                                  error.statusCode === 400));
      
      if (!isValidationError) {
        console.error('Signup error:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Use user-friendly message from AppError if available
      const errorMessage = error instanceof AppError 
        ? error.userMessage 
        : (error instanceof Error ? error.message : 'Registration failed');
      
      return { success: false, message: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('nutriai_user');
      localStorage.removeItem('nutriai_token');
      hasVerifiedTokenRef.current = false; // Reset ref on logout to allow re-verification
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
    googleSignIn,
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
