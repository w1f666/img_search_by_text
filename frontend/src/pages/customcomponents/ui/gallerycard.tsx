import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import type { GalleryItem } from "@/store/useGalleryStore";

export function GalleryCard({
  Galleryname,
  CreatedTime,
  imageUrl,
  count,
  actionSlot,
  busy = false,
}: GalleryItem & { actionSlot?: React.ReactNode; busy?: boolean }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => {
        if (!busy) {
          navigate(`/gallery/${Galleryname}`);
        }
      }}
      className={`group transition-transform duration-300 ease-out active:scale-[0.95] ${
        busy ? "cursor-progress" : "cursor-pointer hover:scale-[0.97]"
      }`}
    >
      {/* 信息区域 */}
      <div className="flex items-end justify-between px-1 pb-2">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {Galleryname}
          </h3>
          <p className="text-xs text-muted-foreground">{CreatedTime}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors">
          {count} 张
        </span>
      </div>

      {/* 封面区域 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-primary/5 group-hover:ring-primary/20">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={Galleryname}
            loading="lazy"
            className="h-full w-full object-cover transition-[filter] duration-300 group-hover:brightness-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            暂无封面
          </div>
        )}
        {/* 底部渐变遮罩 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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
    </div>
  );
}