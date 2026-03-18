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
import { useGalleryStore } from "@/store/useGalleryStore";



interface RouteHandle{
    breadcrumb: (match: UIMatch) => string;
}

export default function CustomBreadcrumbs() {
    const matches = useMatches() as UIMatch<unknown,RouteHandle>[];
    const galleryList = useGalleryStore((state) => state.galleryList);
    const navigate = useNavigate();
    const crumbs = matches
    .filter((match) => Boolean(match.handle?.breadcrumb))
    .map((match) => {
        const rawName = match.handle.breadcrumb(match)
        const name = match.params.galleryId
            ? galleryList.find((gallery) => gallery.id === match.params.galleryId)?.name ?? rawName
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
                                                galleryList.map((g) => (
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