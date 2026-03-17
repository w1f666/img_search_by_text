
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ImagePlus, Loader2, Paperclip, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTopbarNameStore } from "@/store/useTopbarNameStore";
import { useGalleryStore } from "@/store/useGalleryStore";
import { mediaApi } from "@/lib/media-api";
import type { ImageItem } from "@/types/media";
import { FancySelect } from "@/pages/customcomponents/ui/FancySelect";

const getQueryLabel = (query: string | ImageItem) =>
    typeof query === "string" ? query : "图片搜索";

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

export default function Searchbar() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [inputValue, setInputValue] = useState("");
    const [uploadedQueryImage, setUploadedQueryImage] = useState<ImageItem | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [greetingIndex, setGreetingIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchMode, setSearchMode] = useState("balanced");

    const historyRecords = useGalleryStore((state) => state.historyRecords);
    const initLibrary = useGalleryStore((state) => state.initLibrary);
    const createHistoryRecord = useGalleryStore((state) => state.createHistoryRecord);
    const appendHistoryTurn = useGalleryStore((state) => state.appendHistoryTurn);

    const { SetisSearched, SetKeywords } = useTopbarNameStore();

    useEffect(() => {
        void initLibrary();
    }, [initLibrary]);

    const selectedHistoryId = searchParams.get("history");
    const selectedHistory = useMemo(
        () => historyRecords.find((record) => record.id === selectedHistoryId) ?? null,
        [historyRecords, selectedHistoryId]
    );

    const turns = selectedHistory?.turns ?? [];
    const contextText = turns.map((turn) => getQueryLabel(turn[0])).join(" ");
    const latestTurn = turns[turns.length - 1] ?? null;
    const latestResult = latestTurn?.[1] ?? null;

    const contextFeatures = useMemo(
        () => turns.map((turn, index) => ({ index, label: getQueryLabel(turn[0]) })),
        [turns]
    );

    useEffect(() => {
        if (turns.length > 0) {
            return;
        }

        const timer = window.setInterval(() => {
            setGreetingIndex((current) => (current + 1) % GREETINGS.length);
        }, 3200);

        return () => window.clearInterval(timer);
    }, [turns.length]);

    useEffect(() => {
        if (!selectedHistory) {
            SetisSearched(false);
            SetKeywords("");
            return;
        }

        SetisSearched(true);
        SetKeywords(selectedHistory.title);
    }, [SetKeywords, SetisSearched, selectedHistory]);

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

        const localPreview: ImageItem = {
            id: `upload-${Date.now()}`,
            url: URL.createObjectURL(file),
            filename: file.name,
            createdAt: new Date().toISOString().slice(0, 10),
            size: `${Math.max(1, Math.round(file.size / 1024 / 1024))} MB`,
            galleryId: null,
            status: "active",
            source: "upload",
        };

        setUploadedQueryImage(localPreview);
        setUploadedFile(file);
    };

    const handleSubmit = async () => {
        if (isSubmitting) {
            return;
        }

        const normalizedInput = inputValue.trim();
        const hasInput = Boolean(normalizedInput);
        const hasUploadedImage = Boolean(uploadedQueryImage);

        if (!hasInput && !hasUploadedImage) {
            return;
        }

        setIsSubmitting(true);

        try {
            const searchResponse = await mediaApi.searchBestMatch({
                textQuery: normalizedInput || undefined,
                referenceImageFile: uploadedFile ?? undefined,
                searchSessionId: selectedHistory?.id,
                contextualQuery: contextText,
            });

            if (!searchResponse.bestMatch) {
                return;
            }

            const turnQuery = uploadedQueryImage ?? normalizedInput;
            const nextTurn: [string | ImageItem, ImageItem] = [turnQuery, searchResponse.bestMatch];

            if (selectedHistory) {
                await appendHistoryTurn(selectedHistory.id, nextTurn);
                const nextParams = new URLSearchParams(searchParams);
                nextParams.set("history", selectedHistory.id);
                setSearchParams(nextParams, { replace: true });
            } else {
                const created = await createHistoryRecord(nextTurn);
                setSearchParams({ history: created.id }, { replace: true });
            }

            setInputValue("");
            if (uploadedQueryImage?.url.startsWith("blob:")) {
                URL.revokeObjectURL(uploadedQueryImage.url);
            }
            setUploadedQueryImage(null);
            setUploadedFile(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-full bg-[radial-gradient(circle_at_10%_20%,#e4f0ff_0%,#f8fbff_35%,#f6f2eb_100%)] px-4 py-6 sm:px-6 lg:px-10">
            <div className="pointer-events-none absolute left-8 top-8 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                <AnimatePresence mode="wait">
                    {turns.length === 0 ? (
                        <motion.section
                            key="welcome-panel"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="rounded-3xl border border-white/60 bg-white/75 px-6 py-7 shadow-[0_20px_70px_-40px_rgba(15,23,42,.5)] backdrop-blur"
                        >
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
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
                                    className="text-balance text-2xl font-semibold tracking-tight text-slate-900"
                                >
                                    {GREETINGS[greetingIndex]}
                                </motion.h1>
                            </AnimatePresence>
                            <p className="mt-3 max-w-3xl text-sm text-slate-600">
                                支持文字、图片或二者混合搜索。每一轮会在当前会话特征上继续细化，并返回最符合的一张图。
                            </p>
                        </motion.section>
                    ) : null}
                </AnimatePresence>

                <section className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_20px_70px_-45px_rgba(2,6,23,.7)] backdrop-blur">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-700">当前最优结果</h2>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{turns.length} 轮</span>
                    </div>

                    {latestResult ? (
                        <motion.article
                            key={`${selectedHistory?.id ?? "draft"}-${latestResult.id}-${turns.length}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-3 md:grid-cols-[1.1fr_1fr]"
                        >
                            <img
                                src={latestResult.url}
                                alt={latestResult.filename}
                                className="h-60 w-full rounded-2xl object-cover sm:h-72"
                            />
                            <div className="flex flex-col justify-between rounded-2xl bg-slate-50 p-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Best Match</p>
                                    <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-slate-900">{latestResult.filename}</h3>
                                    <p className="mt-2 text-sm text-slate-600">{latestResult.createdAt} · {latestResult.size}</p>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {contextFeatures.slice(-4).map((feature) => (
                                        <span
                                            key={`${feature.label}-${feature.index}`}
                                            className="max-w-52 truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                                        >
                                            {feature.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.article>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
                            暂无结果。输入关键词或上传一张参考图开始第一轮检索。
                        </div>
                    )}
                </section>

                <section className="rounded-3xl border border-white/60 bg-white/75 p-4 shadow-[0_20px_60px_-45px_rgba(2,6,23,.6)] backdrop-blur">
                    <div className="mb-3 text-sm font-semibold text-slate-700">搜索轨迹</div>
                    <div className="space-y-2">
                        {turns.length === 0 ? (
                            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">你的每一轮输入都会记录在这里。</p>
                        ) : (
                            turns.map((turn, index) => {
                                const [query, topImage] = turn;
                                return (
                                    <motion.div
                                        key={`${selectedHistory?.id ?? "draft"}-${index}`}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                                    >
                                        <div className="min-w-0 text-sm text-slate-700">
                                            <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">#{index + 1}</span>
                                            {getQueryLabel(query)}
                                        </div>
                                        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                                            <img src={topImage.url} alt={topImage.filename} className="size-7 rounded-md object-cover" />
                                            <span className="max-w-28 truncate">{topImage.filename}</span>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="sticky bottom-4 z-20">
                    <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_26px_65px_-45px_rgba(15,23,42,.8)] backdrop-blur">
                        <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
                            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3 text-xs text-slate-600">
                                当前检索模式：
                                <span className="ml-1 font-medium text-slate-800">
                                    {modeOptions.find((option) => option.value === searchMode)?.label}
                                </span>
                            </div>
                            <FancySelect
                                value={searchMode}
                                options={modeOptions}
                                onValueChange={setSearchMode}
                                className="h-10 rounded-2xl border-cyan-200/80 bg-gradient-to-r from-cyan-50/70 via-white to-amber-50/65"
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
                            placeholder="告诉我你想继续添加的特征，例如：加入逆光、浅景深、人物靠左构图"
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
                                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs text-cyan-800">
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
                                        className="rounded-full p-0.5 hover:bg-cyan-200/60"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            ) : null}

                            <Button
                                onClick={() => void handleSubmit()}
                                disabled={isSubmitting}
                                className="ml-auto rounded-full bg-slate-900 px-5 text-white hover:bg-slate-700"
                            >
                                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                                搜索
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}