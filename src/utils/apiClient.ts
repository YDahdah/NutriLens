// Shared API client utility
import { API_CONFIG } from '@/config/constants';
import { AppError, ErrorRecovery, ErrorCode } from './errors';
import { logger } from './logger';

const API_BASE_URL = API_CONFIG.BASE_URL;

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;
  private lastChatRequestTime: number = 0;
  private chatRequestInProgress: boolean = false;
  private chatRateLimitUntil: number = 0;

  constructor(baseUrl: string = API_BASE_URL) {
    // Validate and normalize the base URL
    try {
      const url = new URL(baseUrl);
      this.baseUrl = url.origin + url.pathname.replace(/\/$/, '');
    } catch (error) {
      // If URL parsing fails, try to fix common issues
      let normalizedUrl = baseUrl.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'http://' + normalizedUrl;
      }
      try {
        const url = new URL(normalizedUrl);
        this.baseUrl = url.origin + url.pathname.replace(/\/$/, '');
      } catch {
        // Fallback to original if all else fails
        console.warn(`Invalid API base URL: ${baseUrl}. Using as-is.`);
        this.baseUrl = baseUrl;
      }
    }
  }

  static getInstance(baseUrl?: string): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(baseUrl);
    }
    return ApiClient.instance;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('nutriai_token');
  }

  private async makeRequest<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = this.getAuthToken();
      const url = `${this.baseUrl}${endpoint}`;
      
      const isFormData = options.body instanceof FormData;
      const defaultHeaders: Record<string, string> = {
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      if (!isFormData) {
        defaultHeaders['Content-Type'] = 'application/json';
      }
      // Create AbortController for timeout
      // Use longer timeout for vision analysis, chat requests, and auth endpoints that send emails
      const isVisionRequest = endpoint.includes('/vision/analyze');
      const isChatRequest = endpoint.includes('/chat/message');
      const isAuthRequest = endpoint.includes('/auth/register') || 
                           endpoint.includes('/auth/resend-verification') || 
                           endpoint.includes('/auth/forgot-password');
      const timeoutDuration = isVisionRequest 
        ? API_CONFIG.TIMEOUT.VISION 
        : (isChatRequest ? API_CONFIG.TIMEOUT.CHAT 
          : (isAuthRequest ? 90000 : API_CONFIG.TIMEOUT.DEFAULT)); // 90 seconds for auth endpoints
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const defaultOptions: RequestInit = {
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        ...options,
        signal: controller.signal,
      };

      let response: Response;
      try {
        response = await fetch(url, defaultOptions);
        clearTimeout(timeoutId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          const isVisionRequest = endpoint.includes('/vision/analyze');
          const isChatRequest = endpoint.includes('/chat/message');
          let timeoutMessage: string;
          if (isVisionRequest) {
            timeoutMessage = 'Vision analysis is taking longer than expected (over 3 minutes). The image might be complex or the service is busy. Please try again with a simpler image or wait a moment.';
          } else if (isChatRequest) {
            timeoutMessage = 'Chat request is taking longer than expected (over 2 minutes). The AI service might be busy. Please try again in a moment.';
          } else {
            timeoutMessage = 'Request timeout: The server took too long to respond. Please try again.';
          }
          throw new Error(timeoutMessage);
        }
        // Enhance error with endpoint context for better error detection
        if (error instanceof Error) {
          (error as any).endpoint = endpoint;
        }
        throw error;
      }
      
      // Get raw response text first
      const raw = await response.text();
      
      // Check status BEFORE parsing JSON
      if (!response.ok) {
        // Try to parse error response as JSON, but handle gracefully if it fails
        let data: any;
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          // If JSON parsing fails, use raw text (truncated)
          data = { message: `HTTP ${response.status}: ${raw.slice(0, 200)}` };
        }
        
        // Create error with message and preserve status code
        const error = new Error(data.message || `HTTP ${response.status}: ${raw.slice(0, 200)}`);
        (error as any).status = response.status;
        (error as any).response = { status: response.status, data };
        throw error;
      }
      
      // Parse JSON only if response is OK
      let data: any;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (parseError) {
        // If JSON parsing fails even on OK response, throw error
        throw new Error(`Invalid JSON response: ${raw.slice(0, 200)}`);
      }
      
      return data;
    } catch (error) {
      // Convert to AppError for better error handling
      const appError = AppError.fromError(error, {
        endpoint,
        method: options.method || 'GET',
        baseUrl: this.baseUrl,
      });

      // Log errors appropriately
      // Don't log expected/validation errors as errors - they're normal user input issues
      if (appError.code === ErrorCode.UNAUTHORIZED || 
          appError.code === ErrorCode.VALIDATION_ERROR ||
          appError.code === ErrorCode.RATE_LIMIT ||
          appError.code === ErrorCode.CONNECTION_REFUSED ||
          appError.statusCode === 409 || // 409 conflicts are validation errors
          appError.statusCode === 400) { // 400 bad requests are validation errors
        // Log as debug - these are expected errors, not system failures
        logger.debug('Expected error:', appError);
      } else {
        logger.error('API request error:', appError);
      }
      
      throw appError;
    }
  }

  // Generic CRUD operations with retry logic
  async get<T = any>(endpoint: string, options: { retry?: boolean } = {}): Promise<ApiResponse<T>> {
    const makeRequest = () => this.makeRequest<T>(endpoint, { method: 'GET' });
    
    if (options.retry !== false) {
      return ErrorRecovery.retryWithBackoff(makeRequest, {
        maxRetries: 2,
        initialDelay: 1000,
        retryable: (error) => {
          const appError = AppError.fromError(error);
          return appError.retryable && appError.code !== ErrorCode.UNAUTHORIZED;
        },
      });
    }
    
    return makeRequest();
  }

  async post<T = any>(endpoint: string, data?: any, options: { retry?: boolean } = {}): Promise<ApiResponse<T>> {
    // Special rate limiting for chat endpoint
    if (endpoint === '/chat/message') {
      const now = Date.now();
      
      // Check if we're rate limited
      if (now < this.chatRateLimitUntil) {
        const waitTime = Math.ceil((this.chatRateLimitUntil - now) / 1000);
        const error = new Error(`Rate limit active. Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before trying again.`);
        (error as any).status = 429;
        throw error;
      }
      
      // Check if request is in progress
      if (this.chatRequestInProgress) {
        const error = new Error('A chat request is already in progress. Please wait.');
        (error as any).status = 429;
        throw error;
      }
      
      // Enforce minimum interval (2 seconds) - matches backend CHAT_MIN_INTERVAL
      const timeSinceLastRequest = now - this.lastChatRequestTime;
      const minInterval = 2000; // 2 seconds - reduced for better UX
      
      if (timeSinceLastRequest < minInterval && this.lastChatRequestTime > 0) {
        const waitTime = Math.ceil((minInterval - timeSinceLastRequest) / 1000);
        const error = new Error(`Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.`);
        (error as any).status = 429;
        throw error;
      }
      
      // Set flags
      this.chatRequestInProgress = true;
      this.lastChatRequestTime = now;
      
      try {
        const makeRequest = () => this.makeRequest<T>(endpoint, {
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined,
        });
        
        const response = options.retry !== false
          ? await ErrorRecovery.retryWithBackoff(makeRequest, {
              maxRetries: 1, // Only 1 retry for POST requests
              initialDelay: 2000,
              retryable: (error) => {
                const appError = AppError.fromError(error);
                return appError.retryable && 
                       appError.code !== ErrorCode.UNAUTHORIZED &&
                       appError.code !== ErrorCode.VALIDATION_ERROR;
              },
            })
          : await makeRequest();
        
        return response;
      } catch (error: any) {
        // If rate limited by server, set longer cooldown
        const appError = AppError.fromError(error);
        if (appError.code === ErrorCode.RATE_LIMIT) {
          this.chatRateLimitUntil = Date.now() + (appError.retryAfter || 60) * 1000;
          // Clear rate limit after cooldown
          setTimeout(() => {
            this.chatRateLimitUntil = 0;
          }, (appError.retryAfter || 60) * 1000);
        }
        throw error;
      } finally {
        this.chatRequestInProgress = false;
      }
    }
    
    const makeRequest = () => this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (options.retry !== false) {
      return ErrorRecovery.retryWithBackoff(makeRequest, {
        maxRetries: 1,
        initialDelay: 1000,
        retryable: (error) => {
          const appError = AppError.fromError(error);
          return appError.retryable && appError.code !== ErrorCode.UNAUTHORIZED;
        },
      });
    }
    
    return makeRequest();
  }

  async upload<T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }

  // Auth-specific methods
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.post('/auth/login', { email, password });
  }

  async googleSignIn(accessToken: string, mode: 'login' | 'signup' = 'login'): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.post('/auth/google-signin', { accessToken, mode });
  }

  async register(name: string, email: string, password: string): Promise<ApiResponse<{ user: any; emailSent: boolean; verificationUrl?: string }>> {
    return this.post('/auth/register', { name, email, password });
  }

  async getProfile(): Promise<ApiResponse<{ user: any }>> {
    return this.get('/auth/profile');
  }

  // Email verification methods
  async verifyEmail(token: string): Promise<ApiResponse<any>> {
    return this.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  async verifyEmailCode(email: string, code: string): Promise<ApiResponse<any>> {
    return this.post('/auth/verify-email-code', { email, code });
  }

  async resendVerification(email: string): Promise<ApiResponse<any>> {
    return this.post('/auth/resend-verification', { email });
  }

  // Password reset methods
  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    return this.post('/auth/forgot-password', { email });
  }

  async verifyCode(email: string, code: string): Promise<ApiResponse<any>> {
    return this.post('/auth/verify-code', { email, code });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<ApiResponse<any>> {
    return this.post('/auth/reset-password', { email, code, newPassword });
  }

  // Food-specific methods
  async searchFoods<T = any>(query: string, limit: number = 10): Promise<ApiResponse<T[]>> {
    return this.get<T[]>(`/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getFoodById<T = any>(id: string): Promise<ApiResponse<T>> {
    return this.get<T>(`/foods/${id}`);
  }

  // Admin endpoints
  async getAdminStats(): Promise<ApiResponse> {
    return this.get('/admin/stats');
  }

  async getAllUsers(page: number = 1, limit: number = 50, search: string = ''): Promise<ApiResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    return this.get(`/admin/users?${params.toString()}`);
  }

  async getUser(userId: string): Promise<ApiResponse> {
    return this.get(`/admin/users/${userId}`);
  }

  async toggleAdminStatus(userId: string, isAdmin: boolean): Promise<ApiResponse> {
    return this.put(`/admin/users/${userId}/admin`, { is_admin: isAdmin });
  }

  async deleteUser(userId: string): Promise<ApiResponse> {
    return this.delete(`/admin/users/${userId}`);
  }

  async deleteUserHistory(userId: string, date?: string, category?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (category) params.append('category', category);
    const queryString = params.toString();
    return this.delete(`/admin/users/${userId}/history${queryString ? `?${queryString}` : ''}`);
  }

  async getUserDetails(userId: string): Promise<ApiResponse> {
    return this.get(`/admin/users/${userId}`);
  }

  async bulkUserOperation(userIds: string[], action: 'delete' | 'verify' | 'unverify' | 'promote' | 'demote'): Promise<ApiResponse> {
    return this.post('/admin/users/bulk', { user_ids: userIds, action });
  }

  async getAdminLogs(page: number = 1, limit: number = 50, action?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (action) params.append('action', action);
    return this.get(`/admin/logs?${params.toString()}`);
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();
