"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandIcon, Wordmark } from '@/components/icons';
import { Menu, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const navItems = [
    { name: 'Demo Interactiva', href: '#demo' },
    { name: 'Características', href: '#features' },
    { name: 'Integraciones', href: '#integrations' },
    { name: 'Precios', href: '#pricing' },
  ];

  // Implementación de Scroll Spy para resaltar la sección actual
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-120px 0px -55% 0px', // Centrado para detectar la sección activa visualmente
      threshold: 0.05
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(`#${entry.target.id}`);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    const sectionIds = ['features', 'demo', 'integrations', 'pricing'];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    // Limpiar selección al subir del todo (Hero)
    const handleScrollAtTop = () => {
      if (window.scrollY < 150) {
        setActiveSection('');
      }
    };
    window.addEventListener('scroll', handleScrollAtTop);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScrollAtTop);
    };
  }, []);

  // Animación de scroll suave profesional restando el alto del Navbar sticky
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      const navbarHeight = 72; // Altura aproximada del navbar para compensar offset
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8">
      <nav className="mx-auto max-w-7xl rounded-2xl border border-white/[0.06] bg-gradient-to-b from-gray-950/65 to-gray-950/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] shadow-emerald-500/[0.015] relative overflow-hidden">
        {/* Bisel de luz superior (efecto cristal 3D) */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />
        
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5">
                <BrandIcon size="sm" />
                <Wordmark size="sm" />
              </Link>
            </div>

            {/* Desktop Nav Items */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleScroll(e, item.href)}
                  className={`text-sm font-medium transition-colors duration-200 relative group cursor-pointer py-1.5 ${
                    activeSection === item.href 
                      ? 'text-emerald-400 font-semibold' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item.name}
                  <span className={`absolute -bottom-0.5 left-0 h-[2px] bg-emerald-400 transition-all duration-300 rounded-full ${
                    activeSection === item.href ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </a>
              ))}
            </div>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/register"
                className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-white rounded-lg group bg-gradient-to-br from-emerald-500 to-teal-500 group-hover:from-emerald-500 group-hover:to-teal-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-emerald-800 transition-all duration-300 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <span className="relative px-4 py-2 transition-all ease-in duration-75 bg-gray-950 rounded-md group-hover:bg-opacity-0 flex items-center gap-1.5 font-semibold">
                  Probar Gratis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-white focus:outline-none cursor-pointer"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-900 bg-gray-950 px-4 pt-2 pb-4 space-y-2"
            >
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    setIsOpen(false);
                    handleScroll(e, item.href);
                  }}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors cursor-pointer ${
                    activeSection === item.href 
                      ? 'text-emerald-400 bg-emerald-950/20 font-semibold' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-900'
                  }`}
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-4 border-t border-gray-900 flex flex-col gap-3 px-3">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="text-center py-2 text-base font-medium text-gray-300 hover:text-white"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="text-center py-2.5 rounded-lg text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                >
                  Probar Gratis <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}
