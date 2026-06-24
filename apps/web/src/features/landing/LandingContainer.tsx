"use client";

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturesGrid from './components/FeaturesGrid';
import InteractiveChatDemo from './components/InteractiveChatDemo';
import Integrations from './components/Integrations';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import BackgroundEffects from './components/BackgroundEffects';

export default function LandingContainer() {
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500 selection:text-gray-950 relative">
      <BackgroundEffects />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <InteractiveChatDemo />
        <FeaturesGrid />
        <Integrations />
        <Pricing />
        <Footer />
      </main>
    </div>
  );
}
