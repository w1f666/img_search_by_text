
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Paperclip, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTopbarNameStore } from "@/store/useTopbarNameStore";
import { useGalleryStore } from "@/store/useGalleryStore";
import { ImageGrid } from "@/pages/customcomponents/ui/ImageGrid";
import { ImageCard } from "@/pages/customcomponents/ui/imagecard";
import type { ImageItem } from "@/types/media";

const getQueryLabel = (query: string | ImageItem) =>
    typeof query === "string" ? query : "图片搜索";

const tokenise = (text: string) =>
    text
        .toLowerCase()
        .split(/[\s,.;:!?，。！？、]+/)
        .map((token) => token.trim())
        .filter(Boolean);

const hashString = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
};

const runMockFusionSearch = (
    images: ImageItem[],
    semanticText: string,
    uploadedImage?: ImageItem
) => {
    const semanticTokens = tokenise(semanticText);

    return [...images]
        .sort((left, right) => {
            const score = (image: ImageItem) => {
                const base = (hashString(`${image.id}-${semanticText}`) % 100) / 100;
                const searchable = [image.filename, image.size, image.createdAt].join(" ").toLowerCase();

                let overlap = 0;
                semanticTokens.forEach((token) => {
                    if (searchable.includes(token)) {
                        overlap += 1.2;
                    }
                });

                let imageBoost = 0;
                if (uploadedImage) {
                    const uploadedStem = uploadedImage.filename.split(".")[0].toLowerCase();
                    if (uploadedStem && searchable.includes(uploadedStem.slice(0, 6))) {
                        imageBoost += 1.8;
                    }
                    if (uploadedImage.url === image.url) {
                        imageBoost += 2.5;
                    }
                }

                return base + overlap + imageBoost;
            };

            return score(right) - score(left);
        })
        .slice(0, 16);
};

export default function Searchbar() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [inputValue, setInputValue] = useState("");
    const [uploadedQueryImage, setUploadedQueryImage] = useState<ImageItem | null>(null);

    const activeImages = useGalleryStore((state) => state.activeImages);
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

    const lastQueryImage = [...turns]
        .reverse()
        .find((turn) => typeof turn[0] !== "string")?.[0] as ImageItem | undefined;

    const searchResults = useMemo(() => {
        if (turns.length === 0) {
            return activeImages.slice(0, 16);
        }

        return runMockFusionSearch(activeImages, contextText, lastQueryImage);
    }, [activeImages, contextText, lastQueryImage, turns.length]);

    useEffect(() => {
        if (!selectedHistory) {
            SetisSearched(false);
            SetKeywords("");
            return;
        }

        SetisSearched(true);
        SetKeywords(selectedHistory.title);
    }, [SetKeywords, SetisSearched, selectedHistory]);

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
    };

    const handleSubmit = async () => {
        const normalizedInput = inputValue.trim();
        const hasInput = Boolean(normalizedInput);
        const hasUploadedImage = Boolean(uploadedQueryImage);

        if (!hasInput && !hasUploadedImage) {
            return;
        }

        const mergedText = [contextText, normalizedInput].filter(Boolean).join(" ");
        const nextResults = runMockFusionSearch(
            activeImages,
            mergedText || contextText,
            uploadedQueryImage ?? undefined
        );

        if (nextResults.length === 0) {
            return;
        }

        const turnQuery = uploadedQueryImage ?? normalizedInput;
        const nextTurn: [string | ImageItem, ImageItem] = [turnQuery, nextResults[0]];

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
        setUploadedQueryImage(null);
    };

    return (
        <div className="relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_top,_#fef3c7_0%,_#fff9ed_35%,_#f8fafc_70%)] px-4 py-8 sm:px-6 lg:px-10">
            <div className="pointer-events-none absolute left-1/2 top-0 h-52 w-52 -translate-x-1/2 rounded-full bg-orange-300/20 blur-3xl" />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <AnimatePresence>
                    {turns.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-sm"
                        >
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                                <Sparkles className="size-3.5" />
                                融合搜索
                            </div>
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">上传图片、输入语义，一次完成融合检索</h1>
                            <p className="mt-2 max-w-3xl text-sm text-slate-600">
                                每一轮都会继承当前会话上下文。你可以先传图，再补文字；也可以只输入文字，逐轮收敛搜索结果。
                            </p>
                        </motion.div>
                    ) : null}
                </AnimatePresence>

                <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <section className="rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-700">当前会话</h2>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                                {turns.length} turns
                            </span>
                        </div>
                        <div className="space-y-3">
                            {turns.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                                    暂无搜索记录，开始第一轮搜索吧。
                                </div>
                            ) : (
                                turns.map((turn, index) => {
                                    const [query, topImage] = turn;

                                    return (
                                        <motion.article
                                            key={`${selectedHistory?.id ?? "draft"}-${index}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.04 }}
                                            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                                        >
                                            <div className="mb-2 text-xs font-medium text-slate-500">Turn {index + 1}</div>
                                            {typeof query === "string" ? (
                                                <p className="line-clamp-2 text-sm text-slate-700">{query}</p>
                                            ) : (
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <img src={query.url} alt={query.filename} className="size-8 rounded-md object-cover" />
                                                    <span className="truncate">图片搜索</span>
                                                </div>
                                            )}
                                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
                                                <img src={topImage.url} alt={topImage.filename} className="size-10 rounded-md object-cover" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-medium text-slate-700">命中图: {topImage.filename}</p>
                                                    <p className="text-xs text-slate-500">{topImage.createdAt}</p>
                                                </div>
                                            </div>
                                        </motion.article>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
                                <Input
                                    value={inputValue}
                                    onChange={(event) => setInputValue(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void handleSubmit();
                                        }
                                    }}
                                    placeholder="描述你想找的图片内容，可叠加在当前会话上下文"
                                    className="h-12 rounded-2xl border-slate-200 pl-10"
                                />
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="rounded-full border-slate-200"
                                >
                                    <Paperclip className="size-4" />
                                    上传图片
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleUpload}
                                />

                                {uploadedQueryImage ? (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-700">
                                        <ImagePlus className="size-3.5" />
                                        <img
                                            src={uploadedQueryImage.url}
                                            alt={uploadedQueryImage.filename}
                                            className="size-5 rounded object-cover"
                                        />
                                        <span className="max-w-28 truncate">{uploadedQueryImage.filename}</span>
                                        <button
                                            type="button"
                                            aria-label="remove image"
                                            onClick={() => setUploadedQueryImage(null)}
                                            className="rounded-full p-0.5 hover:bg-orange-200/50"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                ) : null}

                                <Button onClick={() => void handleSubmit()} className="ml-auto rounded-full bg-slate-900 px-5 text-white hover:bg-slate-700">
                                    融合搜索
                                </Button>
                            </div>

                            <div className="mt-3 text-xs text-slate-500">
                                上下文拼接预览: {contextText ? `${contextText} + ${inputValue || "(待输入)"}` : inputValue || "(首轮搜索)"}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-700">融合结果</h2>
                                <span className="text-xs text-slate-500">模拟结果 {searchResults.length} 张</span>
                            </div>
                            <ImageGrid className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {searchResults.map((image) => (
                                    <ImageCard key={image.id} image={image} />
                                ))}
                            </ImageGrid>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}