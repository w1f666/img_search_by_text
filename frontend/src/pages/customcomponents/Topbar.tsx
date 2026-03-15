import Breadcrumb from "@/pages/customcomponents/ui/Breadcrumb"
import { SiGithub } from "react-icons/si"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator";
import { Moon, Sun, EllipsisVertical, } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes";
import { useState } from "react";
import { useTopbarNameStore } from "@/store/useTopbarNameStore";

export default function Topbar(){
    const {isSearched, SetisSearched, Keywords, SetKeywords, Deletechat} = useTopbarNameStore();
    const GithubURL = "https://github.com/quark-sp/image-search-and-duplicate-by-CLIP";
    const {theme, setTheme, resolvedTheme} = useTheme();
    const isDark = theme === "dark" || (theme === "system" && resolvedTheme === "dark");
    
    return(
        <div className="relative h-14 bg-background flex items-center justify-between px-4 z-10 pt-4">
            <nav aria-label="Breadcrumb">
                <Breadcrumb />
            </nav>
            {isSearched && 
            <div className="flex items-center h-8">
                {Keywords}
            </div>
            }
            <div className="flex items-center h-8">
                <Button variant="ghost" className="h-10 w-10" asChild>
                    <a href={GithubURL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <SiGithub
                            className="size-6"
                        />
                        <span className="sr-only">GitHub</span>
                    </a>
                </Button>
                <Separator orientation="vertical" className=" mx-2 "/>
                <Button variant="ghost" className="h-10 w-10" onClick={() => setTheme(isDark ? "light" : "dark")}>
                    {isDark ? (
                        <Sun
                            className="size-6"/>
                    ) : (
                        <Moon
                            className="size-6"/>)
                    }
                    <span className="sr-only">Toggle Theme</span>
                </Button>
                <Separator orientation="vertical" className=" mx-2 "/>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-6 h-10 p-0 focus-visible:ring-0">
                            <EllipsisVertical className="size-6"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={Deletechat}>删除会话</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {SetKeywords("")}}>重命名会话</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
