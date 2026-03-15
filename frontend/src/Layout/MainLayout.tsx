import AppSidebar from "@/pages/customcomponents/AppSidebar"
import {SidebarProvider} from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"
import Topbar from "@/pages/customcomponents/Topbar"

export default function MainLayout(){
    return(
        <SidebarProvider defaultOpen={false}>
            <AppSidebar/>
            <div className="flex flex-col flex-1 h-screen overflow-hidden">
                <Topbar/>
                <main className="flex-1 overflow-y-auto relative">
                    <Outlet/>
                </main>
            </div>
        </SidebarProvider>
    )
}