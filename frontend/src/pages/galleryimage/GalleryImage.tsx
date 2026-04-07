import { useMemo, useState } from "react";
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
import { ImageMinus, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useCreateImageMutation, useGalleryListQuery, useImagesPageQuery, useMoveImageToTrashMutation, useUpdateImageMutation } from "@/lib/media-query";
import { mediaApi } from "@/lib/media-api";
import type { CreateImagePayload, GalleryItem, ImageItem } from "@/types/media";
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
  const [form, setForm] = useState<CreateImagePayload>({
    filename: "",
    sizeLabel: "",
    url: "/gallery/landscapes/IMG_8203.JPG",
    galleryId: null,
  });
  // 这里同时依赖两个 query：一个拿当前图集信息，一个拿当前图集下的分页图片。
  const { data: galleryList = [], isLoading: isGalleryLoading } = useGalleryListQuery();
  const imagesQuery = useImagesPageQuery({
    ...mediaApi.buildRange(page, PAGE_SIZE),
    status: "active",
    galleryId,
  });
  const addImage = useCreateImageMutation();
  const updateImageGallery = useUpdateImageMutation();
  const moveImageToTrash = useMoveImageToTrashMutation();

  const gallery = useMemo(
    () => galleryList.find((item: GalleryItem) => item.id === galleryId) ?? null,
    [galleryId, galleryList]
  );
  const images = imagesQuery.data?.items ?? [];
  const pagination = imagesQuery.data?.meta ?? null;

  const handleCreateImage = async () => {
    if (!galleryId || !form.filename.trim() || !form.sizeLabel.trim()) {
      return;
    }

    await addImage.mutateAsync({
      ...form,
      galleryId,
      filename: form.filename.trim(),
      sizeLabel: form.sizeLabel.trim(),
    });
    setDialogOpen(false);
    setForm({
      filename: "",
      sizeLabel: "",
      url: "/gallery/landscapes/IMG_8203.JPG",
      galleryId: null,
    });
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加到相册</DialogTitle>
            <DialogDescription>
              当前提交会只失效当前相册和图片相关 query，不再整库刷新。
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
                  value={form.sizeLabel}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sizeLabel: event.target.value }))
                  }
                  placeholder="例如：2.6 MB"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-medium">所属相册</span>
                <Input value={gallery?.name ?? ""} disabled />
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
            <Button disabled={addImage.isPending} onClick={() => void handleCreateImage()}>
              {addImage.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}