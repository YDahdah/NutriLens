import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';
import GoogleSignInButton from './GoogleSignInButton';
import ErrorBoundary from './ErrorBoundary';
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
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { login, signup, isDatabaseAvailable } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isGoogleOAuthEnabled = Boolean(googleClientId);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setShowPassword(false);
      setShowVerificationMessage(false);
      setVerificationCode('');
      setIsVerifying(false);
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
            // Navigate to about page (home)
            navigate('/');
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
        const result = await signup(name, email, password);
        
        if (result.success) {
          setShowVerificationMessage(true);
          // If verification code is provided (email failed), pre-fill it
          if (result.verificationCode) {
            setVerificationCode(result.verificationCode);
            toast({
              title: 'Registration Successful!',
              description: result.emailSent 
                ? 'Please check your email for the verification code.'
                : 'Email could not be sent. Your verification code is shown below.',
              variant: result.emailSent ? 'default' : 'destructive',
            });
          } else {
            toast({
              title: 'Registration Successful!',
              description: 'Please check your email for the verification code.',
            });
          }
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
              ? `We've sent a verification code to ${email}`
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

        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <GoogleSignInButton
            mode={mode}
            onSuccess={() => {
              onClose();
              setEmail('');
              setPassword('');
              // Navigate to about page (home)
              navigate('/');
            }}
            disabled={isLoading}
          />
        </>

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
                className="text-primary hover:underline cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onModeChange) {
                    onModeChange('signup');
                  }
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="text-primary hover:underline cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onModeChange) {
                    onModeChange('login');
                  }
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
          </>
        ) : (
          <div className="space-y-4">
            {verificationCode ? (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Mail className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <p className="font-semibold mb-2">Email could not be sent</p>
                  <p className="text-sm mb-3">
                    Your verification code is shown below. Please enter it to verify your account.
                  </p>
                  <div className="bg-white border-2 border-yellow-300 rounded-lg p-3 text-center my-2">
                    <p className="text-xs text-yellow-700 mb-1">Your Verification Code:</p>
                    <p className="text-2xl font-mono font-bold text-yellow-900 tracking-widest">
                      {verificationCode}
                    </p>
                  </div>
                  <p className="text-sm text-yellow-700">
                    The code has been pre-filled below. You can also copy it manually.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <p className="font-semibold mb-2">Verification code sent!</p>
                  <p className="text-sm mb-3">
                    We've sent a 6-digit verification code to your email address. Enter it below to verify your account.
                  </p>
                  <p className="text-sm text-green-700">
                    Didn't receive the code? Check your spam folder or click "Resend Code" below.
                  </p>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                    if (value.length <= 6) {
                      setVerificationCode(value);
                    }
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>
              
              <Button
                type="button"
                className="w-full"
                onClick={async () => {
                  if (!verificationCode || verificationCode.length !== 6) {
                    toast({
                      title: 'Invalid Code',
                      description: 'Please enter a valid 6-digit verification code.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  
                  setIsVerifying(true);
                  try {
                    const { apiClient } = await import('@/utils/apiClient');
                    const response = await apiClient.verifyEmailCode(email, verificationCode);
                    if (response.success) {
                      toast({
                        title: 'Email Verified!',
                        description: 'Your email has been verified. You can now log in.',
                      });
                      onClose();
                      setShowVerificationMessage(false);
                      setVerificationCode('');
                      // Navigate to about page (home)
                      navigate('/');
                      // Switch to login mode
                      onModeChange?.('login');
                    } else {
                      toast({
                        title: 'Verification Failed',
                        description: response.message || 'Invalid verification code. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  } catch (error: any) {
                    toast({
                      title: 'Verification Error',
                      description: error?.message || 'Failed to verify email. Please try again.',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsVerifying(false);
                  }
                }}
                disabled={isVerifying || verificationCode.length !== 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
              
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
                          title: 'Code sent!',
                          description: 'A new verification code has been sent to your inbox.',
                        });
                        setVerificationCode('');
                      }
                    } catch (error) {
                      toast({
                        title: 'Failed to resend code',
                        description: 'Please try again later.',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setShowVerificationMessage(false);
                    setVerificationCode('');
                  }}
                >
                  Change Email
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onBackToLogin={() => {
          setIsForgotPasswordOpen(false);
        }}
      />
    </Dialog>
  );
};

export default AuthModal;
