import { Skeleton } from "@/components/ui/skeleton";

export default function GallerySkeletonCard() {
  return (
    <div className="animate-pulse">
      {/* 信息骨架 */}
      <div className="flex items-end justify-between px-1 pb-2">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-3 w-14 rounded-md" />
        </div>
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      {/* 封面骨架 */}
      <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
    </div>
  );
}
