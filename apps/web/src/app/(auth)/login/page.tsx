import { Suspense } from 'react';
import LoginContainer from '@/features/login/LoginContainer';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContainer />
    </Suspense>
  );
}
