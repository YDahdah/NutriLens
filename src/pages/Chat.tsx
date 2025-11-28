import React from 'react';
import AIChat from '@/components/AIChat';
import Footer from '@/components/Footer';
import ProtectedFeature from '@/components/ProtectedFeature';

const Chat = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">AI Nutritionist Chat</h1>
            <p className="text-sm sm:text-base text-muted-foreground px-4">
              Get personalized nutrition advice, meal suggestions, and dietary guidance from our AI assistant.
            </p>
          </div>
          <ProtectedFeature 
            featureName="AI Nutritionist Chat"
            description="Sign up to chat with our AI nutritionist and get personalized advice"
          >
            <div className="h-[calc(100vh-300px)] sm:h-[calc(100vh-250px)] min-h-[600px]">
              <AIChat />
            </div>
          </ProtectedFeature>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Chat;
