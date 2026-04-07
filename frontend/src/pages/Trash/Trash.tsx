import { useState } from "react";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { ImageGrid } from "../customcomponents/ui/ImageGrid";
import { Button } from "@/components/ui/button";
import { LoaderCircle, RefreshCcw, Trash2 } from "lucide-react";
import { useClearTrashMutation, useDeleteImageMutation, useRestoreImageMutation, useTrashImagesQuery } from "@/lib/media-query";
import { ImageSkeleton } from "../customcomponents/ui/imageskeleton";
import { ConfirmDialog } from "../customcomponents/ui/ConfirmDialog";
import { ImageCard } from "../customcomponents/ui/imagecard";
import type { ImageItem } from "@/types/media";

export default function Trash() {
  // 回收站数据是服务端状态；单张卡片转圈这种交互反馈仍放在本地 state。
  const { data: trashImages = [], isLoading } = useTrashImagesQuery();
  const restoreImage = useRestoreImageMutation();
  const permanentlyDeleteImage = useDeleteImageMutation();
  const clearTrash = useClearTrashMutation();
  const [busyImageIds, setBusyImageIds] = useState<string[]>([]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const withBusy = async (imageId: string, action: () => Promise<unknown>) => {
    setBusyImageIds((current) => [...current, imageId]);
    try {
      await action();
    } finally {
      setBusyImageIds((current) => current.filter((id) => id !== imageId));
    }
  };

  const handleRestore = (imageId: string) => {
    void withBusy(imageId, () => restoreImage.mutateAsync(imageId));
  };

  const handlePermanentDelete = (imageId: string) => {
    void withBusy(imageId, () => permanentlyDeleteImage.mutateAsync(imageId));
  };

  const handleClearTrash = async () => {
    if (!trashImages.length) {
      return;
    }

    await clearTrash.mutateAsync();
    setClearConfirmOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <PageHeader title="回收站" description="支持恢复、永久删除，以及一键清空。" />
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1">待处理 {trashImages.length} 张</span>
            </div>
          </div>
          <Button variant="destructive" onClick={() => setClearConfirmOpen(true)} disabled={trashImages.length === 0 || clearTrash.isPending}>
            {clearTrash.isPending ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            一键清空
          </Button>
        </div>

        <ImageGrid>
          {trashImages.map((img: ImageItem) => (
            <ImageCard
              key={img.id}
              image={img}
              busy={busyImageIds.includes(img.id)}
              actionMask={
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/40"
                    disabled={busyImageIds.includes(img.id)}
                    aria-label="恢复图片"
                    onClick={() => handleRestore(img.id)}
                  >
                    {busyImageIds.includes(img.id) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-red-500/80 text-white hover:bg-red-500"
                    disabled={busyImageIds.includes(img.id)}
                    aria-label="永久删除"
                    onClick={() => handlePermanentDelete(img.id)}
                  >
                    {busyImageIds.includes(img.id) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              }
            />
          ))}
          {isLoading && trashImages.length === 0 && (
            <>
              {Array.from({ length: 8 }, (_, i) => (
                <ImageSkeleton key={i} />
              ))}
            </>
          )}
          {trashImages.length === 0 && !isLoading && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              回收站当前是空的。
            </div>
          )}
        </ImageGrid>
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="清空回收站"
        description="确认清空当前回收站吗？"
        warning="该操作会永久删除回收站中的所有图片，删除后无法恢复。"
        confirmLabel="永久删除"
        pending={clearTrash.isPending}
        tone="danger"
        onConfirm={handleClearTrash}
      />
    </>
  );
}
