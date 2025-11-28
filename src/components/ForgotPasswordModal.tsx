import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, CheckCircle, Loader2, Lock } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import { useToast } from '@/hooks/use-toast';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

const ForgotPasswordModal = ({ isOpen, onClose, onBackToLogin }: ForgotPasswordModalProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [timeLeft, setTimeLeft] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 'email') {
      if (!email) {
        toast({
          title: 'Email Required',
          description: 'Please enter your email address.',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);

      try {
        const response = await apiClient.forgotPassword(email);
        
        if (response.success) {
          setStep('code');
          setTimeLeft(response.data?.expiresIn || 60);
        } else {
          toast({
            title: 'Error',
            description: response.message || 'Failed to send verification code. Please try again.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to send verification code. Please try again.',
          variant: 'destructive',
        });
        console.error('Forgot password error:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Code verification step
      if (!verificationCode) {
        toast({
          title: 'Code Required',
          description: 'Please enter the verification code.',
          variant: 'destructive',
        });
        return;
      }

      if (verificationCode.length !== 6) {
        toast({
          title: 'Invalid Code',
          description: 'Please enter a 6-digit verification code.',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);

      try {
        const response = await apiClient.verifyCode(email, verificationCode);
        
        if (response.success) {
          setIsSuccess(true);
        } else {
          toast({
            title: 'Invalid Code',
            description: response.message || 'The verification code is invalid or expired.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to verify code. Please try again.',
          variant: 'destructive',
        });
        console.error('Verify code error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClose = () => {
    setEmail('');
    setVerificationCode('');
    setIsSuccess(false);
    setStep('email');
    setTimeLeft(0);
    onClose();
  };

  const handleBackToLogin = () => {
    setEmail('');
    setVerificationCode('');
    setIsSuccess(false);
    setStep('email');
    setTimeLeft(0);
    onBackToLogin();
  };

  const handleBackToEmail = () => {
    setVerificationCode('');
    setStep('email');
    setTimeLeft(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              {isSuccess ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : step === 'code' ? (
                <Lock className="h-4 w-4 text-primary" />
              ) : (
                <Mail className="h-4 w-4 text-primary" />
              )}
            </div>
            {isSuccess ? 'Code Verified!' : step === 'code' ? 'Enter Verification Code' : 'Forgot Password?'}
          </DialogTitle>
          <DialogDescription>
            {isSuccess 
              ? 'Your verification code has been verified. You can now reset your password.'
              : step === 'code' 
                ? `We've sent a 6-digit verification code to ${email}. Enter it below.`
                : 'Enter your email address and we\'ll send you a verification code to reset your password.'
            }
          </DialogDescription>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                Your verification code has been verified! You can now proceed to reset your password.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  // Navigate to reset password page with email and code
                  window.location.href = `/reset-password?email=${encodeURIComponent(email)}&code=${verificationCode}`;
                }}
                className="w-full"
              >
                Reset Password
              </Button>
              <Button 
                onClick={handleBackToLogin}
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'email' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    className="text-center text-2xl tracking-widest"
                  />
                  {timeLeft > 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Code expires in {timeLeft} seconds
                    </p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>
                
                <Button 
                  type="button"
                  onClick={handleBackToEmail} 
                  variant="ghost"
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Email
                </Button>
              </>
            )}
            
            <Button 
              type="button"
              onClick={handleBackToLogin} 
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;
