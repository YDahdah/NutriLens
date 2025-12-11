import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import { useToast } from '@/hooks/use-toast';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check if there's a token in URL (legacy support)
    const token = searchParams.get('token');
    if (token) {
      setIsLoading(true);
      verifyEmailToken(token);
    } else {
      // Check if email is in URL params
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, [searchParams]);

  const verifyEmailToken = async (token: string) => {
    try {
      const response = await apiClient.verifyEmail(token);
      
      if (response.success) {
        setIsSuccess(true);
        setMessage('Your email has been successfully verified. You can now log in.');
        toast({
          title: 'Email Verified!',
          description: 'Your email has been successfully verified. You can now log in.',
        });
        setTimeout(() => navigate('/'), 2000);
      } else {
        setIsError(true);
        setMessage(response.message || 'Failed to verify email. Please try again.');
        toast({
          title: 'Verification Failed',
          description: response.message || 'Failed to verify email. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setIsError(true);
      setMessage('Failed to verify email. Please try again.');
      toast({
        title: 'Verification Error',
        description: 'Failed to verify email. Please try again.',
        variant: 'destructive',
      });
      console.error('Email verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!email || !code) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both your email and verification code.',
        variant: 'destructive',
      });
      return;
    }

    if (code.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Verification code must be 6 digits.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    setIsError(false);
    setMessage('');

    try {
      const response = await apiClient.verifyEmailCode(email, code);
      
      if (response.success) {
        setIsSuccess(true);
        setMessage('Your email has been successfully verified. You can now log in.');
        toast({
          title: 'Email Verified!',
          description: 'Your email has been successfully verified. You can now log in.',
        });
        setTimeout(() => navigate('/'), 2000);
      } else {
        setIsError(true);
        setMessage(response.message || 'Invalid verification code. Please try again.');
        toast({
          title: 'Verification Failed',
          description: response.message || 'Invalid verification code. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setIsError(true);
      const errorMessage = error?.message || 'Failed to verify email. Please try again.';
      setMessage(errorMessage);
      toast({
        title: 'Verification Error',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Email verification error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const resendVerification = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address to resend verification code.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiClient.resendVerification(email);
      
      if (response.success) {
        toast({
          title: 'Verification Code Sent',
          description: 'Please check your inbox for the verification code.',
        });
        setCode(''); // Clear the code input
      } else {
        toast({
          title: 'Failed to Send Code',
          description: response.message || 'Please try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend verification code. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setCode(value);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying your email...</p>
              <p className="text-sm text-muted-foreground">You will be redirected shortly...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {isSuccess ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <Mail className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle>
            {isSuccess ? 'Email Verified!' : 'Verify Your Email'}
          </CardTitle>
          <CardDescription>
            {isSuccess 
              ? 'Your email has been successfully verified. You can now log in to your account.'
              : 'Enter the verification code sent to your email address.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuccess ? (
            <>
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Go to Login
              </Button>
            </>
          ) : (
            <>
              {isError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {message}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl font-mono tracking-widest"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>
                
                <Button 
                  onClick={verifyEmailCode}
                  className="w-full"
                  disabled={isVerifying || !email || code.length !== 6}
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
                
                <div className="text-center text-sm text-muted-foreground">
                  <p className="mb-2">Didn't receive the code?</p>
                  <Button 
                    onClick={resendVerification}
                    variant="outline"
                    size="sm"
                    disabled={!email}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Resend Code
                  </Button>
                </div>
                
                <Button 
                  onClick={() => navigate('/')} 
                  variant="ghost"
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
