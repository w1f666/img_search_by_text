// 路由懒加载期间的统一占位，避免每个页面重复写加载骨架。
export function PageLoader({ label = "正在加载页面..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-16 text-sm text-muted-foreground">
      {label}
    </div>
  );
}