import React from 'react';
import CalorieTracker from '../components/CalorieTracker';

const Tracker = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <CalorieTracker />
      </div>
    </div>
  );
};

export default Tracker;
