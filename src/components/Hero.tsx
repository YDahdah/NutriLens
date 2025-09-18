import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Camera, MessageCircle, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-nutrition.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-hero opacity-10"></div>
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-5"
        style={{ backgroundImage: `url(${heroImage})` }}
      ></div>
      
      {/* Content */}
      <div className="container relative z-10 px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center rounded-full border px-4 py-2 text-sm shadow-soft">
            <Brain className="mr-2 h-4 w-4 text-primary" />
            Powered by Advanced AI Technology
          </div>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Smart Nutrition 
            <span className="gradient-primary bg-clip-text text-transparent"> 
              {" "}Made Simple
            </span>
          </h1>
          
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
            Transform your diet with AI-powered food analysis, personalized tracking, and intelligent meal planning. 
            Just snap a photo and let our AI do the rest.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="hero" size="lg" className="text-lg px-8 py-6">
              <Camera className="mr-2 h-5 w-5" />
              Analyze Your Meal
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              <MessageCircle className="mr-2 h-5 w-5" />
              Chat with AI Nutritionist
            </Button>
          </div>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Image Analysis</h3>
              <p className="text-muted-foreground text-sm">
                AI identifies ingredients and estimates calories from photos instantly
              </p>
            </Card>
            
            <Card className="p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Nutrition Coach</h3>
              <p className="text-muted-foreground text-sm">
                Get personalized advice and meal suggestions from our AI assistant
              </p>
            </Card>
            
            <Card className="p-6 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-tech rounded-lg flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Tracking</h3>
              <p className="text-muted-foreground text-sm">
                Automatic calorie tracking aligned with your fitness goals
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;