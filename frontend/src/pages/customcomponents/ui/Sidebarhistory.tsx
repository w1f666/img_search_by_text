import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState, useCallback } from "react";

interface SidebarhistoryProp{
    onClick: () => void,
    label: string,
    className?: string,
    state: string,
}

export default function Sidebarhistory({onClick, label, className, state}: SidebarhistoryProp){
  const [open, setOpen] = useState(false);
  const hideTooltip = state === "expanded";
  const handleOpenChange = useCallback((next: boolean) => {
    if (hideTooltip) { setOpen(false); return; }
    setOpen(next);
  }, [hideTooltip]);

  return(
        <Tooltip open={open} onOpenChange={handleOpenChange}>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={`cursor-pointer rounded-md px-2 py-1 text-sidebar-foreground/74 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-[color-mix(in_srgb,var(--sidebar-accent)_88%,white_12%)] dark:hover:text-white ${className ?? ""}`}
            >
              <div className="flex items-center w-48">
              <span className={`whitespace-nowrap overflow-hidden truncate text-sm
              ${state === "expanded"
                ? "opacity-100 transition-opacity duration-200"
                : "opacity-0 transition-opacity duration-200 pointer-events-none"}`
            }>
              {label}
            </span>
            </div>
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
          >
            {label}
          </TooltipContent>
        </Tooltip>
    )
}
