import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { mediaApi } from "@/lib/media-api";
import { useGalleryStore } from "@/store/useGalleryStore";
import type { CreateImagePayload, ImageItem, PaginationMeta } from "@/types/media";
import { FancySelect } from "../customcomponents/ui/FancySelect";
import { ImageGrid } from "../customcomponents/ui/ImageGrid";
import { PaginationBar } from "../customcomponents/ui/PaginationBar";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { SearchToolbar } from "../customcomponents/ui/SearchToolbar";
import { ImageCard } from "../customcomponents/ui/imagecard";

const PAGE_SIZE = 20;

export default function AllImages() {
  const navigate = useNavigate();
  const galleryList = useGalleryStore((state) => state.galleryList);
  const activeImages = useGalleryStore((state) => state.activeImages);
  const initialized = useGalleryStore((state) => state.initialized);
  const isInitializing = useGalleryStore((state) => state.isInitializing);
  const isAddingImage = useGalleryStore((state) => state.isAddingImage);
  const pendingImageIds = useGalleryStore((state) => state.pendingImageIds);
  const initLibrary = useGalleryStore((state) => state.initLibrary);
  const addImage = useGalleryStore((state) => state.addImage);
  const moveImageToTrash = useGalleryStore((state) => state.moveImageToTrash);
  const [query, setQuery] = useState("");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [form, setForm] = useState<CreateImagePayload>({
    filename: "",
    sizeLabel: "",
    url: "/gallery/landscapes/IMG_8212.JPG",
    galleryId: null,
  });
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    void initLibrary();
  }, [initLibrary]);

  const loadPage = useCallback(async (nextPage: number) => {
    setIsPageLoading(true);
    try {
      const range = mediaApi.buildRange(nextPage, PAGE_SIZE);
      const response = await mediaApi.listImagesPage({
        ...range,
        status: "active",
        galleryId:
          galleryFilter === "all"
            ? undefined
            : galleryFilter === "ungrouped"
              ? null
              : galleryFilter,
        query: deferredQuery || undefined,
      });

      setImages(response.items);
      setPagination(response.meta);
    } finally {
      setIsPageLoading(false);
    }
  }, [deferredQuery, galleryFilter]);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, galleryFilter]);

  useEffect(() => {
    void loadPage(page);
  }, [activeImages.length, loadPage, page]);

  const ungroupedCount = useMemo(
    () => activeImages.filter((image) => image.galleryId === null).length,
    [activeImages]
  );

  const findGalleryName = (image: ImageItem) => {
    return galleryList.find((gallery) => gallery.id === image.galleryId)?.name ?? "未归类";
  };

  const resetForm = () => {
    setForm({
      filename: "",
      sizeLabel: "",
      url: "/gallery/landscapes/IMG_8212.JPG",
      galleryId: null,
    });
  };

  const handleCreateImage = async () => {
    if (!form.filename.trim() || !form.sizeLabel.trim()) {
      return;
    }

    await addImage({
      ...form,
      filename: form.filename.trim(),
      sizeLabel: form.sizeLabel.trim(),
      url: form.url.trim(),
    });
    setDialogOpen(false);
    resetForm();
    setPage(1);
    await loadPage(1);
  };

  const handleDelete = async (imageId: string) => {
    await moveImageToTrash(imageId);
    await loadPage(page);
  };

  const galleryFilterOptions = [
    { value: "all", label: "全部图集", hint: `共 ${galleryList.length} 个图集` },
    { value: "ungrouped", label: "仅未归类", hint: `${ungroupedCount} 张待整理` },
    ...galleryList.map((gallery) => ({
      value: gallery.id,
      label: gallery.name,
      hint: `${gallery.imageCount} 张图片`,
    })),
  ];

  return (
    <div data-page-shell className="flex flex-col gap-6 px-5 py-8 sm:px-6 lg:px-8">
      <section data-page-hero className="flex flex-col gap-4 rounded-[2rem] px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <PageHeader title="所有图片" description="首次进入和每次翻页都直接请求分页 API，不再依赖前端全量过滤。" />
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span data-page-chip className="rounded-full px-3 py-1">共 {pagination?.total ?? activeImages.length} 张</span>
            <span data-page-chip className="rounded-full px-3 py-1">未归类 {ungroupedCount} 张</span>
            <span data-page-chip className="rounded-full px-3 py-1">图集 {galleryList.length} 个</span>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <ImagePlus />
          添加图片
        </Button>
      </section>

      <SearchToolbar
        value={query}
        onChange={setQuery}
        placeholder="按文件名搜索图片"
        className="rounded-[1.75rem]"
        rightSlot={
          <FancySelect
            value={galleryFilter}
            onValueChange={setGalleryFilter}
            options={galleryFilterOptions}
          />
        }
      />

      {isInitializing && !initialized && images.length === 0 ? (
        <div data-page-empty className="rounded-3xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          正在加载图片数据...
        </div>
      ) : images.length > 0 ? (
        <section data-page-panel className="rounded-[2rem] p-5 sm:p-6">
          <ImageGrid>
            {images.map((image) => (
              <div key={image.id} className="space-y-2">
                <ImageCard
                  image={image}
                  onClick={() => navigate(`/all-images/${image.id}`)}
                  busy={pendingImageIds.includes(image.id)}
                  actionMask={
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      className="rounded-full"
                      disabled={pendingImageIds.includes(image.id)}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(image.id);
                      }}
                    >
                      {pendingImageIds.includes(image.id) ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  }
                />
                <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
                  <span>{findGalleryName(image)}</span>
                  <span>{image.source === "upload" ? "手动添加" : "扫描导入"}</span>
                </div>
              </div>
            ))}
          </ImageGrid>
          {pagination ? (
            <PaginationBar meta={pagination} disabled={isPageLoading} onPageChange={setPage} />
          ) : null}
        </section>
      ) : (
        <div data-page-empty className="rounded-3xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          {isPageLoading ? "正在加载图片数据..." : "当前筛选条件下没有图片，可以调整筛选条件或直接添加新图片。"}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加图片</DialogTitle>
            <DialogDescription>
              表单字段已对齐后端图片创建接口，提交后会刷新当前分页结果和全局图片状态。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">文件名</span>
              <Input
                value={form.filename}
                onChange={(event) =>
                  setForm((current) => ({ ...current, filename: event.target.value }))
                }
                placeholder="例如：trip-cover.jpg"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-sm font-medium">文件大小</span>
                <Input
                  value={form.sizeLabel}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sizeLabel: event.target.value }))
                  }
                  placeholder="例如：3.6 MB"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">所属图集</span>
                <select
                  value={form.galleryId ?? "none"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      galleryId: event.target.value === "none" ? null : event.target.value,
                    }))
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="none">暂不归类</option>
                  {galleryList.map((gallery) => (
                    <option key={gallery.id} value={gallery.id}>
                      {gallery.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">图片地址</span>
              <Input
                value={form.url}
                onChange={(event) =>
                  setForm((current) => ({ ...current, url: event.target.value }))
                }
                placeholder="/gallery/landscapes/IMG_8212.JPG"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button disabled={isAddingImage} onClick={() => void handleCreateImage()}>
              {isAddingImage ? <LoaderCircle className="size-4 animate-spin" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}