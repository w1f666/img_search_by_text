import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronLeft, ChevronRight, ImagePlus, Loader2, Paperclip, Search, SearchX, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyImage } from "@/pages/customcomponents/ui/LazyImage";
import { useHistoryListQuery, useSearchSessionResultsQuery, useSearchTopKMutation } from "@/lib/media-query";
import { preloadImageResource } from "@/lib/image-resource";
import type { HistoryRecord, HistoryTurn, ImageItem, SearchQuery, SearchStrategy } from "@/types/media";
import { FancySelect } from "@/pages/customcomponents/ui/FancySelect";
import { ImageGrid } from "@/pages/customcomponents/ui/ImageGrid";
import { ImageCard } from "@/pages/customcomponents/ui/imagecard";
import { ImageSkeleton } from "@/pages/customcomponents/ui/imageskeleton";

const GREETINGS = [
    "想找哪张图？给我一句描述，或者直接丢一张参考图。",
    "从语义到视觉，一轮一轮收敛到你要的那一张。",
    "你负责提出线索，我来帮你锁定最佳匹配。",
];

const modeOptions = [
    { value: "balanced", label: "平衡模式", hint: "文本与图像混合" },
    { value: "image-first", label: "图像优先", hint: "更强调参考图" },
    { value: "text-first", label: "文本优先", hint: "更强调关键词" },
];

const getQueryLabel = (query: SearchQuery) =>
    query.type === "text" ? query.textQuery : query.type === "mixed" ? query.textQuery : "图片搜索";

const getQueryImageUrl = (query: SearchQuery) =>
    query.type === "image" ? query.imageUrl : query.type === "mixed" ? query.imageUrl : null;

export default function Searchbar() {
    const { sessionId } = useParams<{ sessionId?: string }>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState("");
    const [uploadedQueryImage, setUploadedQueryImage] = useState<ImageItem | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [greetingIndex, setGreetingIndex] = useState(0);
    const [searchMode, setSearchMode] = useState<SearchStrategy>("balanced");
    const [previewIndex, setPreviewIndex] = useState(0);
    const searchMutation = useSearchTopKMutation();
    const { data: results = [], isLoading: isLoadingSession } = useSearchSessionResultsQuery(sessionId);
    const { data: historyRecords = [] } = useHistoryListQuery();

    const currentHistory = useMemo(
        () => historyRecords.find((r: HistoryRecord) => r.id === sessionId) ?? null,
        [historyRecords, sessionId]
    );
    const turns = useMemo(() => currentHistory?.turns ?? [], [currentHistory]);

    const hasSession = Boolean(sessionId);
    const hasResults = results.length > 0;
    const isSearching = searchMutation.isPending;
    const showGreeting = !hasSession && !isSearching;
    const showLoading = isSearching || (hasSession && isLoadingSession && !hasResults);
    const showResults = hasSession && hasResults && !isSearching;
    const showEmpty = hasSession && !isLoadingSession && !hasResults && !isSearching;
    const selectedImage = results[previewIndex] ?? null;

    useEffect(() => {
        if (!showGreeting) {
            return;
        }

        const timer = window.setInterval(() => {
            setGreetingIndex((current) => (current + 1) % GREETINGS.length);
        }, 3200);

        return () => window.clearInterval(timer);
    }, [showGreeting]);

    useEffect(() => {
        setPreviewIndex(0);
    }, [sessionId]);

    // 预览焦点图切换时，预加载前后图片文件，使左右切换更顺滑。
    useEffect(() => {
        if (!hasResults) return;
        const prev = results[previewIndex - 1];
        const next = results[previewIndex + 1];
        if (prev) preloadImageResource(prev.url);
        if (next) preloadImageResource(next.url);
    }, [previewIndex, results, hasResults]);

    useEffect(() => {
        return () => {
            if (uploadedQueryImage?.url.startsWith("blob:")) {
                URL.revokeObjectURL(uploadedQueryImage.url);
            }
        };
    }, [uploadedQueryImage]);

    const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        const localPreview: ImageItem = {
            id: `upload-${Date.now()}`,
            url: previewUrl,
            thumbnailUrl: previewUrl,
            filename: file.name,
            createdAt: new Date().toISOString().slice(0, 10),
            sizeLabel: `${Math.max(1, Math.round(file.size / 1024 / 1024))} MB`,
            sizeBytes: file.size,
            galleryId: null,
            status: "active",
            source: "upload",
        };

        setUploadedQueryImage(localPreview);
        setUploadedFile(file);
    };

    const handleSubmit = async () => {
        if (isSearching) {
            return;
        }

        const normalizedInput = inputValue.trim();
        const hasInput = Boolean(normalizedInput);
        const hasUploadedImage = Boolean(uploadedQueryImage);

        if (!hasInput && !hasUploadedImage) {
            return;
        }

        const response = await searchMutation.mutateAsync({
            type: hasInput && hasUploadedImage ? "mixed" : hasUploadedImage ? "image" : "text",
            textQuery: normalizedInput || undefined,
            imageUrl: uploadedQueryImage?.url,
            referenceImageFile: uploadedFile ?? undefined,
            referencePreviewImage: uploadedQueryImage ?? undefined,
            searchSessionId: sessionId,
            searchStrategy: searchMode,
        });

        if (response.searchSessionId && response.searchSessionId !== sessionId) {
            navigate(`/search/${response.searchSessionId}`, { replace: Boolean(sessionId) });
        }

        setInputValue("");
        if (uploadedQueryImage?.url.startsWith("blob:")) {
            URL.revokeObjectURL(uploadedQueryImage.url);
        }
        setUploadedQueryImage(null);
        setUploadedFile(null);
        setPreviewIndex(0);
    };

    const searchInputBlock = (
        <div className="rounded-3xl border border-border/80 bg-background/95 p-3 shadow-[0_-8px_30px_-12px_rgba(0,0,0,.12)] dark:shadow-[0_-8px_30px_-12px_rgba(0,0,0,.5)] backdrop-blur">
            <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3 text-xs text-slate-600 dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-300">
                    当前检索模式：
                    <span className="ml-1 font-medium text-slate-800 dark:text-zinc-100">
                        {modeOptions.find((option) => option.value === searchMode)?.label}
                    </span>
                </div>
                <FancySelect
                    value={searchMode}
                    options={modeOptions}
                    onValueChange={(value) => setSearchMode(value as SearchStrategy)}
                    className="h-10 rounded-2xl border-slate-200/80 bg-gradient-to-r from-slate-50/70 via-white to-slate-100/65 dark:border-zinc-700/80 dark:from-zinc-800/90 dark:via-zinc-800 dark:to-zinc-800/90 dark:bg-zinc-800"
                />
            </div>

            <Input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSubmit();
                    }
                }}
                placeholder="描述你想搜索的图片特征，例如：逆光、浅景深、人物靠左构图"
                className="h-12 rounded-2xl border-none bg-slate-100/80 shadow-none focus-visible:ring-1"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border-slate-200 bg-white"
                >
                    <Paperclip className="size-4" />
                    参考图
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                />

                {uploadedQueryImage ? (
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        <ImagePlus className="size-3.5" />
                        <img src={uploadedQueryImage.url} alt={uploadedQueryImage.filename} className="size-5 rounded object-cover" />
                        <span className="max-w-40 truncate">{uploadedQueryImage.filename}</span>
                        <button
                            type="button"
                            aria-label="remove image"
                            onClick={() => {
                                if (uploadedQueryImage.url.startsWith("blob:")) {
                                    URL.revokeObjectURL(uploadedQueryImage.url);
                                }
                                setUploadedQueryImage(null);
                                setUploadedFile(null);
                            }}
                            className="rounded-full p-0.5 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                ) : null}

                <Button
                    onClick={() => void handleSubmit()}
                    disabled={isSearching}
                    className="ml-auto rounded-full bg-slate-900 px-5 text-white hover:bg-slate-700"
                >
                    {isSearching ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                    搜索
                </Button>
            </div>
        </div>
    );

    return (
        <div className="relative flex h-full flex-col bg-slate-50 dark:bg-zinc-950">
            <AnimatePresence mode="wait">
                {/* ===== 初始态：问候语 + 搜索框，垂直居中 ===== */}
                {showGreeting && (
                    <motion.div
                        key="welcome"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30, transition: { duration: 0.35 } }}
                        className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 lg:px-10"
                    >
                        <div className="w-full max-w-5xl space-y-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                    <Sparkles className="size-3.5" />
                                    AI 融合检索
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.h1
                                        key={greetingIndex}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.45 }}
                                        className="text-balance text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100"
                                    >
                                        {GREETINGS[greetingIndex]}
                                    </motion.h1>
                                </AnimatePresence>
                                <p className="mt-3 max-w-lg text-sm text-slate-500 dark:text-zinc-400">
                                    支持文字、图片或二者混合搜索，返回最匹配的一组图片。
                                </p>
                            </div>
                            {searchInputBlock}
                        </div>
                    </motion.div>
                )}

                {/* ===== 有会话态：内容区 + 底部搜索框 ===== */}
                {!showGreeting && (
                    <motion.div
                        key="session"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-1 flex-col"
                    >
                        {/* 可滚动内容区 */}
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10">
                            <div className="mx-auto max-w-5xl py-6">
                                {/* 加载中 */}
                                {showLoading && (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="size-5 animate-spin text-slate-400 dark:text-zinc-500" />
                                            <p className="text-sm text-slate-500 dark:text-zinc-400">正在搜索...</p>
                                        </div>
                                        {/* 骨架屏占位 */}
                                        <div className="rounded-3xl border border-border/60 bg-background/80 p-3 sm:p-4">
                                            <Skeleton className="aspect-video w-full rounded-2xl" />
                                        </div>
                                        <ImageGrid className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                            {Array.from({ length: 10 }, (_, i) => (
                                                <ImageSkeleton key={i} />
                                            ))}
                                        </ImageGrid>
                                    </motion.div>
                                )}

                                {/* 无结果 */}
                                {showEmpty && (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex min-h-[40vh] flex-col items-center justify-center gap-3"
                                    >
                                        <SearchX className="size-12 text-slate-300 dark:text-zinc-600" />
                                        <p className="text-base font-medium text-slate-600 dark:text-zinc-300">未找到匹配的图片</p>
                                        <p className="max-w-sm text-center text-sm text-slate-400 dark:text-zinc-500">
                                            当前搜索条件没有在图库中找到足够相似的图片，试试换个描述或上传一张更接近的参考图。
                                        </p>
                                    </motion.div>
                                )}

                                {/* 搜索历史轮次 */}
                                {turns.length > 0 && (
                                    <section className="mb-6">
                                        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-zinc-400">
                                            <Search className="size-4" />
                                            搜索轮次（{turns.length}轮）
                                        </div>
                                        <div className="space-y-3 overflow-y-auto max-h-[50vh] rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur">
                                            {turns.map((turn: HistoryTurn, index: number) => {
                                                const [query, matchedImage] = turn;
                                                const label = getQueryLabel(query);
                                                const queryImgUrl = getQueryImageUrl(query);
                                                const queryTypeBadge =
                                                    query.type === "text" ? "文本" : query.type === "image" ? "图片" : "混合";
                                                return (
                                                    <motion.div
                                                        key={`turn-${index}`}
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.04 }}
                                                        className="rounded-2xl border border-slate-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {/* 轮次编号 */}
                                                            <span className="mt-0.5 shrink-0 rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-zinc-300">
                                                                #{index + 1}
                                                            </span>

                                                            {/* 查询详情 */}
                                                            <div className="min-w-0 flex-1 space-y-2">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800">
                                                                        {queryTypeBadge}搜索
                                                                    </span>
                                                                    <span className="text-sm text-foreground">
                                                                        {label}
                                                                    </span>
                                                                </div>

                                                                {queryImgUrl && (
                                                                    <img
                                                                        src={queryImgUrl}
                                                                        alt="query"
                                                                        className="h-16 w-auto rounded-lg object-cover ring-1 ring-slate-200 dark:ring-zinc-700"
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* 命中结果 */}
                                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                                <span className="text-[11px] text-slate-400 dark:text-zinc-500">最佳匹配</span>
                                                                <LazyImage
                                                                    src={matchedImage.thumbnailUrl ?? matchedImage.url}
                                                                    alt={matchedImage.filename}
                                                                    wrapperClassName="size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-zinc-700"
                                                                    className="h-full w-full object-cover"
                                                                />
                                                                <span className="max-w-28 truncate text-[11px] text-slate-500 dark:text-zinc-400">
                                                                    {matchedImage.filename}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}

                                {/* 搜索结果 */}
                                {showResults && (
                                    <motion.div
                                        key={`results-${sessionId}`}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-6"
                                    >
                                        {/* 预览焦点图 */}
                                        {selectedImage && (
                                            <section className="rounded-3xl border border-border/60 bg-background/80 p-3 shadow-lg backdrop-blur sm:p-4">
                                                <div className="relative overflow-hidden rounded-2xl bg-muted/30">
                                                    <LazyImage
                                                        src={selectedImage.url}
                                                        alt={selectedImage.filename}
                                                        eager
                                                        wrapperClassName="w-full"
                                                        className="max-h-[56vh] w-full object-contain"
                                                    />

                                                    {/* 前后切换 */}
                                                    <div className="absolute inset-y-0 left-0 flex items-center p-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={previewIndex === 0}
                                                            onClick={() => setPreviewIndex((i) => i - 1)}
                                                            className="size-9 rounded-full bg-black/30 text-white hover:bg-black/50 disabled:opacity-30"
                                                        >
                                                            <ChevronLeft className="size-5" />
                                                        </Button>
                                                    </div>
                                                    <div className="absolute inset-y-0 right-0 flex items-center p-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={previewIndex === results.length - 1}
                                                            onClick={() => setPreviewIndex((i) => i + 1)}
                                                            className="size-9 rounded-full bg-black/30 text-white hover:bg-black/50 disabled:opacity-30"
                                                        >
                                                            <ChevronRight className="size-5" />
                                                        </Button>
                                                    </div>

                                                    {/* 底部信息栏 */}
                                                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-white">{selectedImage.filename}</p>
                                                            <p className="text-xs text-white/70">{selectedImage.createdAt} · {selectedImage.sizeLabel}</p>
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-3">
                                                            <span className="text-xs text-white/70">
                                                                {previewIndex + 1} / {results.length}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => navigate(`/search/${sessionId}/${selectedImage.id}`)}
                                                                className="rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
                                                            >
                                                                查看详情
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        )}

                                        {/* 结果网格 */}
                                        <section>
                                            <div className="mb-3 text-sm font-medium text-slate-600 dark:text-zinc-400">
                                                共找到 {results.length} 张相关图片
                                            </div>
                                            <ImageGrid className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                                {results.map((image, index) => (
                                                    <div
                                                        key={image.id}
                                                        className={`rounded-[1.8rem] border-2 transition-all ${
                                                            index === previewIndex
                                                                ? "border-primary ring-2 ring-primary/20"
                                                                : "border-transparent"
                                                        }`}
                                                    >
                                                        <ImageCard image={image} onClick={() => setPreviewIndex(index)} />
                                                    </div>
                                                ))}
                                            </ImageGrid>
                                        </section>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* 底部搜索框 */}
                        <div className="sticky bottom-0 z-20 px-4 pb-4 pt-2 sm:px-6 lg:px-10">
                            <div className="mx-auto max-w-5xl">
                                {searchInputBlock}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
