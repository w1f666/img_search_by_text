import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Group } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import GallerySkeletonCard from "../customcomponents/ui/galleryskeleton";
import { GalleryCard } from "../customcomponents/ui/gallerycard";
import { useGalleryStore } from "@/store/useGalleryStore";

export default function Gallery() {
  const { galleryList, loading, setGalleryList, setLoading } =
    useGalleryStore();

  function SortGallery() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }

  useEffect(() => {
    const fetchdata = async () => {
      setLoading(true);
      setTimeout(() => {
        setGalleryList([
          {
            Galleryname: "风景",
            CreatedTime: "2026-3-12",
            imageUrl: "public/gallery/landscapes/IMG_8212.JPG",
            count: 67,
          },
        ]);
        setLoading(false);
      }, 1000);
    };
    fetchdata();
  }, []);

  return (
    <>
      <div className="py-2">
        <Separator />
      </div>
      <div className="flex items-center justify-between px-4 py-2">
        <span className="ml-2 text-md tracking-wide">
          共整理出{galleryList.length}个相册
        </span>

        <Button variant="outline" size="sm" onClick={SortGallery}>
          <Group />
          一键分类
        </Button>
      </div>

      {/* 固定一行 4 列的网格布局 */}
      <div className="grid grid-cols-4 gap-6 px-4 pb-6">
        {loading
          ? Array.from({ length: 12 }).map((_, index) => (
              <GallerySkeletonCard key={index} />
            ))
          : galleryList.map((item, index) => (
              <GalleryCard key={index} {...item} />
            ))}
      </div>
    </>
  );
}
//todo: 相册增删改查 根据相册名进行分类 
//todo：所有照片 增删改查