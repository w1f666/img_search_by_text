import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Trash2, Maximize2 } from "lucide-react";

interface ImageItem {
  id: string;
  url: string;
  filename: string;
  createdAt: string;
  size: string;
}

function ImageSkeletonCard() {
  return (
    <div className="animate-pulse flex flex-col gap-2">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-1.5 px-1">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
    </div>
  );
}

function ImageCard({ image }: { image: ImageItem }) {
  const navigate = useNavigate();

  return (
    <div 
      className="group cursor-pointer transition-transform duration-300 ease-out hover:scale-[0.97] active:scale-[0.95]"
      onClick={() => navigate(image.id)}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50 transition-shadow duration-300 group-hover:shadow-lg group-hover:shadow-primary/5 group-hover:ring-primary/20">
        <img
          src={image.url}
          alt={image.filename}
          loading="lazy"
          className="h-full w-full object-cover transition-[filter] duration-300 group-hover:brightness-105"
        />
        
        {/* 底部渐变遮罩 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* 悬停时的操作蒙版 */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/40"
            onClick={(e) => {
              e.stopPropagation();
              // 预览功能
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="px-1 py-2">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          {image.filename}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{image.createdAt}</p>
          <p className="text-xs text-muted-foreground">{image.size}</p>
        </div>
      </div>
    </div>
  );
}

export default function GalleryImage() {
  const { galleryname } = useParams<{ galleryname: string }>();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      // 模拟模拟后端请求，延时 1 秒
      setTimeout(() => {
        const fakeImages: ImageItem[] = Array.from({ length: 18 }).map((_, i) => ({
          id: `img-${i + 1}`,
          url: "/public/gallery/landscapes/IMG_8212.JPG",
          filename: `IMG_${8200 + i}.JPG`,
          createdAt: "2026-03-12",
          size: (Math.random() * 3 + 1).toFixed(1) + " MB"
        }));
        setImages(fakeImages);
        setLoading(false);
      }, 1000);
    };

    fetchImages();
  }, [galleryname]);

  const handleBatchOperation = () => {
    console.log("Batch operation clicked");
  };

  return (
    <>
      <div className="py-2">
        <Separator />
      </div>
      
      {/* 头部信息与操作栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 gap-4">
        <div>
          <h2 className="text-xl font-bold">{galleryname || "未命名相册"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            已收录 {loading ? "..." : images.length} 张图片
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBatchOperation}>
            <Download className="mr-2 h-4 w-4" />
            批量下载
          </Button>
          <Button variant="destructive" size="sm" onClick={handleBatchOperation}>
            <Trash2 className="mr-2 h-4 w-4" />
            批量删除
          </Button>
        </div>
      </div>

      {/* 图片网格 */}
      <div className="mt-4 grid grid-cols-2 gap-4 px-4 pb-6 md:grid-cols-4 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 12 }).map((_, index) => (
              <ImageSkeletonCard key={index} />
            ))
          : images.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
      </div>
    </>
  );
}
//todo:全局状态存储list，更新时check