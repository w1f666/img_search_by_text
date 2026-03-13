import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type LucideIcon } from "lucide-react";
import { useState, useCallback } from "react";

interface SidebarIconProp{
    onClick: () => void,
    label: string,
    icon: LucideIcon,
    className?: string,
    hideTooltip?: boolean,
}

export default function Sidebaricon({onClick, label, icon:Icon, className, hideTooltip}: SidebarIconProp){
    const [open, setOpen] = useState(false);
    const handleOpenChange = useCallback((next: boolean) => {
      if (hideTooltip) { setOpen(false); return; }
      setOpen(next);
    }, [hideTooltip]);

    return(
        <Tooltip open={open} onOpenChange={handleOpenChange}>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={`flex items-center justify-center w-(--sidebar-width-icon) h-10 shrink-0  ${className ?? ""}`}
            >
              <div className="size-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                <Icon className="size-[18px]" />
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