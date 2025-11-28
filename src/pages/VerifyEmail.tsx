import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import { useToast } from '@/hooks/use-toast';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setIsError(true);
      setMessage('No verification token provided');
      setIsLoading(false);
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await apiClient.verifyEmail(token);
      
      if (response.success) {
        // Show success toast and redirect immediately without showing a page
        toast({
          title: 'Email Verified!',
          description: 'Your email has been successfully verified. You can now log in.',
        });
        // Redirect immediately to home page
        navigate('/');
        return;
      } else {
        setIsError(true);
        setMessage(response.message);
        toast({
          title: 'Verification Failed',
          description: response.message || 'Failed to verify email. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
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
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address to resend verification.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiClient.resendVerification(email);
      
      if (response.success) {
        toast({
          title: 'Verification Email Sent',
          description: 'Please check your inbox for the verification email.',
        });
      } else {
        toast({
          title: 'Failed to Send Email',
          description: response.message || 'Please try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend verification email. Please try again.',
        variant: 'destructive',
      });
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
              <XCircle className="h-6 w-6 text-red-600" />
            )}
          </div>
          <CardTitle>
            {isSuccess ? 'Email Verified!' : 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {isSuccess 
              ? 'Your email has been successfully verified. You can now log in to your account.'
              : 'There was a problem verifying your email address.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={isSuccess ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription className={isSuccess ? 'text-green-800' : 'text-red-800'}>
              {message}
            </AlertDescription>
          </Alert>

          {isSuccess ? (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Enter your email to resend verification:
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button 
                onClick={resendVerification}
                className="w-full"
                variant="outline"
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Verification Email
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="ghost"
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
