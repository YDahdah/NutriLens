import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  MessageCircle, 
  UtensilsCrossed, 
  TrendingUp,
  Brain,
  Zap,
  Target,
  Clock
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Camera,
      title: "AI Food Recognition",
      description: "Upload photos of your meals and get instant ingredient analysis with precise calorie estimation.",
      color: "gradient-primary"
    },
    {
      icon: MessageCircle,
      title: "Smart Nutrition Assistant",
      description: "Chat with our AI nutritionist for personalized advice, meal suggestions, and dietary guidance.",
      color: "gradient-accent"
    },
    {
      icon: UtensilsCrossed,
      title: "Recipe Generator",
      description: "Input your available ingredients and discover delicious, healthy recipes you can make right now.",
      color: "bg-tech"
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Monitor your daily intake and track progress toward your fitness goals with intelligent insights.",
      color: "gradient-secondary"
    }
  ];

  const benefits = [
    {
      icon: Brain,
      title: "AI-Powered Accuracy",
      description: "Advanced machine learning ensures precise nutritional analysis"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get instant results with our optimized AI processing"
    },
    {
      icon: Target,
      title: "Goal-Oriented",
      description: "Tailored recommendations for bulking, maintenance, or weight loss"
    },
    {
      icon: Clock,
      title: "Time-Saving",
      description: "Eliminate manual food logging with automated tracking"
    }
  ];

  return (
    <section id="features" className="py-20 bg-cream/30">
      <div className="container px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Powerful Features for 
            <span className="gradient-primary bg-clip-text text-transparent"> Smarter Nutrition</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to transform your relationship with food and achieve your health goals
          </p>
        </div>

        {/* Main Features */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className={`w-16 h-16 ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                <feature.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground mb-6">{feature.description}</p>
              <Button variant="outline" className="w-full">
                Learn More
              </Button>
            </Card>
          ))}
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4 mx-auto">
                <benefit.icon className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold mb-2">{benefit.title}</h4>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;