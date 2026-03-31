import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Breadcrumb from "@/pages/customcomponents/ui/Breadcrumb"
import { SiGithub } from "react-icons/si"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LoaderCircle, Moon, PencilLine, Sun, EllipsisVertical, Sparkles } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes";
import { useDeleteHistoryMutation, useHistoryListQuery, useRenameHistoryMutation } from "@/lib/media-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "@/pages/customcomponents/ui/ConfirmDialog";
import type { HistoryRecord } from "@/types/media";

export default function Topbar(){
    // 顶栏标题直接由 URL 中当前 history id 对应的会话记录推导出来。
    const { data: historyRecords = [] } = useHistoryListQuery();
    const renameSearchSession = useRenameHistoryMutation();
    const deleteSearchSession = useDeleteHistoryMutation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const GithubURL = "https://github.com/quark-sp/image-search-and-duplicate-by-CLIP";
    const {theme, setTheme, resolvedTheme} = useTheme();
    const isDark = theme === "dark" || (theme === "system" && resolvedTheme === "dark");
    const currentSessionId = searchParams.get("history");
    const currentHistory = historyRecords.find((record: HistoryRecord) => record.id === currentSessionId) ?? null;

    function openRenameDialog(){
        if (!currentHistory) {
            return;
        }

        setRenameValue(currentHistory.title);
        setRenameOpen(true);
        setMenuOpen(false);
    }

    async function RenameChat(){
        if (!currentSessionId) {
            return;
        }

        const nextTitle = renameValue.trim();
        if (!nextTitle) {
            return;
        }

        // 重命名成功后，mutation 会触发 history query 失效，顶栏和侧边栏会自动同步。
        await renameSearchSession.mutateAsync({ sessionId: currentSessionId, title: nextTitle });
        setRenameOpen(false);
    }

    async function Deletechat(){
        if (!currentSessionId) {
            return;
        }

        await deleteSearchSession.mutateAsync(currentSessionId);
        setDeleteOpen(false);
        navigate("/", { replace: true });
    }

    return(
        <div data-app-topbar className="relative z-10 flex h-16 items-center justify-between px-4 pt-3 backdrop-blur">
            <nav aria-label="Breadcrumb">
                <Breadcrumb />
            </nav>

            <div className="flex min-w-0 flex-1 justify-center px-4">
                <AnimatePresence>
                    {currentHistory ? (
                        <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1 text-sm text-slate-900 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:text-zinc-200"
                        >
                            <Sparkles className="size-3.5 shrink-0" />
                            <span className="max-w-[38vw] truncate">{currentHistory.title}</span>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            <div className="relative flex items-center h-10 gap-2 rounded-full border border-slate-200/80 bg-white/80 px-2 shadow-[0_12px_28px_-18px_rgba(15,23,42,.85)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/80">
                <motion.div whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <Button
                        variant="ghost"
                        className="group relative h-6 w-6 overflow-hidden rounded-full border border-transparent bg-slate-100 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 dark:text-zinc-300 text-slate-600"
                        asChild
                    >
                        <a href={GithubURL}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <SiGithub
                                className="relative z-10 size-4 transition group-hover:rotate-6 group-hover:scale-110"
                            />
                            <span className="sr-only">GitHub</span>
                        </a>
                    </Button>
                </motion.div>
                <Separator orientation="vertical" className="bg-slate-200 dark:bg-zinc-700"/>
                <motion.div
                    whileHover={{ y: -1, scale: 1.04, rotate: isDark ? -4 : 4 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Button
                        variant="ghost"
                        className="group relative h-6 w-6 overflow-hidden rounded-full border border-transparent bg-slate-100 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                    >
                        {isDark ? (
                            <Sun className="relative z-10 size-4 text-zinc-300 transition group-hover:rotate-12"/>
                        ) : (
                            <Moon className="relative z-10 size-4 text-slate-600 transition group-hover:-rotate-12"/>)
                        }
                        <span className="sr-only">Toggle Theme</span>
                    </Button>
                </motion.div>
                <Separator orientation="vertical" className="bg-slate-200 dark:bg-zinc-700"/>
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <motion.div whileHover={{ y: -1, scale: 1.04 }} whileTap={{ scale: 0.95 }}>
                            <Button variant="ghost" className="group h-6 w-6 rounded-full border border-transparent bg-slate-100 dark:bg-zinc-800 p-0 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 dark:text-zinc-300 text-slate-600 focus-visible:ring-0">
                                <EllipsisVertical className="size-4 transition duration-200 group-hover:scale-110"/>
                            </Button>
                        </motion.div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-2xl border-slate-200/70 bg-white/95 p-1.5 shadow-2xl backdrop-blur dark:border-zinc-700/80 dark:bg-zinc-900/95">
                        <DropdownMenuItem disabled={!currentSessionId} onClick={openRenameDialog} className="rounded-lg">
                            <PencilLine className="mr-2 size-4" />
                            更改对话名称
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled={!currentSessionId}
                            onClick={() => {
                                setDeleteOpen(true);
                                setMenuOpen(false);
                            }}
                            className="rounded-lg focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/30 dark:focus:text-red-400"
                        >
                            删除会话
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>更改对话名称</DialogTitle>
                        <DialogDescription>
                            修改后，顶部显示的名称和历史记录标题都会同步更新，不再固定使用第一轮 Query。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">对话名称</span>
                        <Input
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            placeholder="输入新的对话名称"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameOpen(false)}>
                            取消
                        </Button>
                        <Button disabled={renameSearchSession.isPending || !renameValue.trim()} onClick={() => void RenameChat()}>
                            {renameSearchSession.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
                            保存名称
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="删除会话"
                description="确认删除当前搜索会话吗？"
                warning="删除后，该会话会从历史记录中移除，且无法从当前前端界面恢复。"
                confirmLabel="确认删除"
                pending={deleteSearchSession.isPending}
                tone="danger"
                onConfirm={Deletechat}
            />
        </div>
    )
}
