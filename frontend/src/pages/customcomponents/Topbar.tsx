import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Breadcrumb from "@/pages/customcomponents/ui/Breadcrumb"
import { SiGithub } from "react-icons/si"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator";
import { Moon, Sun, EllipsisVertical, Sparkles } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes";
import { useTopbarNameStore } from "@/store/useTopbarNameStore";

export default function Topbar(){
    const {isSearched, Keywords, SetKeywords} = useTopbarNameStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const GithubURL = "https://github.com/quark-sp/image-search-and-duplicate-by-CLIP";
    const {theme, setTheme, resolvedTheme} = useTheme();
    const isDark = theme === "dark" || (theme === "system" && resolvedTheme === "dark");

    function Deletechat(){
        console.log("")
    }

    return(
        <div className="relative z-10 flex h-16 items-center justify-between border-b border-border/50 bg-background/85 px-4 backdrop-blur pt-3">
            <nav aria-label="Breadcrumb">
                <Breadcrumb />
            </nav>

            <div className="flex min-w-0 flex-1 justify-center px-4">
                <AnimatePresence>
                    {isSearched ? (
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-200/80 bg-cyan-50/90 px-3 py-1 text-sm text-cyan-900 shadow-sm"
                        >
                            <Sparkles className="size-3.5 shrink-0" />
                            <span className="max-w-[38vw] truncate">{Keywords}</span>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            <div className="relative flex items-center h-10 gap-2 rounded-full border border-slate-200/80 bg-white/80 px-2 shadow-[0_12px_28px_-18px_rgba(15,23,42,.85)] backdrop-blur">
                <motion.div whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <Button
                        variant="ghost"
                        className="group relative h-10 w-10 overflow-hidden rounded-full border border-transparent bg-gradient-to-br from-slate-100 to-slate-50 transition hover:border-slate-300/80 hover:shadow-[0_8px_20px_-12px_rgba(15,23,42,.8)]"
                        asChild
                    >
                        <a href={GithubURL}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_25%,rgba(56,189,248,.35),transparent_60%)]" />
                            <SiGithub
                                className="relative z-10 size-5 transition group-hover:rotate-6 group-hover:scale-110"
                            />
                            <span className="sr-only">GitHub</span>
                        </a>
                    </Button>
                </motion.div>
                <Separator orientation="vertical" className=" mx-2 "/>
                <motion.div
                    whileHover={{ y: -1, scale: 1.04, rotate: isDark ? -4 : 4 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Button
                        variant="ghost"
                        className="group relative h-10 w-10 overflow-hidden rounded-full border border-transparent bg-gradient-to-br from-amber-50 to-cyan-50 transition hover:border-cyan-200/70 hover:shadow-[0_10px_24px_-14px_rgba(14,116,144,.8)]"
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                    >
                        <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[conic-gradient(from_110deg_at_50%_50%,rgba(250,204,21,.25),rgba(34,211,238,.25),rgba(250,204,21,.2))]" />
                        {isDark ? (
                            <Sun className="relative z-10 size-5 text-amber-500 transition group-hover:rotate-12"/>
                        ) : (
                            <Moon className="relative z-10 size-5 text-cyan-700 transition group-hover:-rotate-12"/>)
                        }
                        <span className="sr-only">Toggle Theme</span>
                    </Button>
                </motion.div>
                <Separator orientation="vertical" className=" mx-2 "/>
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <motion.div whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.95 }}>
                            <Button variant="ghost" className="group h-10 w-10 rounded-full border border-transparent bg-gradient-to-br from-white to-slate-50 p-0 transition hover:border-slate-300/70 hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,.85)] focus-visible:ring-0">
                                <EllipsisVertical className="size-5 transition duration-200 group-hover:scale-110"/>
                            </Button>
                        </motion.div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-2xl border-border/70 bg-background/95 p-1.5 shadow-2xl backdrop-blur">
                        <DropdownMenuItem onClick={Deletechat} className="rounded-lg focus:bg-red-50 focus:text-red-700">删除会话</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {SetKeywords("")}} className="rounded-lg">重命名会话</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <AnimatePresence>
                    {menuOpen ? (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="pointer-events-none absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-cyan-200/70 bg-cyan-100/70 blur-md"
                        />
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    )
}
