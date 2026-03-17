import { Button } from "@/components/ui/button";
import { LoaderCircle, Maximize2 } from "lucide-react";
import type { ImageItem } from "@/types/media";

interface ImageCardProps {
  image: ImageItem;
  onClick?: () => void;
  actionMask?: React.ReactNode;
  busy?: boolean;
}

export function ImageCard({ image, onClick, actionMask, busy = false }: ImageCardProps) {
  const handleCardClick = () => {
    if (!busy && onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`group transition-transform duration-300 ease-out active:scale-[0.95] ${
        busy ? "cursor-progress" : "cursor-pointer hover:scale-[0.97]"
      }`}
      onClick={handleCardClick}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-primary/5 group-hover:ring-primary/20">
        <img 
          src={image.url} 
          alt={image.filename} 
          loading="lazy" 
          className="h-full w-full object-cover transition-[filter] duration-300 group-hover:brightness-105"
           />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/40 transition-opacity duration-200 ${busy ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          {actionMask ? actionMask : (
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/40" onClick={(e) => { e.stopPropagation(); }}>
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
      <div className="px-1 py-2">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">{image.filename}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{image.createdAt}</p>
          <p className="text-xs text-muted-foreground">{image.size}</p>
        </div>
      </div>
    </div>
  );
}