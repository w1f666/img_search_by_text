import React from "react";
import { ChevronDownIcon } from "lucide-react";
import { useMatches, Link, useNavigate, type UIMatch } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGalleryListQuery } from "@/lib/media-query";
import type { GalleryItem } from "@/types/media";

interface RouteHandle{
    breadcrumb: (match: UIMatch) => string;
}

export default function CustomBreadcrumbs() {
    const matches = useMatches() as UIMatch<unknown,RouteHandle>[];
    // 面包屑里的 galleryId 需要再查一次图集列表，才能把 id 转成可读名称。
    const { data: galleryList = [] } = useGalleryListQuery();
    const navigate = useNavigate();
    const crumbs = matches
    .filter((match) => Boolean(match.handle?.breadcrumb))
    .map((match) => {
        // 路由 handle 先给出一个兜底名称，如果是动态 galleryId，再用真实图集名覆盖。
        const rawName = match.handle.breadcrumb(match)
        const shouldUseGalleryName = Boolean(
            match.params.galleryId && rawName === match.params.galleryId
        )
        const name = shouldUseGalleryName
            ? galleryList.find((gallery: GalleryItem) => gallery.id === match.params.galleryId)?.name ?? rawName
            : rawName
        return {
            name,
            path: match.pathname,
        }
    });
    return (
        <Breadcrumb>
            <BreadcrumbList>
                {crumbs.map((crumb,index) => {
                    const islast = index === crumbs.length-1;
                    return(
                        <React.Fragment key={crumb.path}>
                            <BreadcrumbItem>
                                {islast?
                                    <BreadcrumbPage className="text-lg">{crumb.name}</BreadcrumbPage>
                                : <BreadcrumbLink className="text-lg" asChild>
                                        <Link to={crumb.path}>{crumb.name}</Link>
                                    </BreadcrumbLink>}
                                {!islast && crumb.name === "图集" && 
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-1">
                                            <ChevronDownIcon className="size-3.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuGroup>
                                            {galleryList.length > 0 ? (
                                                galleryList.map((g: GalleryItem) => (
                                                    <DropdownMenuItem
                                                        key={g.id}
                                                        onClick={() => navigate(`/gallery/${g.id}`)}
                                                    >
                                                        {g.name}
                                                    </DropdownMenuItem>
                                                ))
                                            ) : (
                                                <DropdownMenuItem disabled>暂无相册</DropdownMenuItem>
                                            )}
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>}
                            </BreadcrumbItem>
                            {!islast && <BreadcrumbSeparator/>}
                        </React.Fragment>
                        )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}