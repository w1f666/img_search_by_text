import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
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
import { FolderPen, FolderPlus, LoaderCircle, Trash2 } from "lucide-react";
import { mediaApi } from "@/lib/media-api";
import { useGalleryStore } from "@/store/useGalleryStore";
import type { GalleryItem, PaginationMeta } from "@/types/media";
import { GalleryCard } from "../customcomponents/ui/gallerycard";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { FancySelect } from "../customcomponents/ui/FancySelect";
import { PaginationBar } from "../customcomponents/ui/PaginationBar";
import { SearchToolbar } from "../customcomponents/ui/SearchToolbar";

const PAGE_SIZE = 12;

export default function Gallery() {
  const galleryList = useGalleryStore((state) => state.galleryList);
  const initialized = useGalleryStore((state) => state.initialized);
  const isInitializing = useGalleryStore((state) => state.isInitializing);
  const isCreatingGallery = useGalleryStore((state) => state.isCreatingGallery);
  const pendingGalleryIds = useGalleryStore((state) => state.pendingGalleryIds);
  const initLibrary = useGalleryStore((state) => state.initLibrary);
  const createGallery = useGalleryStore((state) => state.createGallery);
  const updateGallery = useGalleryStore((state) => state.updateGallery);
  const deleteGallery = useGalleryStore((state) => state.deleteGallery);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"created_at" | "name" | "image_count">("created_at");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    void initLibrary();
  }, [initLibrary]);

  const loadPage = useCallback(async (nextPage: number) => {
    setIsPageLoading(true);
    try {
      const range = mediaApi.buildRange(nextPage, PAGE_SIZE);
      const response = await mediaApi.listGalleriesPage({
        ...range,
        query: deferredQuery || undefined,
        sortBy: sortMode,
        sortOrder: "desc",
      });

      setItems(response.items);
      setPagination(response.meta);
    } finally {
      setIsPageLoading(false);
    }
  }, [deferredQuery, sortMode]);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, sortMode]);

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page, galleryList.length]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (galleryId: string) => {
    const gallery = galleryList.find((item) => item.id === galleryId);
    if (!gallery) {
      return;
    }

    setEditingId(galleryId);
    setForm({
      name: gallery.name,
      description: gallery.description,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      return;
    }

    if (editingId) {
      await updateGallery(editingId, form);
    } else {
      await createGallery(form);
    }

    setDialogOpen(false);
    setPage(1);
    await loadPage(1);
  };

  const handleDelete = async (galleryId: string, galleryName: string) => {
    if (!window.confirm(`删除相册“${galleryName}”后，图片会变成未归类状态，是否继续？`)) {
      return;
    }

    await deleteGallery(galleryId);
    await loadPage(page);
  };

  const isEditingPending = editingId ? pendingGalleryIds.includes(editingId) : false;
  const isSubmitting = isCreatingGallery || isEditingPending;

  const sortOptions = [
    { value: "created_at", label: "按创建时间", hint: "最新创建优先" },
    { value: "name", label: "按名称", hint: "按拼音顺序" },
    { value: "image_count", label: "按图片数量", hint: "从多到少排序" },
  ];

  const totalImageCount = useMemo(
    () => galleryList.reduce((sum, gallery) => sum + gallery.imageCount, 0),
    [galleryList]
  );

  return (
    <div data-page-shell className="flex flex-col gap-6 px-5 py-8 sm:px-6 lg:px-8">
      <section data-page-hero className="flex flex-col gap-4 rounded-[2rem] px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <PageHeader title="图集管理" description="图集列表改为分页请求，搜索和翻页都会直接调用 API。" />
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span data-page-chip className="rounded-full px-3 py-1">共 {pagination?.total ?? galleryList.length} 个相册</span>
            <span data-page-chip className="rounded-full px-3 py-1">已收录 {totalImageCount} 张</span>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <FolderPlus />
          新建相册
        </Button>
      </section>

      <SearchToolbar
        value={query}
        onChange={setQuery}
        placeholder="搜索相册名或描述"
        className="rounded-[1.75rem]"
        rightSlot={
          <FancySelect
            value={sortMode}
            onValueChange={(value) => setSortMode(value as "created_at" | "name" | "image_count")}
            options={sortOptions}
          />
        }
      />

      {isInitializing && !initialized && items.length === 0 ? (
        <div data-page-empty className="rounded-3xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          正在加载相册数据...
        </div>
      ) : items.length > 0 ? (
        <section data-page-panel className="rounded-[2rem] p-5 sm:p-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <GalleryCard
                key={item.id}
                {...item}
                busy={pendingGalleryIds.includes(item.id)}
                actionSlot={
                  <>
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      className="rounded-full bg-background/80"
                      disabled={pendingGalleryIds.includes(item.id)}
                      onClick={() => openEditDialog(item.id)}
                    >
                      {pendingGalleryIds.includes(item.id) ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <FolderPen className="size-4" />
                      )}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      className="rounded-full"
                      disabled={pendingGalleryIds.includes(item.id)}
                      onClick={() => void handleDelete(item.id, item.name)}
                    >
                      {pendingGalleryIds.includes(item.id) ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </>
                }
              />
            ))}
          </div>
          {pagination ? (
            <PaginationBar meta={pagination} disabled={isPageLoading} onPageChange={setPage} />
          ) : null}
        </section>
      ) : (
        <div data-page-empty className="rounded-3xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          {isPageLoading ? "正在加载相册数据..." : "没有匹配的相册，可以直接创建一个新的。"}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑相册" : "新建相册"}</DialogTitle>
            <DialogDescription>
              当前表单字段已对齐后端结构，提交后会刷新分页列表和全局图集状态。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">相册名称</span>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="例如：旅行精选"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">相册描述</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="补充这个相册的用途或筛选标准"
                className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button disabled={isSubmitting} onClick={() => void handleSubmit()}>
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {editingId ? "保存修改" : "创建相册"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}