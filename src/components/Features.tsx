import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { 
  Camera, 
  MessageCircle, 
  UtensilsCrossed, 
  TrendingUp,
  Brain,
  Zap,
  Target,
  Clock,
  X,
  CheckCircle,
  Star,
  Users,
  BarChart3
} from "lucide-react";

const Features = () => {

  const features = [
    {
      icon: Camera,
      title: "AI Food Recognition",
      description: "Upload photos of your meals and get instant ingredient analysis with precise calorie estimation.",
      color: "bg-primary",
      details: {
        overview: "Revolutionary AI technology that instantly recognizes food items from photos and provides detailed nutritional analysis.",
        keyFeatures: [
          "Instant food identification from photos",
          "Precise calorie and macro counting",
          "Ingredient breakdown and analysis",
          "Portion size estimation",
          "Recipe suggestions and meal ideas",
          "Nutritional density scoring"
        ],
        benefits: [
          "Save hours of manual food logging",
          "Get accurate nutrition data instantly",
          "Learn about hidden ingredients",
          "Make informed food choices",
          "Track macros with precision"
        ],
        stats: {
          accuracy: "95%",
          speed: "< 3 seconds",
          foods: "1,000+",
          diets: "20+"
        }
      }
    },
    {
      icon: MessageCircle,
      title: "Smart Nutrition Assistant",
      description: "Chat with our AI nutritionist for personalized advice, meal suggestions, and dietary guidance.",
      color: "bg-accent",
      details: {
        overview: "Your personal AI nutritionist available 24/7 to answer questions, provide meal suggestions, and guide your dietary decisions.",
        keyFeatures: [
          "24/7 AI nutritionist chat",
          "Personalized meal recommendations",
          "Dietary goal tracking",
          "Cooking tips and techniques",
          "Nutrition education",
          "Health condition support"
        ],
        benefits: [
          "Get instant expert advice",
          "Receive personalized recommendations",
          "Learn about nutrition science",
          "Stay motivated on your journey",
          "Access professional guidance anytime"
        ],
        stats: {
          responseTime: "< 2 seconds",
          languages: "English",
          topics: "500+",
          satisfaction: "98%"
        }
      }
    },
    {
      icon: BarChart3,
      title: "Calorie Tracker",
      description: "Track your daily nutrition intake with precision and monitor your progress toward health goals.",
      color: "bg-tech",
      details: {
        overview: "Comprehensive calorie and nutrition tracking system that helps you monitor your daily intake and achieve your health goals with detailed analytics.",
        keyFeatures: [
          "Real-time calorie counting",
          "Macro nutrient tracking (protein, carbs, fat)",
          "Food database with 1,000+ items",
          "Meal planning and logging",
          "Goal setting and progress monitoring",
          "Nutritional insights and recommendations"
        ],
        benefits: [
          "Achieve your health goals faster",
          "Make informed food choices",
          "Track progress with detailed analytics",
          "Stay accountable with daily logging",
          "Get personalized recommendations"
        ],
        stats: {
          foods: "1,000+",
          accuracy: "99%",
          goals: "Unlimited",
          recipes: "2,500+"
        }
      }
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Monitor your daily intake and track progress toward your fitness goals with intelligent insights.",
      color: "bg-secondary",
      details: {
        overview: "Comprehensive tracking system that monitors your nutrition, fitness, and health progress with intelligent insights and recommendations.",
        keyFeatures: [
          "Daily nutrition tracking",
          "Goal progress monitoring",
          "Trend analysis and insights",
          "Habit formation tracking",
          "Achievement milestones",
          "Data export and reporting"
        ],
        benefits: [
          "Visualize your progress",
          "Stay motivated with achievements",
          "Identify patterns and trends",
          "Make data-driven decisions",
          "Celebrate your successes"
        ],
        stats: {
          metrics: "50+",
          history: "Unlimited",
          insights: "Daily",
          accuracy: "99%"
        }
      }
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
    <section id="features" className="py-12 sm:py-16 lg:py-20 bg-cream/30">
      <div className="container px-4">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3 sm:mb-4 px-4">
            Powerful Features for 
            <span className="gradient-primary bg-clip-text text-transparent"> Smarter Nutrition</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Everything you need to transform your relationship with food and achieve your health goals
          </p>
        </div>

        {/* Main Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 lg:mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="p-4 sm:p-6 lg:p-8 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 ${feature.color} rounded-xl flex items-center justify-center mb-4 sm:mb-6`}>
                <feature.icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{feature.title}</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">{feature.description}</p>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-sm sm:text-base"
                  >
                    Learn More
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 text-xl sm:text-2xl">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${feature.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <span>{feature.title}</span>
                    </DialogTitle>
                    <DialogDescription className="text-sm sm:text-base mt-2">
                      {feature.details.overview}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 sm:space-y-6">
                    {/* Key Features */}
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-primary">Key Features</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {feature.details.keyFeatures.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-muted-foreground">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Benefits */}
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-primary">Benefits</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {feature.details.benefits.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-muted-foreground">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-primary">Performance Stats</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                        {Object.entries(feature.details.stats).map(([key, value], idx) => (
                          <div key={idx} className="text-center p-3 sm:p-4 bg-muted/50 rounded-lg">
                            <div className="text-xl sm:text-2xl font-bold text-primary mb-1">{value}</div>
                            <div className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>
          ))}
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center px-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                <benefit.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h4 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2">{benefit.title}</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;