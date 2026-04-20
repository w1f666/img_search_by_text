import { useCallback, useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { markImageResourceCached, isImageResourceCached, evictImageResourceCache } from "@/lib/image-resource";
import { cn } from "@/lib/utils";

interface LazyImageProps extends Omit<ComponentPropsWithoutRef<"img">, "src"> {
	src?: string | null;
	wrapperClassName?: string;
	skeletonClassName?: string;
	skeleton?: ReactNode;
	eager?: boolean;
	rootMargin?: string;
}

const DEFAULT_ROOT_MARGIN = "240px";

export function LazyImage({
	src,
	eager = false,
	...props
}: LazyImageProps) {
	const resetKey = `${src ?? ""}::${eager ? "1" : "0"}`;

	return <LazyImageInner key={resetKey} src={src} eager={eager} {...props} />;
}

function LazyImageInner({
	src,
	alt,
	className,
	wrapperClassName,
	skeletonClassName,
	skeleton,
	eager = false,
	rootMargin = DEFAULT_ROOT_MARGIN,
	onLoad,
	onError,
	loading,
	decoding,
	...props
}: LazyImageProps) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const isMountedRef = useRef(false);
	const [isVisible, setIsVisible] = useState(() => eager || !src);
	const [isLoaded, setIsLoaded] = useState(() => isImageResourceCached(src));

	// 真实卸载时取消未完成的图片下载。
	// StrictMode 在开发环境会同步执行 cleanup → re-mount effects，
	// 用 queueMicrotask 延迟执行：微任务在同步代码之后运行，
	// 如果是 StrictMode 模拟卸载，re-mount 已把 isMountedRef 恢复为 true，跳过；
	// 如果是真实卸载，isMountedRef 仍为 false，执行 img.src="" 取消下载。
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			const img = imageRef.current;
			if (img && !img.complete) {
				queueMicrotask(() => {
					if (!isMountedRef.current) {
						img.src = "";
					}
				});
			}
		};
	}, []);

	useEffect(() => {
		if (!src || eager || isVisible) {
			return;
		}

		const node = wrapperRef.current;
		if (!node || typeof IntersectionObserver === "undefined") {
			const frameId = window.requestAnimationFrame(() => setIsVisible(true));
			return () => window.cancelAnimationFrame(frameId);
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry?.isIntersecting) {
					setIsVisible(true);
					observer.disconnect();
				}
			},
			{ rootMargin }
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [eager, isVisible, rootMargin, src]);

	const handleLoad: NonNullable<ComponentPropsWithoutRef<"img">["onLoad"]> = (event) => {
		if (src) {
			markImageResourceCached(src);
		}
		setIsLoaded(true);
		onLoad?.(event);
	};

	const handleError: NonNullable<ComponentPropsWithoutRef<"img">["onError"]> = (event) => {
		evictImageResourceCache(src);
		setIsLoaded(true);
		onError?.(event);
	};

	const shouldRenderImage = Boolean(src && (eager || isVisible));
	const attachImageRef = useCallback((node: HTMLImageElement | null) => {
		// 只处理挂载，不处理卸载。卸载时 node 为 null，跳过，
		// 保留 imageRef.current 供 useEffect cleanup 使用。
		if (!node) return;

		imageRef.current = node;

		if (src && node.complete && node.naturalWidth > 0) {
			markImageResourceCached(src);
			setIsLoaded(true);
		}
	// src 在同一个 LazyImageInner 实例内不会变化（外层通过 key 保证），
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [src]);

	return (
		<div ref={wrapperRef} className={cn("relative", wrapperClassName)}>
			{!isLoaded && src
				? skeleton ?? <Skeleton className={cn("absolute inset-0 rounded-[inherit]", skeletonClassName)} />
				: null}
			{shouldRenderImage ? (
				<img
					{...props}
					ref={attachImageRef}
					src={src ?? undefined}
					alt={alt}
					loading={eager ? "eager" : loading ?? "lazy"}
					decoding={decoding ?? "async"}
					onLoad={handleLoad}
					onError={handleError}
					className={cn("transition-opacity duration-300", isLoaded ? "opacity-100" : "opacity-0", className)}
				/>
			) : null}
		</div>
	);
}
