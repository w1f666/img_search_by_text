import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImagePlus, Search, Sparkles, TimerReset } from "lucide-react";
import { useHistoryListQuery } from "@/lib/media-query";
import type { HistoryRecord, SearchQuery } from "@/types/media";
import { PageHeader } from "../customcomponents/ui/PageHeader";

function getTurnLabel(query: SearchQuery) {
	return query.type === "text" ? query.textQuery : "图片搜索";
	}

function getSectionLabel(createdAt: string) {
	const createdDate = new Date(createdAt);
	const now = new Date();
	const todayKey = now.toISOString().slice(0, 10);
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	const yesterdayKey = yesterday.toISOString().slice(0, 10);
	const createdKey = createdDate.toISOString().slice(0, 10);
	const diff = now.getTime() - createdDate.getTime();
	const withinWeek = diff < 7 * 24 * 60 * 60 * 1000;

	if (createdKey === todayKey) {
		return "今天";
	}

	if (createdKey === yesterdayKey) {
		return "昨天";
	}

	if (withinWeek) {
		return "最近 7 天";
	}

	return `${createdDate.getFullYear()} 年 ${createdDate.getMonth() + 1} 月`;
}

function formatTime(createdAt: string) {
	return new Intl.DateTimeFormat("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(createdAt));
}

export default function History() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [query, setQuery] = useState(searchParams.get("query") ?? "");
	const deferredQuery = useDeferredValue(query);
	// 历史页的筛选直接作为 query 参数参与请求，页面本身不再做二次全量过滤。
	const { data: historyRecords = [], isLoading } = useHistoryListQuery(deferredQuery || undefined);

	const filteredRecords = useMemo(() => historyRecords, [historyRecords]);

	const groupedRecords = useMemo(() => {
		return filteredRecords.reduce<Record<string, HistoryRecord[]>>((groups, record) => {
			const label = getSectionLabel(record.createdAt);
			groups[label] = groups[label] ? [...groups[label], record] : [record];
			return groups;
		}, {});
	}, [filteredRecords]);

	const selectedId = searchParams.get("selected");
	const selectedRecord =
		filteredRecords.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? null;

	const handleSearchChange = (value: string) => {
		setQuery(value);
		const nextParams = new URLSearchParams(searchParams);
		if (value.trim()) {
			nextParams.set("query", value);
		} else {
			nextParams.delete("query");
		}
		setSearchParams(nextParams, { replace: true });
	};

	const handleSelect = (recordId: string) => {
		const nextParams = new URLSearchParams(searchParams);
		nextParams.set("selected", recordId);
		setSearchParams(nextParams, { replace: true });
	};

	const openSearchSession = (recordId: string) => {
		navigate(`/?history=${recordId}`);
	};

	return (
		<div className="flex flex-col gap-6 px-4 py-8">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-2">
					<PageHeader title="搜索历史" description="参考 Gemini 的历史搜索方式，支持按关键词快速筛选和回看。" />
					<div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
						<span className="rounded-full bg-muted px-3 py-1">共 {historyRecords.length} 条记录</span>
						<span className="rounded-full bg-muted px-3 py-1">当前命中 {filteredRecords.length} 条</span>
					</div>
				</div>
			</div>

			<div className="relative rounded-3xl border bg-card/70 p-4 shadow-sm backdrop-blur">
				<Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={query}
					onChange={(event) => handleSearchChange(event.target.value)}
					placeholder="搜索历史记录、turn 内容或命中图片"
					className="pl-9"
				/>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
				<div className="space-y-6">
					{isLoading ? (
						<div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
							正在加载历史记录...
						</div>
					) : Object.entries(groupedRecords).length > 0 ? (
						Object.entries(groupedRecords).map(([label, records]) => (
							<section key={label} className="space-y-3">
								<div className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
									<TimerReset className="size-4" />
									<span>{label}</span>
								</div>
								<div className="space-y-2">
									{records.map((record) => {
										const isSelected = selectedRecord?.id === record.id;

										return (
											<button
												key={record.id}
												type="button"
												onClick={() => handleSelect(record.id)}
												className={`flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left transition ${
													isSelected
														? "border-primary/40 bg-primary/5 shadow-sm"
														: "bg-card hover:border-primary/30 hover:bg-muted/40"
												}`}
											>
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<span className="text-sm font-semibold">
															{record.title}
														</span>
													</div>
													<p className="text-sm text-muted-foreground">
														{record.turns.length > 0 ? getTurnLabel(record.turns[0][0]) : "空会话"}
													</p>
												</div>
												<div className="shrink-0 text-right">
													<div className="text-xs text-muted-foreground">{formatTime(record.createdAt)}</div>
													<div className="mt-1 text-xs text-muted-foreground">{record.turns.length} turns</div>
												</div>
											</button>
										);
									})}
								</div>
							</section>
						))
					) : (
						<div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
							没有匹配的历史记录，换个关键词再试。
						</div>
					)}
				</div>

				<Card className="h-fit rounded-3xl border bg-card/80 shadow-sm xl:sticky xl:top-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg">
							<Sparkles className="size-5" />
							历史详情
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{selectedRecord ? (
							<>
								<div className="space-y-2">
									<h3 className="text-base font-semibold">{selectedRecord.title}</h3>
									<p className="text-sm text-muted-foreground">首轮查询: {selectedRecord.turns.length > 0 ? getTurnLabel(selectedRecord.turns[0][0]) : "空"}</p>
								</div>
								<div className="grid gap-3 text-sm">
									<div className="rounded-2xl bg-muted/60 p-3">
										<div className="text-xs text-muted-foreground">会话轮次</div>
										<div className="mt-1 font-medium">{selectedRecord.turns.length} turns</div>
									</div>
									<div className="rounded-2xl bg-muted/60 p-3">
										<div className="text-xs text-muted-foreground">第一轮查询类型</div>
										<div className="mt-1 font-medium">
											{selectedRecord.turns.length > 0 && selectedRecord.turns[0][0].type !== "text" ? (
												<span className="inline-flex items-center gap-1">
													<ImagePlus className="size-3.5" /> 图片搜索
												</span>
											) : (
												"文字搜索"
											)}
										</div>
									</div>
									<div className="rounded-2xl bg-muted/60 p-3">
										<div className="text-xs text-muted-foreground">执行时间</div>
										<div className="mt-1 font-medium">{formatTime(selectedRecord.createdAt)}</div>
									</div>
								</div>

								<div className="space-y-2">
									<div className="text-xs font-medium text-muted-foreground">Turn 明细</div>
									<div className="max-h-64 space-y-2 overflow-auto pr-1">
										{selectedRecord.turns.map((turn, index) => {
											const [turnQuery, resultImage] = turn;
											return (
												<div key={`${selectedRecord.id}-${index}`} className="rounded-xl border bg-muted/30 p-2 text-xs">
													<div>Turn {index + 1}: {getTurnLabel(turnQuery)}</div>
													<div className="mt-1 text-muted-foreground">命中图: {resultImage.filename}</div>
												</div>
											);
										})}
									</div>
								</div>

								<Button variant="outline" className="w-full" onClick={() => openSearchSession(selectedRecord.id)}>
									打开这个历史会话
								</Button>
							</>
						) : (
							<div className="rounded-2xl bg-muted/40 px-4 py-12 text-center text-sm text-muted-foreground">
								选择左侧一条历史记录后，这里会展示详情。
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
