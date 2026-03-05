import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import Searchbar from "./Searchbar"
export default function AppLayout(){
    return(
        <div>
            <Topbar/>
            <Sidebar/>
            <Searchbar/>
        </div>
    )
}