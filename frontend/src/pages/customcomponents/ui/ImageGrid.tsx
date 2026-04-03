interface ImageGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ImageGrid({ children, className }: ImageGridProps) {
  return (
    <div
      className={
        className ??
        "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8"
      }
    >
      {children}
    </div>
  );
}
