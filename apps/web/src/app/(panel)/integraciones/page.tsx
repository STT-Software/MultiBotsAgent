import { Suspense } from 'react';
import { IntegrationsContainer } from '@/features/integrations';

function IntegrationsFallback() {
  return (
    <div className="flex w-full items-center justify-center p-12">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<IntegrationsFallback />}>
      <IntegrationsContainer />
    </Suspense>
  );
}
