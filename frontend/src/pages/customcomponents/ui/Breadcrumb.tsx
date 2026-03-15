import React from "react";
import { ChevronDownIcon } from "lucide-react";
import { useMatches, Link, type UIMatch } from "react-router-dom";
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
} from "@/components/ui/dropdown-menu"



interface RouteHandle{
    breadcrumb: (match: UIMatch) => string;
}

export default function CustomBreadcrumbs() {
    const matches = useMatches() as UIMatch<unknown,RouteHandle>[];
    const crumbs = matches
    .filter((match) => Boolean(match.handle?.breadcrumb))
    .map((match) => {
        const name = match.handle.breadcrumb(match)
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
                                {!islast && crumb.name === "Gallery" && 
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-1">
                                            <ChevronDownIcon className="size-3.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem>gallery1</DropdownMenuItem>
                                            <DropdownMenuItem>gallery2</DropdownMenuItem>
                                            <DropdownMenuItem>gallery3</DropdownMenuItem>
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