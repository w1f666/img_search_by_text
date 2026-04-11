import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageMinus, ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { useBatchUploadImagesMutation, useGalleryListQuery, useImagesPageQuery, useMoveImageToTrashMutation, useUpdateImageMutation } from "@/lib/media-query";
import { mediaApi } from "@/lib/media-api";
import type { GalleryItem, ImageItem } from "@/types/media";
import { ImageCard } from "../customcomponents/ui/imagecard";
import { ImageGrid } from "../customcomponents/ui/ImageGrid";
import { ImageSkeleton } from "../customcomponents/ui/imageskeleton";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { PaginationBar } from "../customcomponents/ui/PaginationBar";

const PAGE_SIZE = 12;

export default function GalleryImage() {
  const navigate = useNavigate();
  const { galleryId } = useParams<{ galleryId: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [busyImageIds, setBusyImageIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 这里同时依赖两个 query：一个拿当前图集信息，一个拿当前图集下的分页图片。
  const { data: galleryList = [], isLoading: isGalleryLoading } = useGalleryListQuery();
  const imagesQuery = useImagesPageQuery({
    ...mediaApi.buildRange(page, PAGE_SIZE),
    status: "active",
    galleryId,
  });
  const batchUpload = useBatchUploadImagesMutation();
  const updateImageGallery = useUpdateImageMutation();
  const moveImageToTrash = useMoveImageToTrashMutation();

  const gallery = useMemo(
    () => galleryList.find((item: GalleryItem) => item.id === galleryId) ?? null,
    [galleryId, galleryList]
  );
  const images = imagesQuery.data?.items ?? [];
  const pagination = imagesQuery.data?.meta ?? null;

  const resetDialog = () => {
    for (const f of selectedFiles) URL.revokeObjectURL(f.previewUrl);
    setSelectedFiles([]);
  };

  const handleFileChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newEntries = Array.from(fileList).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setSelectedFiles((prev) => [...prev, ...newEntries]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleUpload = async () => {
    if (!galleryId || selectedFiles.length === 0) return;
    await batchUpload.mutateAsync({
      files: selectedFiles.map((f) => f.file),
      galleryId,
    });
    setDialogOpen(false);
    resetDialog();
    setPage(1);
  };

  if (!isGalleryLoading && !gallery) {
    return (
      <div data-page-shell className="flex flex-col gap-4 px-5 py-8 sm:px-6 lg:px-8">
        <PageHeader title="相册不存在" description="当前相册不存在，可能已被删除或当前链接无效。" />
        <div data-page-empty className="rounded-3xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          请返回图集列表重新选择相册。
        </div>
      </div>
    );
  }

  return (
    <div data-page-shell className="flex flex-col gap-6 px-5 py-8 sm:px-6 lg:px-8">
      <section data-page-hero className="flex flex-col gap-4 rounded-[2rem] px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <PageHeader
            title={gallery?.name ?? "未命名相册"}
            description={gallery?.description ?? "这个页面用于管理单个相册内的图片。"}
          />
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span data-page-chip className="rounded-full px-3 py-1">已收录 {pagination?.total ?? gallery?.imageCount ?? 0} 张</span>
            <span data-page-chip className="rounded-full px-3 py-1">创建于 {gallery?.createdAt ?? "--"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <ImagePlus className="mr-2 h-4 w-4" />
            添加图片
          </Button>
        </div>
      </section>

      {imagesQuery.isLoading && images.length === 0 ? (
        <section data-page-panel className="rounded-[2rem] p-5 sm:p-6">
          <ImageGrid className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 8 }, (_, i) => (
              <ImageSkeleton key={i} />
            ))}
          </ImageGrid>
        </section>
      ) : images.length > 0 ? (
        <section data-page-panel className="rounded-[2rem] p-5 sm:p-6">
          <ImageGrid className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {images.map((image: ImageItem) => (
              <ImageCard
                key={image.id}
                image={image}
                onClick={() => navigate(`/gallery/${galleryId}/${image.id}`)}
                busy={busyImageIds.includes(image.id)}
                actionMask={
                  <div className="flex gap-2">
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      className="rounded-full bg-background/90"
                      disabled={busyImageIds.includes(image.id)}
                      onClick={() => {
                        setBusyImageIds((current) => [...current, image.id]);
                        void updateImageGallery.mutateAsync({ id: image.id, payload: { galleryId: null } }).finally(() => {
                          setBusyImageIds((current) => current.filter((id) => id !== image.id));
                        });
                      }}
                    >
                      {busyImageIds.includes(image.id) ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <ImageMinus className="size-4" />
                      )}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      className="rounded-full"
                      disabled={busyImageIds.includes(image.id)}
                      onClick={() => {
                        setBusyImageIds((current) => [...current, image.id]);
                        void moveImageToTrash.mutateAsync(image.id).finally(() => {
                          setBusyImageIds((current) => current.filter((id) => id !== image.id));
                        });
                      }}
                    >
                      {busyImageIds.includes(image.id) ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                }
              />
            ))}
          </ImageGrid>
          {pagination ? (
            <PaginationBar meta={pagination} disabled={imagesQuery.isFetching} onPageChange={setPage} />
          ) : null}
        </section>
      ) : (
        <div data-page-empty className="rounded-3xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          这个相册里还没有图片，可以先添加一张。
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加到相册</DialogTitle>
            <DialogDescription>支持一次性选择多张图片，上传后归入当前相册。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { handleFileChange(e.target.files); e.target.value = ""; }}
            />
            {selectedFiles.length > 0 ? (
              <div className="space-y-3">
                <div className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-border/60 p-2">
                  {selectedFiles.map((entry, index) => (
                    <div key={entry.previewUrl} className="group relative overflow-hidden rounded-lg">
                      <img src={entry.previewUrl} alt={entry.file.name} className="aspect-square w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4">
                        <p className="truncate text-[10px] text-white">{entry.file.name}</p>
                        <p className="text-[10px] text-white/70">{formatSize(entry.file.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  继续添加
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border/60 px-6 py-10 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-secondary/50"
              >
                <Upload className="size-8" />
                <span>点击选择图片</span>
                <span className="text-xs">支持多选</span>
              </button>
            )}
            <div className="grid gap-2">
              <span className="text-sm font-medium">所属相册</span>
              <Input value={gallery?.name ?? ""} disabled />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetDialog(); }}>
              取消
            </Button>
            <Button disabled={selectedFiles.length === 0 || batchUpload.isPending} onClick={() => void handleUpload()}>
              {batchUpload.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              上传{selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}