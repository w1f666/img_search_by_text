import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FancySelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface FancySelectProps {
  value: string;
  options: FancySelectOption[];
  onValueChange: (value: string) => void;
  className?: string;
}

export function FancySelect({ value, options, onValueChange, className }: FancySelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex h-11 w-full items-center justify-between rounded-xl border border-border/70 bg-background/90 px-3 text-left shadow-xs outline-none transition hover:border-primary/40 hover:bg-background focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
            className
          )}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {selected?.label ?? "请选择"}
            </span>
            {selected?.hint ? (
              <span className="block truncate text-[11px] text-muted-foreground">{selected.hint}</span>
            ) : null}
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[260px] rounded-xl p-1.5">
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onValueChange(option.value)}
              className={cn(
                "flex items-start justify-between rounded-lg px-3 py-2",
                isActive && "bg-accent/70"
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{option.label}</span>
                {option.hint ? (
                  <span className="block truncate text-[11px] text-muted-foreground">{option.hint}</span>
                ) : null}
              </span>
              <Check className={cn("mt-0.5 size-4", isActive ? "opacity-100" : "opacity-0")} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}