import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
  SidebarGroupLabel
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Menu, Plus, Images, Image, Trash } from "lucide-react"
import Sidebarhistory from "./ui/Sidebarhistory";
import Sidebaricon from "./ui/Sidebariconbutton"
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { useHistoryListQuery } from "@/lib/media-query";

interface SidebarNavItemProps {
  onClick: () => void;
  label: string;
  icon: LucideIcon;
  state: string;
  className?: string;
}

function SidebarNavItem({ onClick, label, icon, state, className }: SidebarNavItemProps) {

  return (
    <div className={`flex w-full items-center justify-start ${className ?? ""}`}>
      <Sidebaricon
        onClick={onClick}
        label={label}
        icon={icon}
        hideTooltip={state === "expanded"}
        iconClassName="text-sidebar-foreground/74 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-[color-mix(in_srgb,var(--sidebar-accent)_88%,white_12%)] dark:hover:text-white"
      />
      <span
        onClick={onClick}
        className={`pr-4 whitespace-nowrap overflow-hidden text-sm cursor-pointer rounded-md px-2 py-1 transition-colors ${
                   "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:bg-[color-mix(in_srgb,var(--sidebar-accent)_88%,white_12%)] dark:hover:text-white"
        } ${
          state === "expanded"
            ? "max-w-[11rem] opacity-100 transition-[max-width,opacity] duration-200"
            : "max-w-0 px-0 pr-0 opacity-0 transition-[max-width,opacity,padding] duration-200 pointer-events-none"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function AppSidebar() {
  const { toggleSidebar, state } = useSidebar();
  const navigate = useNavigate();
  // 侧边栏直接读共享 history query，不再维护独立的“历史副本”。
  const { data: historyRecords = [], isLoading } = useHistoryListQuery();

  function mytoggleSidebar() {
    toggleSidebar();
  }
  function NewSearch() { navigate("/"); }
  function Searchhistory() { navigate("/history"); }
  function openHistory(historyId: string) { navigate(`/?history=${historyId}`); }
  function openTrash() { navigate("/trash"); }

  return (
    <Sidebar collapsible="icon" className="select-none">
      <SidebarHeader className="!p-0 mt-2">
        <div className="flex items-center justify-between pt-2">
          <Sidebaricon
            onClick={mytoggleSidebar}
            label={state === "collapsed" ? "展开侧边栏" : "收起侧边栏"}
            icon={Menu}
          />
          <Sidebaricon
            onClick={Searchhistory}
            label="搜索历史"
            icon={Search}
            className={
              state === "expanded"
                ? "opacity-100 transition-opacity duration-200"
                : "opacity-0 transition-opacity duration-200 pointer-events-none"
            }
          />
        </div>
        <SidebarNavItem onClick={NewSearch} label="发起新的搜索" icon={Plus} state={state} className="pt-2" />
        <SidebarNavItem onClick={() => navigate('/gallery')} label="图库" icon={Images} state={state} />
        <SidebarNavItem onClick={() => navigate('/all-images')} label="所有照片" icon={Image} state={state} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="test-md">搜索历史</SidebarGroupLabel>
          <div className="flex flex-col items-start justify-center gap-1 py-2 px-4">
            {isLoading ? (
              <div className="flex w-full max-w-xs flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                {historyRecords.slice(0, 5).map((record) => (
                  <Sidebarhistory
                    key={record.id}
                    label={record.title}
                    onClick={() => openHistory(record.id)}
                    state={state}
                  />
                ))}
              </>
            )}
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="!p-0">
        <SidebarNavItem
          onClick={openTrash}
          label="回收站"
          icon={Trash}
          state={state}
          className="pb-4"
        />
      </SidebarFooter>
    </Sidebar>
  )
}
