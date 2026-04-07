import { Skeleton } from "@/components/ui/skeleton";

export function GallerySkeletonCard() {
  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-card/80 p-3">
      <div className="flex items-end justify-between px-1 pb-2">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="aspect-[4/3] w-full rounded-[1.35rem]" />
    </div>
  );
}