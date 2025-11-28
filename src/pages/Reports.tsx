import React from 'react';
import Reports from '@/components/Reports';
import Footer from '@/components/Footer';

const ReportsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Reports />
      </main>
      <Footer />
    </div>
  );
};

export default ReportsPage;

