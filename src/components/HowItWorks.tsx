import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, MessageCircle, TrendingUp } from "lucide-react";

const HowItWorks = () => {

  const steps = [
    {
      step: "01",
      icon: Camera,
      title: "Capture Your Meal",
      description: "Simply take a photo of your food or manually enter ingredients. Our AI instantly recognizes what you're eating.",
      color: "bg-primary"
    },
    {
      step: "02", 
      icon: MessageCircle,
      title: "AI Chatbot",
      description: "Chat with our intelligent nutrition assistant for personalized meal advice, recipe suggestions, and dietary guidance.",
      color: "bg-accent"
    },
    {
      step: "03",
      icon: TrendingUp,
      title: "Track & Optimize",
      description: "Get detailed nutritional breakdown, calorie counts, and personalized recommendations for your goals.",
      color: "bg-tech"
    }
  ];

  return (
    <section id="how-it-works" className="py-12 sm:py-16 lg:py-20">
      <div className="container px-4">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <Badge variant="outline" className="mb-3 sm:mb-4 text-xs sm:text-sm">
            How it Works
          </Badge>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3 sm:mb-4 px-4">
            Three Simple Steps to 
            <span className="gradient-primary bg-clip-text text-transparent"> Better Nutrition</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Our streamlined process makes healthy eating effortless and intelligent
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {steps.map((step, index) => (
            <div key={index} className="relative flex">
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent transform translate-x-8 -translate-y-1/2 z-0"></div>
              )}
              
              <Card className="relative z-10 p-6 sm:p-8 text-center shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                <div className="relative mb-4 sm:mb-6">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 ${step.color} rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4`}>
                    <step.icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="absolute -top-2 -right-2 font-bold text-xs sm:text-sm">
                    {step.step}
                  </Badge>
                </div>
                
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">{step.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground flex-grow">{step.description}</p>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;