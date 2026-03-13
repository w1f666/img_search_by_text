import { createBrowserRouter, type UIMatch } from "react-router-dom";
import MainLayout from "@/Layout/MainLayout";
import Searchbar from "@/pages//Search/Searchbar";
import Gallery from "@/pages/gallery/Gallery";
import GalleryImage from "@/pages/galleryimage/GalleryImage";

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
                path: "gallery",
                handle: {
                    breadcrumb: () => "Gallery"
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