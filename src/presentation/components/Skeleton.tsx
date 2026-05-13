import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-zinc-800 rounded-lg',
        className
      )}
    />
  );
}

export function MovieCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'wide' }) {
  return (
    <div className={cn(
      'flex-shrink-0',
      variant === 'wide' ? 'w-[280px] md:w-[320px]' : 'w-[160px] md:w-[200px]'
    )}>
      <Skeleton className={cn(
        'rounded-xl',
        variant === 'wide' ? 'aspect-video' : 'aspect-[2/3]'
      )} />
      <div className="mt-2.5 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SliderSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section className="py-6 md:py-8">
      <div className="px-4 sm:px-6 lg:px-8 mb-4">
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="flex gap-3 md:gap-4 overflow-hidden px-4 sm:px-6 lg:px-8">
        {Array.from({ length: count }).map((_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative w-full h-[85vh] md:h-[90vh] bg-zinc-950">
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-20 md:pb-28">
        <div className="max-w-2xl space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-16 w-[80%]" />
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <Skeleton className="h-20 w-full max-w-xl" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-12 w-36 rounded-xl" />
            <Skeleton className="h-12 w-36 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="relative h-[50vh] md:h-[60vh] bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-40 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <Skeleton className="w-[200px] h-[300px] rounded-xl shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-40 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayerSkeleton() {
  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="w-full aspect-video rounded-xl mb-6" />
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
