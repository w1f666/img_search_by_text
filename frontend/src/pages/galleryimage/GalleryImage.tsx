import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
import { ImageMinus, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useGalleryStore } from "@/store/useGalleryStore";
import type { CreateImagePayload } from "@/types/media";
import { ImageCard } from "../customcomponents/ui/imagecard";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { SearchToolbar } from "../customcomponents/ui/SearchToolbar";

export default function GalleryImage() {
  const { galleryname } = useParams<{ galleryname: string }>();
  const galleryList = useGalleryStore((state) => state.galleryList);
  const activeImages = useGalleryStore((state) => state.activeImages);
  const initialized = useGalleryStore((state) => state.initialized);
  const isInitializing = useGalleryStore((state) => state.isInitializing);
  const isAddingImage = useGalleryStore((state) => state.isAddingImage);
  const pendingImageIds = useGalleryStore((state) => state.pendingImageIds);
  const initLibrary = useGalleryStore((state) => state.initLibrary);
  const addImage = useGalleryStore((state) => state.addImage);
  const updateImageGallery = useGalleryStore((state) => state.updateImageGallery);
  const moveImageToTrash = useGalleryStore((state) => state.moveImageToTrash);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateImagePayload>({
    filename: "",
    size: "",
    url: "/gallery/landscapes/IMG_8203.JPG",
    galleryId: null,
  });
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    void initLibrary();
  }, [initLibrary]);

  const gallery = useMemo(
    () => galleryList.find((item) => item.Galleryname === galleryname),
    [galleryList, galleryname]
  );

  const images = useMemo(() => {
    if (!gallery) {
      return [];
    }

    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return activeImages.filter((image) => {
      if (image.galleryId !== gallery.id) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [image.filename, image.size]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeImages, deferredQuery, gallery]);

  useEffect(() => {
    if (!gallery) {
      return;
    }

    setForm((current) => ({ ...current, galleryId: gallery.id }));
  }, [gallery]);

  const handleCreateImage = async () => {
    if (!gallery || !form.filename.trim() || !form.size.trim()) {
      return;
    }

    await addImage({
      ...form,
      galleryId: gallery.id,
      filename: form.filename.trim(),
      size: form.size.trim(),
    });
    setDialogOpen(false);
    setForm({
      filename: "",
      size: "",
      url: "/gallery/landscapes/IMG_8203.JPG",
      galleryId: gallery.id,
    });
  };

  if (initialized && !isInitializing && !gallery) {
    return (
      <div className="flex flex-col gap-4 px-4 py-8">
        <PageHeader title={galleryname ?? "相册不存在"} description="当前相册不存在，可能已被删除或重命名。" />
        <div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          请返回图集列表重新选择相册。
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <PageHeader
            title={gallery?.Galleryname ?? galleryname ?? "未命名相册"}
            description={gallery?.description ?? "这个页面用于管理单个相册内的图片。"}
          />
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">已收录 {gallery?.count ?? 0} 张</span>
            <span className="rounded-full bg-muted px-3 py-1">创建于 {gallery?.CreatedTime ?? "--"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <ImagePlus className="mr-2 h-4 w-4" />
            添加图片
          </Button>
        </div>
      </div>

      <SearchToolbar
        value={query}
        onChange={setQuery}
        placeholder="在当前相册中搜索图片"
      />

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              busy={pendingImageIds.includes(image.id)}
              actionMask={
                <div className="flex gap-2">
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    className="rounded-full bg-background/80"
                    disabled={pendingImageIds.includes(image.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      void updateImageGallery(image.id, null);
                    }}
                  >
                    {pendingImageIds.includes(image.id) ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ImageMinus className="size-4" />
                    )}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="destructive"
                    className="rounded-full"
                    disabled={pendingImageIds.includes(image.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      void moveImageToTrash(image.id);
                    }}
                  >
                    {pendingImageIds.includes(image.id) ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          这个相册里还没有图片，可以先添加一张，或从全部图片页重新归类。
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加到相册</DialogTitle>
            <DialogDescription>
              当前提交仍是本地 mock 逻辑，后续这里可以直接接入上传或入册接口。
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
                placeholder="例如：gallery-cover.jpg"
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
                  placeholder="例如：2.6 MB"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">所属相册</span>
                <Input value={gallery?.Galleryname ?? ""} disabled />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">图片地址</span>
              <Input
                value={form.url}
                onChange={(event) =>
                  setForm((current) => ({ ...current, url: event.target.value }))
                }
                placeholder="/gallery/landscapes/IMG_8203.JPG"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
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