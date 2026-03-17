import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchToolbarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rightSlot?: React.ReactNode;
  className?: string;
  searchWrapperClassName?: string;
  rightColumnWidthClassName?: string;
}

export function SearchToolbar({
  value,
  onChange,
  placeholder,
  rightSlot,
  className,
}: SearchToolbarProps) {
  const hasRightSlot = Boolean(rightSlot);

  return (
    <div
      className={cn(
        "grid gap-3 rounded-3xl border bg-card/70 p-4 shadow-sm backdrop-blur",
        hasRightSlot && "md:grid-cols-[minmax(0,1fr)_220px]",
        className
      )}
    >
      <label className={"relative block"}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="pl-9 h-11"
        />
      </label>

      {rightSlot}
    </div>
  );
}