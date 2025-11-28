// Shared API client utility
const API_BASE_URL = 'http://localhost:3001/api';

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
    this.baseUrl = baseUrl;
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
      // Use longer timeout for vision analysis (vision models can be slow, especially for complex images)
      const isVisionRequest = endpoint.includes('/vision/analyze');
      const timeoutDuration = isVisionRequest ? 180000 : 60000; // 180s (3 min) for vision, 60s for others
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
          const timeoutMessage = isVisionRequest 
            ? 'Vision analysis is taking longer than expected (over 3 minutes). The image might be complex or the service is busy. Please try again with a simpler image or wait a moment.'
            : 'Request timeout: The server took too long to respond. Please try again.';
          throw new Error(timeoutMessage);
        }
        throw error;
      }
      
      // Try to parse JSON, but handle cases where response might not be JSON
      let data: any;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        // If JSON parsing fails, create a simple error response
        data = { message: `HTTP error! status: ${response.status}` };
      }
      
      if (!response.ok) {
        // Handle specific error cases more gracefully
        if (response.status === 503 && data.message?.includes('Authentication service temporarily unavailable')) {
          throw new Error('Authentication service temporarily unavailable. Please set up MySQL database to use authentication features.');
        }
        // For 401 errors, return a response that indicates auth failure without throwing
        // This prevents console errors when checking auth status
        if (response.status === 401) {
          const authError = new Error('Unauthorized');
          (authError as any).status = 401;
          (authError as any).response = response;
          throw authError;
        }
        // Provide user-friendly message for API key configuration errors
        let errorMessage = data.message || `HTTP error! status: ${response.status}`;
        if (response.status === 500 && data.message?.includes('Chat API key not configured')) {
          errorMessage = 'Chat API key not configured. Please set CHAT_API_KEY environment variable in the backend and restart the server.';
        }
        // Create error with status code for better error handling
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }
      
      return data;
    } catch (error) {
      // Don't log expected errors (database unavailable, 401 auth failures, validation errors, rate limits)
      const isDatabaseError = error instanceof Error && error.message.includes('Authentication service temporarily unavailable');
      const isAuthError = (error as any)?.status === 401;
      const isRateLimitError = (error as any)?.status === 429 || (error instanceof Error && (
        error.message.toLowerCase().includes('rate limit') ||
        error.message.toLowerCase().includes('too many requests') ||
        error.message.toLowerCase().includes('daily free model limit')
      ));
      const isValidationError = error instanceof Error && (
        error.message.includes('Password must be') ||
        error.message.includes('Invalid') ||
        error.message.includes('required')
      );
      const isTimeoutError = error instanceof Error && (error.message.includes('timeout') || error.message.includes('aborted'));
      
      if (!isDatabaseError && !isAuthError && !isValidationError && !isRateLimitError) {
        console.error('API request error:', error);
      }
      
      // Re-throw with better error message for timeouts
      if (isTimeoutError) {
        const timeoutError = new Error('Request timeout: The server took too long to respond. Please check your connection and try again.');
        (timeoutError as any).status = 408;
        throw timeoutError;
      }
      
      throw error;
    }
  }

  // Generic CRUD operations
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
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
        const response = await this.makeRequest<T>(endpoint, {
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined,
        });
        return response;
      } catch (error: any) {
        // If rate limited by server, set longer cooldown
        if (error?.status === 429) {
          this.chatRateLimitUntil = Date.now() + 60000; // 60 seconds
          // Clear rate limit after cooldown
          setTimeout(() => {
            this.chatRateLimitUntil = 0;
          }, 60000);
        }
        throw error;
      } finally {
        this.chatRequestInProgress = false;
      }
    }
    
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
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
  async searchFoods(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.get(`/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getFoodById(id: string): Promise<ApiResponse<any>> {
    return this.get(`/foods/${id}`);
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
