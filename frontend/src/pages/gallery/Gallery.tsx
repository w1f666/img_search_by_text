import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
import { CheckCircle2, FolderPen, FolderPlus, LoaderCircle, Sparkles, Trash2 } from "lucide-react";
import { useAutoClassifyMutation, useCreateGalleryMutation, useDeleteGalleryMutation, useGalleryListQuery, useGalleriesPageQuery, useUpdateGalleryMutation } from "@/lib/media-query";
import { GalleryCard } from "../customcomponents/ui/gallerycard";
import { ConfirmDialog } from "../customcomponents/ui/ConfirmDialog";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { FancySelect } from "../customcomponents/ui/FancySelect";
import { PaginationBar } from "../customcomponents/ui/PaginationBar";
import { SearchToolbar } from "../customcomponents/ui/SearchToolbar";
import type { AutoClassifyResponse, GalleryItem } from "@/types/media";

const PAGE_SIZE = 12;

export default function Gallery() {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"created_at" | "name" | "image_count">("created_at");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [busyGalleryIds, setBusyGalleryIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const deferredQuery = useDeferredValue(query);
  // 列表分页、搜索和排序全部走 query key，参数变化就自动请求新数据。
  const { data: galleryList = [] } = useGalleryListQuery();
  const galleriesQuery = useGalleriesPageQuery({
    start: (page - 1) * PAGE_SIZE + 1,
    end: page * PAGE_SIZE,
    query: deferredQuery || undefined,
    sortBy: sortMode,
    sortOrder: "desc",
  });
  const createGallery = useCreateGalleryMutation();
  const updateGallery = useUpdateGalleryMutation();
  const deleteGallery = useDeleteGalleryMutation();
  const autoClassify = useAutoClassifyMutation();
  const [classifyResultOpen, setClassifyResultOpen] = useState(false);
  const [classifyResult, setClassifyResult] = useState<AutoClassifyResponse | null>(null);

  useEffect(() => {
    // 排序和搜索改变后重置到第一页，保持分页语义正确。
    setPage(1);
  }, [deferredQuery, sortMode]);

  const items = galleriesQuery.data?.items ?? [];
  const pagination = galleriesQuery.data?.meta ?? null;

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (galleryId: string) => {
    const gallery = galleryList.find((item: GalleryItem) => item.id === galleryId);
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
      await updateGallery.mutateAsync({ id: editingId, payload: form });
    } else {
      await createGallery.mutateAsync(form);
    }

    setDialogOpen(false);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setBusyGalleryIds((current) => [...current, deleteTarget.id]);
    try {
      await deleteGallery.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setBusyGalleryIds((current) => current.filter((id) => id !== deleteTarget.id));
    }
  };

  const isEditingPending = editingId ? busyGalleryIds.includes(editingId) : false;
  const isSubmitting = createGallery.isPending || updateGallery.isPending || isEditingPending;

  const handleAutoClassify = async () => {
    const response = await autoClassify.mutateAsync({ scope: "all-unclassified" });
    setClassifyResult(response);
    setClassifyResultOpen(true);
  };

  const sortOptions = [
    { value: "created_at", label: "按创建时间", hint: "最新创建优先" },
    { value: "name", label: "按名称", hint: "按拼音顺序" },
    { value: "image_count", label: "按图片数量", hint: "从多到少排序" },
  ];

  const totalImageCount = useMemo(
    () => galleryList.reduce((sum: number, gallery: GalleryItem) => sum + gallery.imageCount, 0),
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void handleAutoClassify()}
            disabled={autoClassify.isPending || galleryList.length === 0}
          >
            {autoClassify.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            智能分类
          </Button>
          <Button onClick={openCreateDialog}>
            <FolderPlus />
            新建相册
          </Button>
        </div>
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

      {galleriesQuery.isLoading && items.length === 0 ? (
        <div data-page-empty className="rounded-3xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          正在加载相册数据...
        </div>
      ) : items.length > 0 ? (
        <section data-page-panel className="rounded-[2rem] p-5 sm:p-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item: GalleryItem) => (
              <GalleryCard
                key={item.id}
                {...item}
                busy={busyGalleryIds.includes(item.id)}
                actionSlot={
                  <>
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      className="rounded-full bg-background/80"
                      disabled={busyGalleryIds.includes(item.id)}
                      onClick={() => openEditDialog(item.id)}
                    >
                      {busyGalleryIds.includes(item.id) ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <FolderPen className="size-4" />
                      )}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      className="rounded-full"
                      disabled={busyGalleryIds.includes(item.id)}
                      onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                    >
                      {busyGalleryIds.includes(item.id) ? (
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
            <PaginationBar meta={pagination} disabled={galleriesQuery.isFetching} onPageChange={setPage} />
          ) : null}
        </section>
      ) : (
        <div data-page-empty className="rounded-3xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          {galleriesQuery.isFetching ? "正在加载相册数据..." : "没有匹配的相册，可以直接创建一个新的。"}
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="删除相册"
        description={deleteTarget ? `确认删除相册“${deleteTarget.name}”吗？` : "确认删除当前相册吗？"}
        warning="删除后，该相册中的图片不会丢失，但会变成未归类状态。"
        confirmLabel="确认删除"
        pending={deleteGallery.isPending}
        tone="danger"
        onConfirm={handleDelete}
      />
      {/* 智能分类结果弹窗 */}
      <Dialog open={classifyResultOpen} onOpenChange={setClassifyResultOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600" />
              智能分类完成
            </DialogTitle>
            <DialogDescription>
              已处理 {classifyResult?.totalProcessed ?? 0} 张图片
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
      </Dialog>    </div>
  );
}