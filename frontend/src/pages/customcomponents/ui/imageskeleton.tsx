import { Skeleton } from "@/components/ui/skeleton";

export function ImageSkeleton() {
  return (
    <div className="rounded-[1.6rem] border border-border/60 bg-card/80 p-3">
      <Skeleton className="aspect-square w-full rounded-[1.2rem]" />
      <div className="px-1 pt-3 pb-1">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <div className="mt-1 flex items-center justify-between">
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </div>
      </div>
    </div>
  );
}