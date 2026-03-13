import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import { ImageCard, type ImageItem } from "../customcomponents/ui/imagecard";
import { ImageSkeleton } from "../customcomponents/ui/imageskeleton";

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
            <Trash2 className="mr-2 h-4 w-4" />
            批量删除
          </Button>
        </div>
      </div>

      {/* 图片网格 */}
      <div className="mt-4 grid grid-cols-2 gap-4 px-4 pb-6 md:grid-cols-4 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 12 }).map((_, index) => (
              <ImageSkeleton key={index} />
            ))
          : images.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
      </div>
    </>
  );
}
//todo:全局状态存储list，更新时check