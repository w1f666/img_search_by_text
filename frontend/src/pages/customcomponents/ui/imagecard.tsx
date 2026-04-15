import { Button } from "@/components/ui/button";
import { LazyImage } from "@/pages/customcomponents/ui/LazyImage";
import { LoaderCircle, Maximize2 } from "lucide-react";
import type { ImageItem } from "@/types/media";

interface ImageCardProps {
  image: ImageItem;
  onClick?: () => void;
  actionMask?: React.ReactNode;
  busy?: boolean;
}

export function ImageCard({ image, onClick, actionMask, busy = false }: ImageCardProps) {
  const isInteractive = Boolean(onClick);

  const handleCardClick = () => {
    if (!busy && onClick) {
      onClick();
    }
  };

  return (
    <article
      aria-label={image.filename}
      className={`group rounded-[1.6rem] border border-border/60 bg-card/80 p-3 shadow-sm transition-transform duration-300 ease-out active:scale-[0.95] ${
        busy ? "cursor-progress" : isInteractive ? "cursor-pointer hover:scale-[0.97]" : "cursor-default"
      }`}
      onClick={handleCardClick}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[1.2rem] bg-muted ring-1 ring-border/50 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-primary/5 group-hover:ring-primary/20">
        {/* 列表图片统一走 LazyImage，这样卡片层不需要重复处理懒加载和骨架。 */}
        <LazyImage
          src={image.thumbnailUrl ?? image.url}
          alt={image.filename}
          wrapperClassName="h-full w-full"
          className="h-full w-full object-cover transition-[filter] duration-300 group-hover:brightness-105"
        />
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/28 to-transparent transition-opacity duration-300 ${isInteractive ? "opacity-0 group-hover:opacity-100" : "opacity-70"}`} />
        <div
          className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/40 transition-opacity duration-200 ${busy ? "opacity-100" : isInteractive || actionMask ? "opacity-0 group-hover:opacity-100" : "opacity-0"}`}
        >
          {actionMask ? (
            <div
              className="flex items-center justify-center gap-2"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {actionMask}
            </div>
          ) : (
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/40" aria-label="查看详情" onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {busy ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <LoaderCircle className="size-5 animate-spin text-foreground" />
          </div>
        ) : null}
      </div>
      <div className="px-1 pt-3 pb-1">
        <p className={`truncate text-sm font-medium text-foreground transition-colors ${isInteractive ? "group-hover:text-primary" : ""}`}>{image.filename}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{image.createdAt}</p>
        </div>
      </div>
    </article>
  );
}