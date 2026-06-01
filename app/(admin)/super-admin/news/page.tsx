import { Suspense } from 'react';
import AdminNewsClient from './AdminNewsClient';

export const metadata = {
  title: 'News Management | Admin',
  description: 'Manage news articles',
};

export default function AdminNewsPage() {
  return (
    <Suspense fallback={<AdminNewsSkeleton />}>
      <AdminNewsClient />
    </Suspense>
  );
}

function AdminNewsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      <div className="h-12 bg-white/[0.02] rounded w-64 mb-8 animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
            <div className="h-6 bg-white/[0.02] rounded w-3/4 mb-4 animate-pulse" />
            <div className="h-4 bg-white/[0.02] rounded w-1/2 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
