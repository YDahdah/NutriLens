import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Brain, TrendingUp } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      step: "01",
      icon: Camera,
      title: "Capture Your Meal",
      description: "Simply take a photo of your food or manually enter ingredients. Our AI instantly recognizes what you're eating.",
      color: "gradient-primary"
    },
    {
      step: "02", 
      icon: Brain,
      title: "AI Analysis",
      description: "Advanced computer vision analyzes ingredients, portion sizes, and nutritional content with remarkable accuracy.",
      color: "gradient-accent"
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
    <section id="how-it-works" className="py-20">
      <div className="container px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            How it Works
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Three Simple Steps to 
            <span className="gradient-primary bg-clip-text text-transparent"> Better Nutrition</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our streamlined process makes healthy eating effortless and intelligent
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent transform translate-x-8 -translate-y-1/2 z-0"></div>
              )}
              
              <Card className="relative z-10 p-8 text-center shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
                <div className="relative mb-6">
                  <div className={`w-16 h-16 ${step.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="absolute -top-2 -right-2 font-bold">
                    {step.step}
                  </Badge>
                </div>
                
                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </Card>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center justify-center p-8 gradient-hero rounded-2xl shadow-strong">
            <div className="text-center text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Nutrition?</h3>
              <p className="mb-6 opacity-90">Join thousands who've revolutionized their eating habits with AI</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-8 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors">
                  Start Free Trial
                </button>
                <button className="px-8 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;