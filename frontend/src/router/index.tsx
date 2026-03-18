import { createBrowserRouter, type UIMatch } from "react-router-dom";
import MainLayout from "@/Layout/MainLayout";
import Searchbar from "@/pages//Search/Searchbar";
import Gallery from "@/pages/gallery/Gallery";
import GalleryImage from "@/pages/galleryimage/GalleryImage";
import Trash from "@/pages/Trash/Trash";
import AllImages from "@/pages/allImages/AllImages";
import History from "@/pages/History/History";
import ImageDetail from "../pages/imageDetail/ImageDetail";

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
                element: <Searchbar/>,
            },
            {
                path: "trash",
                element: <Trash/>,
                handle: {
                    breadcrumb: () => "回收站"
                },
            },
            {
                path: "history",
                element: <History/>,
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
                        element: <AllImages/>,
                    },
                    {
                        path: ":imageid",
                        element: <ImageDetail/>,
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
                    element: <Gallery/>,
            },
                    {
                path:":galleryId",
                handle: {
                    breadcrumb: (match: UIMatch) => match.params.galleryId ?? "图集详情"
                },
                children:[
                    {
                        index: true,
                        element: <GalleryImage/>,
                    },
                    {
                        path: ":imageid",
                        element: <ImageDetail/>,
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