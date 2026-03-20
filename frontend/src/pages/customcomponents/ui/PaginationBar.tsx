import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/types/media";

interface PaginationBarProps {
  meta: PaginationMeta;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ meta, disabled = false, onPageChange }: PaginationBarProps) {
  if (meta.total === 0) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        当前加载第 {meta.returnedStart}-{meta.returnedEnd} 条，共 {meta.total} 条
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !meta.hasPrevious}
          onClick={() => onPageChange(meta.page - 1)}
        >
          上一页
        </Button>
        <span className="min-w-24 text-center text-xs text-muted-foreground">
          第 {meta.page} / {Math.max(meta.totalPages, 1)} 页
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !meta.hasNext}
          onClick={() => onPageChange(meta.page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}