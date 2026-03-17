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
import { FolderPen, FolderPlus, LoaderCircle, Trash2 } from "lucide-react";
import { GalleryCard } from "../customcomponents/ui/gallerycard";
import { useGalleryStore } from "@/store/useGalleryStore";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { FancySelect } from "../customcomponents/ui/FancySelect";
import { SearchToolbar } from "../customcomponents/ui/SearchToolbar";

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
  const [sortMode, setSortMode] = useState<"time" | "name" | "count">("time");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ Galleryname: "", description: "" });
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    void initLibrary();
  }, [initLibrary]);

  const filteredGalleries = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const nextList = galleryList.filter((gallery) => {
      if (!normalizedQuery) {
        return true;
      }

      return [gallery.Galleryname, gallery.description]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return nextList.sort((left, right) => {
      if (sortMode === "name") {
        return left.Galleryname.localeCompare(right.Galleryname, "zh-Hans-CN");
      }

      if (sortMode === "count") {
        return right.count - left.count;
      }

      return right.CreatedTime.localeCompare(left.CreatedTime);
    });
  }, [deferredQuery, galleryList, sortMode]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ Galleryname: "", description: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (galleryId: string) => {
    const gallery = galleryList.find((item) => item.id === galleryId);
    if (!gallery) {
      return;
    }

    setEditingId(galleryId);
    setForm({
      Galleryname: gallery.Galleryname,
      description: gallery.description,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.Galleryname.trim()) {
      return;
    }

    if (editingId) {
      await updateGallery(editingId, form);
    } else {
      await createGallery(form);
    }

    setDialogOpen(false);
  };

  const handleDelete = async (galleryId: string, galleryName: string) => {
    if (!window.confirm(`删除相册“${galleryName}”后，图片会变成未归类状态，是否继续？`)) {
      return;
    }

    await deleteGallery(galleryId);
  };

  const isEditingPending = editingId ? pendingGalleryIds.includes(editingId) : false;
  const isSubmitting = isCreatingGallery || isEditingPending;

  const sortOptions = [
    { value: "time", label: "按创建时间", hint: "最新创建优先" },
    { value: "name", label: "按名称", hint: "按拼音顺序" },
    { value: "count", label: "按图片数量", hint: "从多到少排序" },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <PageHeader title="图集管理" description="支持本地 mock 的相册增删改查，后续可直接接入真实接口。" />
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">共 {galleryList.length} 个相册</span>
            <span className="rounded-full bg-muted px-3 py-1">已收录 {galleryList.reduce((sum, gallery) => sum + gallery.count, 0)} 张</span>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <FolderPlus />
          新建相册
        </Button>
      </div>

      <SearchToolbar
        value={query}
        onChange={setQuery}
        placeholder="搜索相册名或描述"
        rightSlot={
          <FancySelect
            value={sortMode}
            onValueChange={(value) => setSortMode(value as "time" | "name" | "count")}
            options={sortOptions}
          />
        }
      />

      {isInitializing && !initialized ? (
        <div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          正在加载相册数据...
        </div>
      ) : filteredGalleries.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredGalleries.map((item) => (
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
                    onClick={() => void handleDelete(item.id, item.Galleryname)}
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
      ) : (
        <div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          没有匹配的相册，可以直接创建一个新的。
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑相册" : "新建相册"}</DialogTitle>
            <DialogDescription>
              现在是前端本地数据流，后续只需要把 store 中的调用替换为后端接口。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">相册名称</span>
              <Input
                value={form.Galleryname}
                onChange={(event) =>
                  setForm((current) => ({ ...current, Galleryname: event.target.value }))
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