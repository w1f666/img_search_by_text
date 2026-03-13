import { createBrowserRouter, type UIMatch } from "react-router-dom";
import MainLayout from "@/Layout/MainLayout";
import Searchbar from "@/pages//Search/Searchbar";
import Gallery from "@/pages/gallery/Gallery";
import GalleryImage from "@/pages/galleryimage/GalleryImage";
import Trash from "@/pages/Trash/Trash";
import AllImages from "@/pages/allImages/AllImages";

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
                path: "Trash",
                element: <Trash/>,
                handle: {
                    breadcrumb: () => "回收站"
                },
            },
            {
                path: "History",
                element: <History/>,
                handle: {
                    breadcrumb: () => "历史"
                },
            },
            {
                path: "allImages",
                element: <AllImages/>,
                handle: {
                    breadcrumb: () => "所有图片"
                }
            },
            {
                path: "Gallery",
                handle: {
                    breadcrumb: () => "图集"
                },
                children:[
                    {
                    index: true,
                    element: <Gallery/>,
            },
                    {
                path:":galleryname",
                handle: {
                    breadcrumb: (match: UIMatch) => match.params.galleryname
                },
                children:[
                    {
                        index: true,
                        element: <GalleryImage/>,
                    },
                    {
                        path: ":imageid",
                        element: <div>ImageDetail</div>,
                        handle: {
                            breadcrumb: (match: UIMatch) => match.params.imageid
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