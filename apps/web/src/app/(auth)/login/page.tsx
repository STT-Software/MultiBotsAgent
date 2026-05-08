import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar sesión — MultiBotAgents',
  description:
    'Inicia sesión en tu cuenta de MultiBotAgents para gestionar tus agentes de IA.',
};

export default function LoginPage() {
  return <LoginForm />;
}
