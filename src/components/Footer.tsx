import { Brain } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t">
      <div className="container px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="text-lg sm:text-xl font-bold gradient-primary bg-clip-text text-transparent">
                NutriLens
              </span>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md">
              Revolutionizing nutrition tracking with AI-powered food analysis, 
              personalized recommendations, and intelligent meal planning.
            </p>
            <div className="text-xs sm:text-sm text-muted-foreground">
              © 2024 NutriLens. All rights reserved.
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Features</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Food Recognition</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">AI Nutritionist</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Nutrition Reports</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Progress Tracking</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Company</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;