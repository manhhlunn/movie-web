import { Suspense } from 'react';
import { Skeleton } from '@/presentation/components/Skeleton';
import SearchResults from './SearchResults';


export default function SearchPage() {
  return (
    <div className="container py-24 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 font-outfit">Kết Quả Tìm Kiếm</h1>
      <Suspense fallback={<div className="text-center py-10"><Skeleton className="w-full h-96" /></div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
