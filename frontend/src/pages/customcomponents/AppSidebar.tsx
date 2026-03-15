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
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { useGalleryStore } from "@/store/useGalleryStore";

interface SidebarNavItemProps {
  onClick: () => void;
  label: string;
  icon: LucideIcon;
  state: string;
  className?: string;
}

function SidebarNavItem({ onClick, label, icon, state, className }: SidebarNavItemProps) {
  return (
    <div className={`flex items-center justify-start ${className ?? ""}`}>
      <Sidebaricon onClick={onClick} label={label} icon={icon} hideTooltip={state === "expanded"} />
      <span
        onClick={onClick}
        className={`pr-4 whitespace-nowrap overflow-hidden text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${
          state === "expanded"
            ? "opacity-100 transition-opacity duration-200"
            : "opacity-0 transition-opacity duration-200 pointer-events-none"
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
  const { historyRecords, loading, initLibrary } = useGalleryStore();

  useEffect(() => {
    void initLibrary();
  }, [initLibrary]);

  function mytoggleSidebar() {
    toggleSidebar();
  }
  function NewSearch() { navigate("/"); }
  function Searchhistory() { navigate("/history"); }
  function openHistory(historyId: string) { navigate(`/history?selected=${historyId}`); }
  function openTrash() { navigate("/trash"); }

  return (
    <Sidebar collapsible="icon">
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
            {loading ? (
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
      <SidebarFooter>
        <SidebarNavItem onClick={openTrash} label="回收站" icon={Trash} state={state} className="pb-4 -translate-x-2" />
      </SidebarFooter>
    </Sidebar>
  )
}
