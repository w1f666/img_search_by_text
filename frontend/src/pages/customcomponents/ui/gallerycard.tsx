import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { LazyImage } from "@/pages/customcomponents/ui/LazyImage";
import type { GalleryItem } from "@/types/media";

export function GalleryCard({
  id,
  name,
  createdAt,
  coverImageUrl,
  imageCount,
  actionSlot,
  busy = false,
}: GalleryItem & { actionSlot?: React.ReactNode; busy?: boolean }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!busy) {
      navigate(`/gallery/${id}`);
    }
  };

  return (
    <article
      aria-label={`打开图集 ${name}`}
      onClick={handleClick}
      className={`group rounded-[1.75rem] border border-border/60 bg-card/80 p-3 shadow-sm transition-transform duration-300 ease-out active:scale-[0.95] ${
        busy ? "cursor-progress" : "cursor-pointer hover:scale-[0.97]"
      }`}
    >
      <div className="flex items-end justify-between px-1 pb-2">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground">{createdAt}</p>
        </div>
        <span className="rounded-full border border-border/60 bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors">
          {imageCount} 张
        </span>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.35rem] bg-muted ring-1 ring-border/50 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-primary/5 group-hover:ring-primary/20">
        {coverImageUrl ? (
          // 图集封面和普通图片卡片共用同一套图片加载策略。
          <LazyImage
            src={coverImageUrl}
            alt={name}
            wrapperClassName="h-full w-full"
            className="h-full w-full object-cover transition-[filter] duration-300 group-hover:brightness-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-secondary/60 text-sm text-muted-foreground">
            暂无封面
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/28 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {busy ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <LoaderCircle className="size-5 animate-spin text-foreground" />
          </div>
        ) : null}
        {actionSlot ? (
          <div
            className={`absolute right-3 top-3 z-10 flex gap-2 transition-opacity duration-200 ${
              busy ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            {actionSlot}
          </div>
        ) : null}
      </div>
    </article>
  );
}