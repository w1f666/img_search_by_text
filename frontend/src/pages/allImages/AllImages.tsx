import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
import { ImagePlus, Search, Trash2 } from "lucide-react";
import { useGalleryStore } from "@/store/useGalleryStore";
import type { CreateImagePayload, ImageItem } from "@/types/media";
import { ImageCard } from "../customcomponents/ui/imagecard";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { ImageGrid } from "../customcomponents/ui/ImageGrid";

export default function AllImages() {
  const {
    activeImages,
    galleryList,
    initLibrary,
    addImage,
    moveImageToTrash,
  } = useGalleryStore();
  const [query, setQuery] = useState("");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateImagePayload>({
    filename: "",
    size: "",
    url: "/gallery/landscapes/IMG_8212.JPG",
    galleryId: null,
  });
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    void initLibrary();
  }, [initLibrary]);

  const filteredImages = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return activeImages.filter((image) => {
      const matchesGallery =
        galleryFilter === "all"
          ? true
          : galleryFilter === "ungrouped"
            ? image.galleryId === null
            : image.galleryId === galleryFilter;

      const matchesQuery =
        normalizedQuery.length === 0 ||
        [image.filename, image.size]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesGallery && matchesQuery;
    });
  }, [activeImages, deferredQuery, galleryFilter]);

  const ungroupedCount = useMemo(
    () => activeImages.filter((image) => image.galleryId === null).length,
    [activeImages]
  );

  const findGalleryName = (image: ImageItem) => {
    return galleryList.find((gallery) => gallery.id === image.galleryId)?.Galleryname ?? "未归类";
  };

  const resetForm = () => {
    setForm({
      filename: "",
      size: "",
      url: "/gallery/landscapes/IMG_8212.JPG",
      galleryId: null,
    });
  };

  const handleCreateImage = async () => {
    if (!form.filename.trim() || !form.size.trim()) {
      return;
    }

    await addImage({
      ...form,
      filename: form.filename.trim(),
      size: form.size.trim(),
    });
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (imageId: string) => {
    await moveImageToTrash(imageId);
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <PageHeader title="所有照片" description="先走本地状态，后续直接替换为后端接口即可。" />
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">共 {activeImages.length} 张</span>
            <span className="rounded-full bg-muted px-3 py-1">未归类 {ungroupedCount} 张</span>
            <span className="rounded-full bg-muted px-3 py-1">相册 {galleryList.length} 个</span>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <ImagePlus />
          添加图片
        </Button>
      </div>

      <div className="grid gap-3 rounded-3xl border bg-card/70 p-4 shadow-sm backdrop-blur md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="按文件名搜索图片"
            className="pl-9"
          />
        </label>
        <select
          value={galleryFilter}
          onChange={(event) => setGalleryFilter(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="all">全部相册</option>
          <option value="ungrouped">仅未归类</option>
          {galleryList.map((gallery) => (
            <option key={gallery.id} value={gallery.id}>
              {gallery.Galleryname}
            </option>
          ))}
        </select>
      </div>

      {filteredImages.length > 0 ? (
        <ImageGrid>
          {filteredImages.map((image) => (
            <div key={image.id} className="space-y-2">
              <ImageCard
                image={image}
                actionMask={
                  <Button
                    size="icon-sm"
                    variant="destructive"
                    className="rounded-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(image.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                }
              />
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>{findGalleryName(image)}</span>
                <span>{image.source === "upload" ? "手动添加" : "扫描导入"}</span>
              </div>
            </div>
          ))}
        </ImageGrid>
      ) : (
        <div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          当前筛选条件下没有图片，可以调整筛选条件或直接添加新图片。
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加图片</DialogTitle>
            <DialogDescription>
              这里先走本地 mock 数据。接后端时，将表单提交替换为真实上传接口即可。
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
                  value={form.size}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, size: event.target.value }))
                  }
                  placeholder="例如：3.6 MB"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">所属相册</span>
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
                      {gallery.Galleryname}
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
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              取消
            </Button>
            <Button onClick={() => void handleCreateImage()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}