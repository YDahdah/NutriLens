import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import DatabaseSetupGuide from "@/components/DatabaseSetupGuide";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { isDatabaseAvailable } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Handle hash navigation when component mounts
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Handle email verification query parameters
    const verified = searchParams.get('verified');
    const verifiedError = searchParams.get('verified_error');

    if (verified === '1') {
      toast({
        title: 'Email Verified!',
        description: 'Your email has been successfully verified. You can now log in.',
      });
      // Remove query parameter from URL
      searchParams.delete('verified');
      setSearchParams(searchParams, { replace: true });
    } else if (verifiedError) {
      let errorMessage = 'Verification failed. Please try again.';
      switch (verifiedError) {
        case 'expired':
          errorMessage = 'Verification link has expired. Please register again.';
          break;
        case 'invalid_token':
          errorMessage = 'Invalid verification link. Please try again.';
          break;
        case 'user_not_found':
          errorMessage = 'User not found. Please register again.';
          break;
        case 'no_token':
          errorMessage = 'No verification token provided.';
          break;
        default:
          errorMessage = 'Verification failed. Please try again.';
      }
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      // Remove query parameter from URL
      searchParams.delete('verified_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      {!isDatabaseAvailable && (
        <div className="container mx-auto px-4 py-8">
          <DatabaseSetupGuide />
        </div>
      )}
      <Features />
      <HowItWorks />
      <Footer />
    </div>
  );
};

export default Index;
