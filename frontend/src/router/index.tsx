import { lazy, Suspense } from "react";
import { createBrowserRouter, type UIMatch } from "react-router-dom";
import MainLayout from "@/Layout/MainLayout";
import { PageLoader } from "@/pages/customcomponents/ui/page-loader";

// 页面级组件改为按路由懒加载，首屏只下载当前访问路径真正需要的代码。
const Searchbar = lazy(() => import("@/pages/Search/Searchbar"));
const Gallery = lazy(() => import("@/pages/gallery/Gallery"));
const GalleryImage = lazy(() => import("@/pages/galleryimage/GalleryImage"));
const Trash = lazy(() => import("@/pages/Trash/Trash"));
const AllImages = lazy(() => import("@/pages/allImages/AllImages"));
const History = lazy(() => import("@/pages/History/History"));
const ImageDetail = lazy(() => import("../pages/imageDetail/ImageDetail"));

// 每个路由页面都包一层 Suspense，统一显示轻量级过渡 loading。
const withSuspense = (element: React.ReactNode) => (
    <Suspense fallback={<PageLoader />}>
        {element}
    </Suspense>
);

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout/>,
        handle: {
                    breadcrumb: () => "首页"
                },
        children:[
            {
                index: true,
                element: withSuspense(<Searchbar/>),
            },
            {
                path: "trash",
                element: withSuspense(<Trash/>),
                handle: {
                    breadcrumb: () => "回收站"
                },
            },
            {
                path: "history",
                element: withSuspense(<History/>),
                handle: {
                    breadcrumb: () => "历史"
                },
            },
            {
                path: "all-images",
                handle: {
                    breadcrumb: () => "所有图片"
                },
                children: [
                    {
                        index: true,
                        element: withSuspense(<AllImages/>),
                    },
                    {
                        path: ":imageid",
                        element: withSuspense(<ImageDetail/>),
                        handle: {
                            breadcrumb: () => "图片详情"
                        }
                    }
                ]
            },
            {
                path: "gallery",
                handle: {
                    breadcrumb: () => "图集"
                },
                children:[
                    {
                    index: true,
                    element: withSuspense(<Gallery/>),
            },
                    {
                path:":galleryId",
                handle: {
                    breadcrumb: (match: UIMatch) => match.params.galleryId ?? "图集详情"
                },
                children:[
                    {
                        index: true,
                        element: withSuspense(<GalleryImage/>),
                    },
                    {
                        path: ":imageid",
                        element: withSuspense(<ImageDetail/>),
                        handle: {
                            breadcrumb: () => "图片详情"
                        }
                    }
                ]
            }
                ]
            },
           
        ]
    }
])

export default router