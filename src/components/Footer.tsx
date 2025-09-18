import { Brain } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t">
      <div className="container px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
                NutriAI
              </span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              Revolutionizing nutrition tracking with AI-powered food analysis, 
              personalized recommendations, and intelligent meal planning.
            </p>
            <div className="text-sm text-muted-foreground">
              © 2024 NutriAI. All rights reserved.
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="font-semibold mb-4">Features</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Food Recognition</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">AI Nutritionist</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Recipe Generator</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Progress Tracking</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
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