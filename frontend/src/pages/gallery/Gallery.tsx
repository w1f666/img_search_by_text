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
import { FolderPen, FolderPlus, Search, Trash2 } from "lucide-react";
import { GalleryCard } from "../customcomponents/ui/gallerycard";
import { useGalleryStore } from "@/store/useGalleryStore";
import { PageHeader } from "../customcomponents/ui/PageHeader";

export default function Gallery() {
  const {
    galleryList,
    loading,
    initLibrary,
    createGallery,
    updateGallery,
    deleteGallery,
  } = useGalleryStore();
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

      <div className="grid gap-3 rounded-3xl border bg-card/70 p-4 shadow-sm backdrop-blur md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索相册名或描述"
            className="pl-9"
          />
        </label>
        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as "time" | "name" | "count")}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="time">按创建时间</option>
          <option value="name">按名称</option>
          <option value="count">按图片数量</option>
        </select>
      </div>

      {loading && galleryList.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          正在加载相册数据...
        </div>
      ) : filteredGalleries.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredGalleries.map((item) => (
            <GalleryCard
              key={item.id}
              {...item}
              actionSlot={
                <>
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    className="rounded-full bg-background/80"
                    onClick={() => openEditDialog(item.id)}
                  >
                    <FolderPen className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="destructive"
                    className="rounded-full"
                    onClick={() => void handleDelete(item.id, item.Galleryname)}
                  >
                    <Trash2 className="size-4" />
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
            <Button onClick={() => void handleSubmit()}>{editingId ? "保存修改" : "创建相册"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}