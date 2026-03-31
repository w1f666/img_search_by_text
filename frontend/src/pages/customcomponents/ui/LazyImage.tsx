import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { markImageResourceCached, isImageResourceCached } from "@/lib/image-resource";
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
	const [isVisible, setIsVisible] = useState(() => eager || !src);
	const [isLoaded, setIsLoaded] = useState(() => isImageResourceCached(src));

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
		setIsLoaded(true);
		onError?.(event);
	};

	const shouldRenderImage = Boolean(src && (eager || isVisible));
	const attachImageRef = (node: HTMLImageElement | null) => {
		imageRef.current = node;

		if (!src || !node) {
			return;
		}

		if (node.complete && node.naturalWidth > 0) {
			markImageResourceCached(src);
			setIsLoaded(true);
		}
	};

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
