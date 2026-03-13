import { Skeleton } from "@/components/ui/skeleton";

export function ImageSkeleton() {
  return (
    <div className="group cursor-pointer">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50">
        <Skeleton className="h-full w-full object-cover" />
      </div>
      <div className="px-1 py-2">
        <Skeleton className="h-4 w-3/4 mb-1" />
        <div className="mt-1 flex items-center justify-between">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  );
}