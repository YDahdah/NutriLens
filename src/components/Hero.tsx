import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Camera, MessageCircle, TrendingUp, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthModal from "./AuthModal";
import PhotoAnalyzer from "./PhotoAnalyzer";
import heroImage from "@/assets/hero-nutrition.jpg";

const Hero = () => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isPhotoAnalyzerOpen, setIsPhotoAnalyzerOpen] = useState(false);

  const handleAnalyzeClick = () => {
    if (!isAuthenticated) {
      setIsSignupModalOpen(true);
      return;
    }
    setIsPhotoAnalyzerOpen(true);
  };

  const handleChatClick = () => {
    if (!isAuthenticated) {
      setIsSignupModalOpen(true);
      return;
    }
    navigate('/chat');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-primary opacity-10"></div>
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-5"
        style={{ backgroundImage: `url(${heroImage})` }}
      ></div>
      
      {/* Content */}
      <div className="container relative z-10 px-4 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          
          <h1 className="mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight">
            <span className="text-foreground">Smart Nutrition</span>
            <span className="gradient-primary bg-clip-text text-transparent"> 
              {" "}Made Simple
            </span>
          </h1>
          
          <p className="mb-6 sm:mb-8 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Transform your diet with AI-powered food analysis, personalized tracking, and intelligent meal planning. 
            Just snap a photo and let our AI do the rest.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
            <Button 
              variant="hero" 
              size="lg" 
              className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
              onClick={handleAnalyzeClick}
            >
              {!isAuthenticated ? (
                <Lock className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Camera className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              )}
              <span className="whitespace-nowrap">Analyze Your Meal</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
              onClick={handleChatClick}
            >
              {!isAuthenticated ? (
                <Lock className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <MessageCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              )}
              <span className="whitespace-nowrap">Chat with AI Nutritionist</span>
            </Button>
          </div>
          
          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 px-4">
            <Card className="p-4 sm:p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Smart Image Analysis</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                AI identifies ingredients and estimates calories from photos instantly
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">AI Nutrition Coach</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Get personalized advice and meal suggestions from our AI assistant
              </p>
            </Card>
            
            <Card className="p-4 sm:p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-tech rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Smart Tracking</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Automatic calorie tracking aligned with your fitness goals
              </p>
            </Card>
          </div>
        </div>
      </div>
      
      <AuthModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        mode="signup"
        onModeChange={() => {}}
      />
      
      <PhotoAnalyzer
        isOpen={isPhotoAnalyzerOpen}
        onClose={() => setIsPhotoAnalyzerOpen(false)}
      />
    </section>
  );
};

export default Hero;