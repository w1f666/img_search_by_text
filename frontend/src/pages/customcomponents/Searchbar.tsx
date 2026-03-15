
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTopbarNameStore } from "@/store/useTopbarNameStore";
import { motion, AnimatePresence } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRef, useState } from "react";

export default function Searchbar() {
    type modeltype = "pro" | "fast" | "balanced";
    type Searchmodetype = "search by text" | "search by img"
    const {isSearched, SetisSearched, Keywords, SetKeywords, Deletechat} = useTopbarNameStore();
    const [searchmode,setsearchmode] = useState<Searchmodetype>("search by text");
    const [model, setmodel] = useState<modeltype>("fast");
    const [inputValue, setInputValue] = useState("");
    const imginputRef = useRef<HTMLInputElement>(null)
    function handleclick(){
        if (!Keywords) {
            SetKeywords(inputValue);
        }
        SetisSearched(true);
    }
    function handlepicturesearch(){
        if (!Keywords) {
            SetKeywords("Uploaded Picture");
        }
        SetisSearched(true);
    }
    const variants = {
        initial: { y: 0, opacity: 1 },
        down: { y: 300, opacity: 1 },  
    };
    return(
        <div className="flex items-center justify-center h-full transform -translate-y-12">
            <motion.div
                className="w-full max-w-3xl"
                variants={variants}
                animate={isSearched ? "down" : "initial"}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
            >
            <div className="w-full max-w-3xl">
                {/* welcome message fades and collapses when searched */}
                <AnimatePresence>
                  {!isSearched && (
                    <motion.span
                      key="welcome"
                      initial={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="block text-3xl font-semibold mb-6 overflow-hidden"
                    >
                      Hi there, what can I do for you!
                    </motion.span>
                  )}
                </AnimatePresence>
                <div className="relative w-full bg-white rounded-4xl">
                    {searchmode === "search by text" ? 
                    (<Input
                        type="text"
                        placeholder="在此搜索您脑海中的照片"
                        className="shadow-md w-full h-24 md:text-md text-md rounded-4xl pr-48 pb-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                        onChange={(e) => setInputValue(e.target.value)}
                    />):
                    (
                    <>
                    <Input
                        ref={imginputRef}
                        type="file" 
                        className="hidden"
                        onChange={handlepicturesearch}
                        accept="image/*"
                    />
                    <div
                        onClick={() => imginputRef.current?.click()} // 点击整个区域触发隐藏的 input
                        className="shadow-md w-full h-24 text-md border border-input bg-background bg-white rounded-4xl pr-48 cursor-pointer hover:bg-accent/50 transition-colors"
                    >   

                        <span className="absolute top-[18px] left-[13px] text-muted-foreground truncate">
                            点击这里上传并搜索图片... 
                        </span>
                    </div>
        </>
        )
                    }
                    <div className="absolute right-2 bottom-2 flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 px-4 py-2 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none">
                                    {model}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setmodel("pro")}>Pro</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setmodel("fast")}>Fast</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setmodel("balanced")}>Balanced</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={handleclick} className="h-10 rounded-full">
                            Search
                        </Button>
                    </div>
                    {!isSearched && (
                      <div className="absolute left-4 bottom-4 flex items-center gap-1">
                        <Switch
                        className="size-6"
                        id="searchmodeswitch"
                        checked={searchmode === "search by img"}
                        onCheckedChange={() => setsearchmode(searchmode === "search by img"? "search by text": "search by img")}
                        />
                        <Label htmlFor="searchmodeswitch">
                            {searchmode === "search by img"? "切换文搜图": "切换图搜图"}
                        </Label>
                      </div>
                    )}
                </div>
            </div>
            </motion.div>
        </div>
    )
}