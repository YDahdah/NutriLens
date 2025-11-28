import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, CheckCircle2 } from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onModeChange?: (mode: 'login' | 'signup') => void;
}

const AuthModal = ({ isOpen, onClose, mode, onModeChange }: AuthModalProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const { login, signup, isDatabaseAvailable } = useAuth();
  const { toast } = useToast();

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setShowPassword(false);
      setShowVerificationMessage(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        try {
          const result = await login(email, password);
          
          if (result.success) {
            toast({
              title: 'Welcome back!',
              description: 'You have successfully logged in.',
            });
            onClose();
            setEmail('');
            setPassword('');
            setShowPassword(false);
          } else {
            if (!isDatabaseAvailable) {
              toast({
                title: 'Database Unavailable',
                description: 'Authentication service is temporarily unavailable. Please set up MySQL database to use authentication features.',
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'Login failed',
                description: result.message || 'Please check your credentials and try again.',
                variant: 'destructive',
              });
            }
          }
        } catch (error) {
          toast({
            title: 'Login failed',
            description: error instanceof Error ? error.message : 'Please check your credentials and try again.',
            variant: 'destructive',
          });
        }
      } else {
        // Signup mode
        const result = await signup(name, email, password);
        
        if (result.success) {
          // Show verification message
          setShowVerificationMessage(true);
          toast({
            title: 'Registration Successful!',
            description: 'Please check your email to verify your account before logging in.',
          });
          // Don't close the modal - let user see the verification message
        } else {
          if (!isDatabaseAvailable) {
            toast({
              title: 'Database Unavailable',
              description: 'Authentication service is temporarily unavailable. Please set up MySQL database to use authentication features.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Registration failed',
              description: result.message || 'Please check your information and try again.',
              variant: 'destructive',
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {showVerificationMessage ? 'Check Your Email!' : (mode === 'login' ? 'Sign In to NutriLens' : 'Create Your Account')}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {showVerificationMessage 
              ? `We've sent a verification link to ${email}`
              : (mode === 'login' 
                ? 'Enter your credentials to access your nutrition tracking dashboard.'
                : 'Create a new account to start tracking your nutrition with AI-powered insights.'
              )
            }
          </DialogDescription>
        </DialogHeader>
        
        {!showVerificationMessage ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </Button>
        </form>

        {mode === 'login' && (
          <div className="text-center">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setIsForgotPasswordOpen(true)}
            >
              Forgot your password?
            </button>
          </div>
        )}
        
        <div className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => onModeChange?.('signup')}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => onModeChange?.('login')}
              >
                Sign in
              </button>
            </>
          )}
        </div>
          </>
        ) : (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <p className="font-semibold mb-2">Verification email sent!</p>
                <p className="text-sm mb-3">
                  We've sent a verification link to your email address. Please click the link in the email to verify your account before logging in.
                </p>
                <p className="text-sm text-green-700">
                  Didn't receive the email? Check your spam folder or click "Resend Email" below.
                </p>
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 w-full sm:w-auto"
                onClick={async () => {
                  try {
                    const { apiClient } = await import('@/utils/apiClient');
                    const response = await apiClient.resendVerification(email);
                    if (response.success) {
                      toast({
                        title: 'Email sent!',
                        description: 'A new verification email has been sent to your inbox.',
                      });
                    }
                  } catch (error) {
                    toast({
                      title: 'Failed to resend email',
                      description: 'Please try again later.',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Email
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onBackToLogin={() => {
          setIsForgotPasswordOpen(false);
          // Keep the login modal open
        }}
      />
    </Dialog>
  );
};

export default AuthModal;
