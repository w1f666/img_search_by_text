import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  Image as ImageIcon,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LazyImage } from "@/pages/customcomponents/ui/LazyImage";
import { mediaApi } from "../../lib/media-api";
import { preloadImageResource } from "@/lib/image-resource";
import { useImageDetailContextQuery, useMoveImageToTrashMutation, useUpdateImageMutation } from "@/lib/media-query";
import { PageHeader } from "@/pages/customcomponents/ui/PageHeader";
import { ImageGrid } from "@/pages/customcomponents/ui/ImageGrid";
import { ImageCard } from "@/pages/customcomponents/ui/imagecard";
import type { ImageItem } from "@/types/media";

export default function ImageDetail() {
  const navigate = useNavigate();
  const { galleryId, imageid } = useParams<{ galleryId?: string; imageid: string }>();
  // 详情页只发一个 query，后端或 mock 会把当前图、邻近图、相关图一次返回。
  const detailQuery = useImageDetailContextQuery(imageid, galleryId);
  const updateImage = useUpdateImageMutation();
  const moveImageToTrash = useMoveImageToTrashMutation();
  const context = detailQuery.data ?? null;
  const isMutating = updateImage.isPending || moveImageToTrash.isPending;

  useEffect(() => {
    if (!context) {
      return;
    }

    // 首屏展示当前图的同时，提前预热邻近图和相关图，切换详情时更顺滑。
    preloadImageResource(context.image.url);

    if (context.previousImage) {
      void mediaApi.prefetchImageDetailContext(context.previousImage.id, galleryId);
      preloadImageResource(context.previousImage.url);
    }

    if (context.nextImage) {
      void mediaApi.prefetchImageDetailContext(context.nextImage.id, galleryId);
      preloadImageResource(context.nextImage.url);
    }

    context.relatedImages.forEach((entry: ImageItem) => {
      preloadImageResource(entry.thumbnailUrl ?? entry.url);
    });
  }, [context, galleryId]);

  const image = context?.image ?? null;
  const backPath = galleryId ? `/gallery/${galleryId}` : "/all-images";
  const backLabel = galleryId ? "返回当前图集" : "返回所有照片";

  const handleRemoveFromGallery = async () => {
    if (!image) {
      return;
    }

    await updateImage.mutateAsync({ id: image.id, payload: { galleryId: null } });
    if (galleryId) {
      navigate(`/all-images/${image.id}`, { replace: true });
      return;
    }
    await detailQuery.refetch();
  };

  const handleMoveToTrash = async () => {
    if (!image) {
      return;
    }

    await moveImageToTrash.mutateAsync(image.id);
    navigate("/trash", { replace: true });
  };

  if (detailQuery.isLoading) {
    return (
      <div data-page-shell className="flex flex-col gap-6 px-5 py-8 sm:px-6 lg:px-8">
        <section data-page-hero className="rounded-[2rem] px-6 py-16 text-center text-sm text-muted-foreground">
          正在加载图片详情...
        </section>
      </div>
    );
  }

  if (!context || !image) {
    return (
      <div data-page-shell className="flex flex-col gap-6 px-5 py-8 sm:px-6 lg:px-8">
        <section data-page-hero className="rounded-[2rem] px-6 py-6">
          <PageHeader title="图片不存在" description="这张图片可能已被删除，或者当前路由中的图片 id 不正确。" />
          <div className="mt-5">
            <Button variant="outline" onClick={() => navigate(backPath)}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div data-page-shell className="flex flex-col gap-6 px-5 py-8 sm:px-6 lg:px-8">
      <section data-page-hero className="grid gap-6 rounded-[2rem] p-5 lg:grid-cols-[minmax(0,1.4fr)_360px] lg:p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => navigate(backPath)}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-border/55 bg-background/75 p-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={!context.previousImage}
                onClick={() => context.previousImage && navigate(galleryId ? `/gallery/${galleryId}/${context.previousImage.id}` : `/all-images/${context.previousImage.id}`)}
                className="rounded-full"
              >
                <ChevronLeft className="size-4" />
                上一张
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!context.nextImage}
                onClick={() => context.nextImage && navigate(galleryId ? `/gallery/${galleryId}/${context.nextImage.id}` : `/all-images/${context.nextImage.id}`)}
                className="rounded-full"
              >
                下一张
                <ChevronRight className="size-4" />
              </Button>
            </div>
            {image.galleryId ? (
              <Button variant="outline" onClick={() => navigate(`/gallery/${image.galleryId}`)}>
                <FolderOpen className="size-4" />
                打开所属图集
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <a href={image.url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                查看原图
              </a>
            </Button>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-border/55 bg-card/85 shadow-lg">
            {/* 详情主图直接 eager 加载，保证用户进入详情页时第一视觉尽快完成。 */}
            <LazyImage
              src={image.url}
              alt={image.filename}
              eager
              fetchPriority="high"
              wrapperClassName="w-full bg-muted/30"
              className="max-h-[72vh] w-full object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-[1.75rem] border border-border/55 bg-card/88 p-5 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/55 bg-secondary/85 px-3 py-1 text-xs text-muted-foreground">
                <ImageIcon className="size-3.5" />
                {image.status === "active" ? "可用图片" : "回收站图片"}
              </div>
              <PageHeader
                title={image.filename}
                description={image.galleryId ? `当前归属图集 ${image.galleryId}` : "当前未归类，可在列表页继续整理。"}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-border/50 bg-background/75 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">上传时间</p>
                <p className="mt-1 text-sm font-medium text-foreground">{image.createdAt}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/75 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">文件大小</p>
                <p className="mt-1 text-sm font-medium text-foreground">{image.sizeLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/75 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">所属图集</p>
                <p className="mt-1 text-sm font-medium text-foreground">{image.galleryId ?? "未归类"}</p>
              </div>
            </div>
          </div>

          {image.status === "active" ? (
            <div className="flex flex-wrap gap-3">
              {image.galleryId ? (
                <Button variant="secondary" disabled={isMutating} onClick={() => void handleRemoveFromGallery()}>
                  {isMutating ? <LoaderCircle className="size-4 animate-spin" /> : <FolderOpen className="size-4" />}
                  移出当前图集
                </Button>
              ) : null}
              <Button variant="destructive" disabled={isMutating} onClick={() => void handleMoveToTrash()}>
                {isMutating ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                移入回收站
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {context.relatedImages.length > 0 ? (
        <section data-page-panel className="rounded-[2rem] p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <PageHeader
              title="相关图片"
              description={image.galleryId ? "同一图集内的其他图片。" : "从全部活动图片中挑选的相关内容。"}
            />
          </div>
          <ImageGrid className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {context.relatedImages.map((entry: ImageItem) => (
              <ImageCard
                key={entry.id}
                image={entry}
                onClick={() => navigate(entry.galleryId ? `/gallery/${entry.galleryId}/${entry.id}` : `/all-images/${entry.id}`)}
              />
            ))}
          </ImageGrid>
        </section>
      ) : null}
    </div>
  );
}
