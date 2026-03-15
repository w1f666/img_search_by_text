import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, TimerReset } from "lucide-react";
import { useGalleryStore } from "@/store/useGalleryStore";
import type { HistoryRecord } from "@/types/media";
import { PageHeader } from "../customcomponents/ui/PageHeader";

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
	const { historyRecords, initLibrary } = useGalleryStore();
	const [searchParams, setSearchParams] = useSearchParams();
	const [query, setQuery] = useState(searchParams.get("query") ?? "");
	const deferredQuery = useDeferredValue(query);

	useEffect(() => {
		void initLibrary();
	}, [initLibrary]);

	const filteredRecords = useMemo(() => {
		const normalizedQuery = deferredQuery.trim().toLowerCase();

		if (!normalizedQuery) {
			return historyRecords;
		}

		return historyRecords.filter((record) =>
			[record.title, record.query, record.summary, record.category]
				.join(" ")
				.toLowerCase()
				.includes(normalizedQuery)
		);
	}, [deferredQuery, historyRecords]);

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
					placeholder="搜索历史记录、关键词或结果类型"
					className="pl-9"
				/>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
				<div className="space-y-6">
					{Object.entries(groupedRecords).length > 0 ? (
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
														<span className="text-sm font-semibold">{record.title}</span>
														<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
															{record.category}
														</span>
													</div>
													<p className="text-sm text-muted-foreground">{record.query}</p>
												</div>
												<span className="shrink-0 text-xs text-muted-foreground">{formatTime(record.createdAt)}</span>
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
									<p className="text-sm text-muted-foreground">{selectedRecord.summary}</p>
								</div>
								<div className="grid gap-3 text-sm">
									<div className="rounded-2xl bg-muted/60 p-3">
										<div className="text-xs text-muted-foreground">搜索关键词</div>
										<div className="mt-1 font-medium">{selectedRecord.query}</div>
									</div>
									<div className="rounded-2xl bg-muted/60 p-3">
										<div className="text-xs text-muted-foreground">结果规模</div>
										<div className="mt-1 font-medium">{selectedRecord.resultCount} 条候选结果</div>
									</div>
									<div className="rounded-2xl bg-muted/60 p-3">
										<div className="text-xs text-muted-foreground">执行时间</div>
										<div className="mt-1 font-medium">{formatTime(selectedRecord.createdAt)}</div>
									</div>
								</div>
								<Button variant="outline" className="w-full" onClick={() => handleSearchChange(selectedRecord.query)}>
									用这组关键词重新筛选
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
