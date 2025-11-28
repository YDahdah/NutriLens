import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

interface ProtectedFeatureProps {
  featureName: string;
  description: string;
  children: React.ReactNode;
}

const ProtectedFeature: React.FC<ProtectedFeatureProps> = ({ 
  featureName, 
  description, 
  children 
}) => {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="max-w-md mx-auto p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {featureName}
          </h2>
          <p className="text-gray-600">
            {description}
          </p>
        </div>
        
        <div className="space-y-4">
          <AuthModal />
          <p className="text-sm text-gray-500">
            Sign up or log in to access this feature
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProtectedFeature;
