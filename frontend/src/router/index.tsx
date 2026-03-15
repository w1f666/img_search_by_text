import { createBrowserRouter, type UIMatch } from "react-router-dom";
import MainLayout from "@/Layout/MainLayout";
import Searchbar from "@/pages/customcomponents/Searchbar";
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
                    element: <div>Gallery</div>,
            },
                    {
                path:":galleryname",
                handle: {
                    breadcrumb: (match: UIMatch) => match.params.galleryname
                },
                children:[
                    {
                        index: true,
                        element: <div>GalleryDetail</div>,
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