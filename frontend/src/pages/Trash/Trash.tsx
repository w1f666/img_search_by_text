import { useEffect } from "react";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { ImageGrid } from "../customcomponents/ui/ImageGrid";
import { Button } from "@/components/ui/button";
import { LoaderCircle, RefreshCcw, Trash2 } from "lucide-react";
import { useGalleryStore } from "@/store/useGalleryStore";
import { ImageCard } from "../customcomponents/ui/imagecard";

export default function Trash() {
  const trashImages = useGalleryStore((state) => state.trashImages);
  const isClearingTrash = useGalleryStore((state) => state.isClearingTrash);
  const pendingImageIds = useGalleryStore((state) => state.pendingImageIds);
  const initLibrary = useGalleryStore((state) => state.initLibrary);
  const restoreImage = useGalleryStore((state) => state.restoreImage);
  const permanentlyDeleteImage = useGalleryStore((state) => state.permanentlyDeleteImage);
  const clearTrash = useGalleryStore((state) => state.clearTrash);

  useEffect(() => {
    void initLibrary();
  }, [initLibrary]);

  const handleClearTrash = async () => {
    if (!trashImages.length) {
      return;
    }

    if (!window.confirm("确认一键清空回收站吗？该操作会永久删除所有回收站图片。")) {
      return;
    }

    await clearTrash();
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <PageHeader title="回收站" description="支持恢复、永久删除，以及一键清空。" />
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">待处理 {trashImages.length} 张</span>
          </div>
        </div>
        <Button variant="destructive" onClick={() => void handleClearTrash()} disabled={trashImages.length === 0 || isClearingTrash}>
          {isClearingTrash ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          一键清空
        </Button>
      </div>

      <ImageGrid>
        {trashImages.map((img) => (
          <ImageCard 
            key={img.id} 
            image={img}
            busy={pendingImageIds.includes(img.id)}
            actionMask={
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/40" disabled={pendingImageIds.includes(img.id)} onClick={(e) => { e.stopPropagation(); void restoreImage(img.id); }}>
                  {pendingImageIds.includes(img.id) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-red-500/80 text-white hover:bg-red-500" disabled={pendingImageIds.includes(img.id)} onClick={(e) => { e.stopPropagation(); void permanentlyDeleteImage(img.id); }}>
                  {pendingImageIds.includes(img.id) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            }
          />
        ))}
        {trashImages.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            回收站当前是空的。
          </div>
        )}
        </ImageGrid>
    </div>
  );
}
