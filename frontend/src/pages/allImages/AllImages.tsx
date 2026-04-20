import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePlus, LoaderCircle, Sparkles, Trash2, Upload, X } from "lucide-react";
import {
  useAutoClassifyMutation,
  useBatchUploadImagesMutation,
  useGalleryListQuery,
  useImagesPageQuery,
  useMoveImageToTrashMutation,
} from "@/lib/media-query";
import { mediaApi } from "@/lib/media-api";
import type { AutoClassifyResponse, ImageItem } from "@/types/media";
import { ImageGrid } from "../customcomponents/ui/ImageGrid";
import { ImageSkeleton } from "../customcomponents/ui/imageskeleton";
import { PaginationBar } from "../customcomponents/ui/PaginationBar";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { ImageCard } from "../customcomponents/ui/imagecard";
import { FancySelect } from "../customcomponents/ui/FancySelect";

const PAGE_SIZE = 20;

export default function AllImages() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [busyImageIds, setBusyImageIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>("none");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 页面状态只保留筛选和弹窗；真正的数据列表交给 React Query 缓存。
  const { data: galleryList = [] } = useGalleryListQuery();
  const imagesQuery = useImagesPageQuery({
    ...mediaApi.buildRange(page, PAGE_SIZE),
    status: "active",
    galleryId: undefined,
  });
  const ungroupedQuery = useImagesPageQuery({
    start: 1,
    end: 1,
    status: "active",
    galleryId: null,
  });
  const batchUpload = useBatchUploadImagesMutation();
  const moveImageToTrash = useMoveImageToTrashMutation();
  const autoClassify = useAutoClassifyMutation();
  const [classifyResultOpen, setClassifyResultOpen] = useState(false);
  const [classifyResult, setClassifyResult] = useState<AutoClassifyResponse | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const images = imagesQuery.data?.items ?? [];
  const pagination = imagesQuery.data?.meta ?? null;
  const ungroupedCount = ungroupedQuery.data?.meta.total ?? 0;

  const findGalleryName = (image: ImageItem) => {
    return galleryList.find((gallery) => gallery.id === image.galleryId)?.name ?? "未归类";
  };

  const resetDialog = () => {
    for (const f of selectedFiles) URL.revokeObjectURL(f.previewUrl);
    setSelectedFiles([]);
    setSelectedGalleryId("none");
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
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    const galleryId = selectedGalleryId === "none" ? null : selectedGalleryId;
    const abortController = new AbortController();
    uploadAbortRef.current = abortController;
    setUploadError(null);
    try {
      await batchUpload.mutateAsync({
        files: selectedFiles.map((f) => f.file),
        galleryId,
        signal: abortController.signal,
      });
      setDialogOpen(false);
      resetDialog();
      setPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传失败";
      setUploadError(message);
    } finally {
      uploadAbortRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
  };

  const handleDelete = async (imageId: string) => {
    // 单卡片的忙碌状态仍然保留在本地，这类瞬时 UI 状态没必要进 React Query。
    setBusyImageIds((current) => [...current, imageId]);
    try {
      await moveImageToTrash.mutateAsync(imageId);
    } finally {
      setBusyImageIds((current) => current.filter((id) => id !== imageId));
    }
  };

  const handleAutoClassify = async () => {
    const response = await autoClassify.mutateAsync({ scope: "all-unclassified" });
    setClassifyResult(response);
    setClassifyResultOpen(true);
  };

  return (
    <div data-page-shell className="flex flex-col gap-6 px-5 py-8 sm:px-6 lg:px-8">
      <section data-page-hero className="flex flex-col gap-4 rounded-[2rem] px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <PageHeader title="所有图片" description="首次进入和每次翻页都直接请求分页 API，不再依赖前端全量过滤。" />
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span data-page-chip className="rounded-full px-3 py-1">共 {pagination?.total ?? 0} 张</span>
            <span data-page-chip className="rounded-full px-3 py-1">未归类 {ungroupedCount} 张</span>
            <span data-page-chip className="rounded-full px-3 py-1">图集 {galleryList.length} 个</span>
          </div>
        </div>
        <div className="flex gap-2">
          {ungroupedCount > 0 && (
            <Button
              variant="outline"
              onClick={() => void handleAutoClassify()}
              disabled={autoClassify.isPending}
            >
              {autoClassify.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              智能分类 ({ungroupedCount})
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <ImagePlus />
            添加图片
          </Button>
        </div>
      </section>

      {imagesQuery.isLoading && images.length === 0 ? (
        <section data-page-panel className="rounded-[2rem] p-5 sm:p-6">
          <ImageGrid>
            {Array.from({ length: 12 }, (_, i) => (
              <ImageSkeleton key={i} />
            ))}
          </ImageGrid>
        </section>
      ) : images.length > 0 ? (
        <section data-page-panel className="rounded-[2rem] p-5 sm:p-6">
          <ImageGrid>
            {images.map((image) => (
              <div key={image.id} className="space-y-2">
                <ImageCard
                  image={image}
                  onClick={() => navigate(`/all-images/${image.id}`)}
                  busy={busyImageIds.includes(image.id)}
                  actionMask={
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      className="rounded-full"
                      disabled={busyImageIds.includes(image.id)}
                      onClick={() => {
                        void handleDelete(image.id);
                      }}
                    >
                      {busyImageIds.includes(image.id) ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  }
                />
                <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
                  <span>{findGalleryName(image)}</span>
                </div>
              </div>
            ))}
          </ImageGrid>
          {pagination ? (
            <PaginationBar meta={pagination} disabled={imagesQuery.isFetching} onPageChange={setPage} />
          ) : null}
        </section>
      ) : (
        <div data-page-empty className="rounded-3xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          {imagesQuery.isFetching ? "正在加载图片数据..." : "当前筛选条件下没有图片，可以调整筛选条件或直接添加新图片。"}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { resetDialog(); setUploadError(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>上传图片</DialogTitle>
            <DialogDescription>支持一次性选择多张图片，选择图集后统一上传。</DialogDescription>
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
              <span className="text-sm font-medium">所属图集</span>
              <FancySelect
                value={selectedGalleryId}
                options={[
                  { value: "none", label: "暂不归类" },
                  ...galleryList.map((g) => ({
                    value: g.id,
                    label: g.name,
                    hint: `${g.imageCount} 张`,
                  })),
                ]}
                onValueChange={setSelectedGalleryId}
              />
            </div>
          </div>
          <DialogFooter>
            {uploadError && (
              <p className="mr-auto text-sm text-destructive">{uploadError}</p>
            )}
            {batchUpload.isPending ? (
              <Button variant="outline" onClick={handleCancelUpload}>
                取消上传
              </Button>
            ) : (
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetDialog(); setUploadError(null); }}>
                取消
              </Button>
            )}
            <Button disabled={selectedFiles.length === 0 || batchUpload.isPending} onClick={() => void handleUpload()}>
              {batchUpload.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              上传{selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 智能分类结果弹窗 */}
      <Dialog open={classifyResultOpen} onOpenChange={setClassifyResultOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              智能分类完成
            </DialogTitle>
            <DialogDescription>
              已处理 {classifyResult?.totalProcessed ?? 0} 张未归类图片
            </DialogDescription>
          </DialogHeader>
          {classifyResult && (
            <div className="space-y-3">
              {classifyResult.classified.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    成功分类 {classifyResult.classified.length} 张
                  </p>
                  <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-xl border border-border/60 bg-muted/30 p-3">
                    {Object.entries(
                      classifyResult.classified.reduce<Record<string, { galleryName: string; count: number; avgConfidence: number }>>(
                        (acc, item) => {
                          if (!acc[item.galleryId]) {
                            acc[item.galleryId] = { galleryName: item.galleryName, count: 0, avgConfidence: 0 };
                          }
                          acc[item.galleryId].count += 1;
                          acc[item.galleryId].avgConfidence += item.confidence;
                          return acc;
                        },
                        {}
                      )
                    ).map(([galleryId, info]) => (
                      <div
                        key={galleryId}
                        className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{info.galleryName}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{info.count} 张</span>
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            {Math.round((info.avgConfidence / info.count) * 100)}% 置信度
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {classifyResult.skipped.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {classifyResult.skipped.length} 张图片无法确定分类，已跳过
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setClassifyResultOpen(false)}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}