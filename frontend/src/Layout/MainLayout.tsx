import AppSidebar from "@/pages/customcomponents/AppSidebar"
import {SidebarProvider} from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"
import Topbar from "@/pages/customcomponents/Topbar"

export default function MainLayout(){
    return(
        <SidebarProvider defaultOpen={false}>
            <div data-app-shell className="flex min-h-screen w-full">
                <AppSidebar/>
                <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
                    <Topbar/>
                    <main className="flex-1 overflow-y-auto relative">
                        <Outlet/>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}