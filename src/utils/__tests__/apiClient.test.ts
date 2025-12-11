import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../apiClient';

// Mock fetch
global.fetch = vi.fn();

describe('ApiClient', () => {
  let apiClient: ApiClient;
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    apiClient = new ApiClient();
    mockFetch.mockClear();
  });

  it('makes GET request correctly', async () => {
    const mockData = { success: true, data: { id: 1 } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      status: 200,
    } as Response);

    const result = await apiClient.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual(mockData);
  });

  it('makes POST request with body', async () => {
    const mockData = { success: true };
    const requestBody = { name: 'Test' };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      status: 200,
    } as Response);

    await apiClient.post('/test', requestBody);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
    );
  });

  it('handles 401 errors and clears token', async () => {
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    global.localStorage = localStorageMock as any;

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Unauthorized' }),
    } as Response);

    await expect(apiClient.get('/test')).rejects.toThrow();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(apiClient.get('/test')).rejects.toThrow('Network error');
  });
});

