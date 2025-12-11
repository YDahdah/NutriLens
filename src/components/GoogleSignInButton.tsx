import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  disabled?: boolean;
  mode?: 'login' | 'signup';
}

const GoogleSignInButtonInner: React.FC<GoogleSignInButtonProps> = ({ onSuccess, disabled, mode = 'login' }) => {
  const { googleSignIn } = useAuth();
  const { toast } = useToast();

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const result = await googleSignIn(tokenResponse.access_token, mode);
        
        if (result.success) {
          toast({
            title: mode === 'signup' ? 'Account created!' : 'Welcome back!',
            description: mode === 'signup' 
              ? 'Your account has been created successfully with Google.' 
              : 'You have successfully signed in with Google.',
          });
          onSuccess?.();
        } else {
          const errorMessage = result.message || 'Please try again.';
          const isAccountExists = result.account_exists;
          
          toast({
            title: isAccountExists ? 'Account already exists' : 'Google sign-in failed',
            description: errorMessage,
            variant: 'destructive',
          });
          
          // If account exists during signup, don't call onSuccess
          if (!isAccountExists) {
            onSuccess?.();
          }
        }
      } catch (error) {
        toast({
          title: 'Google sign-in failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: () => {
      toast({
        title: 'Google sign-in cancelled',
        description: 'Sign-in was cancelled or failed.',
        variant: 'destructive',
      });
    },
    ux_mode: 'redirect',
    select_account: true,
  });

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        try {
          handleGoogleSignIn();
        } catch (error) {
          toast({
            title: 'Google sign-in unavailable',
            description: 'Google OAuth is not properly configured.',
            variant: 'destructive',
          });
        }
      }}
      disabled={disabled}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
    </Button>
  );
};

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = (props) => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const { toast } = useToast();

  if (!googleClientId) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          toast({
            title: 'Google sign-in unavailable',
            description: 'Google OAuth is not configured. See GOOGLE_OAUTH_SETUP.md for setup instructions.',
            variant: 'destructive',
          });
        }}
        disabled={props.disabled}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {props.mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
      </Button>
    );
  }

  return <GoogleSignInButtonInner {...props} />;
};

export default GoogleSignInButton;

