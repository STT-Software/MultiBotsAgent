"use client";

import { BrandIcon, Wordmark } from '@/components/icons';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 bg-gray-950 border-t border-gray-900 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Description */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandIcon size="sm" />
              <Wordmark size="sm" />
            </Link>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Plataforma empresarial de agentes conversacionales inteligentes. Automatiza la comunicación con tus clientes conectando tus datos corporativos de manera segura.
            </p>
          </div>

          {/* Column 2: Product */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Producto</h4>
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Características</a>
            <a href="#demo" className="text-sm text-gray-400 hover:text-white transition-colors">Demo Interactiva</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Planes de Precios</a>
          </div>

          {/* Column 3: Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Legal</h4>
            <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Términos de Servicio</span>
            <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Política de Privacidad</span>
            <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">Configuración de Cookies</span>
          </div>

        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {currentYear} MultiBotAgents. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            Diseñado en base a estándares Cloud-Native
          </p>
        </div>
      </div>
    </footer>
  );
}
