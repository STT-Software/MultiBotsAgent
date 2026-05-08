import type { Metadata } from 'next';
import RegisterContainer from '@/features/register/RegisterContainer';

export const metadata: Metadata = {
  title: 'Crear cuenta — MultiBotAgents',
  description:
    'Regístrate y crea tu cuenta empresarial en MultiBotAgents para automatizar tus conversaciones con IA.',
};

export default function RegisterPage() {
  return <RegisterContainer />;
}
