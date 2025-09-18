import { Button } from "@/components/ui/button";
import { Brain, Camera, MessageCircle, TrendingUp, UtensilsCrossed } from "lucide-react";

const Navigation = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
            NutriAI
          </span>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
            How it Works
          </a>
          <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">
            About
          </a>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
          <Button variant="hero" size="sm">
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;