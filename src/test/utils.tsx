import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
};

export const mockApiResponse = (data: any, ok = true) => {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
  } as Response);
};

