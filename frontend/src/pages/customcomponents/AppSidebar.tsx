import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
  SidebarGroupLabel
} from "@/components/ui/sidebar"
import { Search, Menu, Plus, Images, Settings } from "lucide-react"
import Sidebarhistory from "./ui/Sidebarhistory";
import Sidebaricon from "./ui/Sidebariconbutton"
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AppSidebar() {
  const [loading, setloading] = useState(false);
  const { toggleSidebar, state } = useSidebar();
  const [ishistorysearching, setishistorysearching] = useState(false);
  const nagigate = useNavigate();
  function renderhistory(){
    setTimeout(() => setloading(false),1000)
  }
  function mytoggleSidebar(){
    toggleSidebar();
    setloading(true);
    renderhistory();
  }
  function NewSearch() {
    console.log("New Search Triggered!");
  }
  function Searchhistory(){
    setishistorysearching(true);
    console.log("history searched!");
  }
  function openHistory(){
    console.log("openhistory")
  }
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="!p-0 mt-2 gap-y-4">
        <div className="flex items-center justify-between pt-2">
          <Sidebaricon 
          onClick={mytoggleSidebar} 
          label={state==="collapsed"? "展开侧边栏": "收起侧边栏"}
          icon={Menu} 
        />
          {/* always render the history button; visibility controlled via CSS so we can fade */}
          <Sidebaricon 
            onClick={Searchhistory} 
            label={"搜索历史"}
            icon={Search} 
            className={
              state === "expanded"
                ? "opacity-100 transition-opacity duration-200"
                : "opacity-0 transition-opacity duration-200 pointer-events-none"
            }
          />
        </div>
        <div className="flex items-center justify-start pt-2">
          <Sidebaricon 
          onClick={NewSearch} 
          label="新的搜索"
          icon={Plus}
          hideTooltip={state === "expanded"}
        />
          <span
            onClick={NewSearch}
            className={`pr-4 whitespace-nowrap overflow-hidden text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors
              ${state === "expanded"
                ? "opacity-100 transition-opacity duration-200"
                : "opacity-0 transition-opacity duration-200 pointer-events-none"}`
            }>
              发起新的搜索
            </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="flex items-center justify-start">
          <Sidebaricon 
          onClick={() => nagigate('/gallery')} 
          label="图库"
          icon={Images}
          hideTooltip={state === "expanded"}
        />
          <span
            onClick={() => nagigate('/gallery')}
            className={`pr-4 whitespace-nowrap overflow-hidden text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors
              ${state === "expanded"
                ? "opacity-100 transition-opacity duration-200"
                : "opacity-0 transition-opacity duration-200 pointer-events-none"}`
            }>
              图库
            </span>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel
          className="test-md">搜索历史</SidebarGroupLabel>
          <div className="flex flex-col items-start justify-center gap-1 py-2 px-4 ">
          
            <Sidebarhistory label="搜索历史1搜索历史1搜索历史1搜索历史1" onClick={openHistory} state={state}/>
            <Sidebarhistory label="搜索历史1搜索历史1" onClick={openHistory} state={state}/>
            <Sidebarhistory label="搜索历史1" onClick={openHistory} state={state}/>
            <Sidebarhistory label="搜索历史1" onClick={openHistory} state={state}/>
            <Sidebarhistory label="搜索历史1" onClick={openHistory} state={state}/>
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-start pb-2">
          <Sidebaricon 
          onClick={NewSearch} 
          label="设置"
          icon={Settings}
          hideTooltip={state === "expanded"}
        />
          <span
            onClick={NewSearch}
            className={`pr-4 whitespace-nowrap overflow-hidden text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors
              ${state === "expanded"
                ? "opacity-100 transition-opacity duration-200"
                : "opacity-0 transition-opacity duration-200 pointer-events-none"}`
            }>
              设置
            </span>
        </div>
        </SidebarFooter>
    </Sidebar>
  )
}
