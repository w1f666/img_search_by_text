import { create } from "zustand"; 

interface TopbarState{
    isSearched: boolean,
    SetisSearched: (v:boolean) => void,
    Deletechat: () => void,
    Keywords: string,
    SetKeywords: (v:string) => void,
}

export const useTopbarNameStore = create<TopbarState>((set) => ({
    isSearched: false,
    SetisSearched: (value: boolean) => set({isSearched: value}),
    Deletechat: () => set({isSearched: false, Keywords: ""}),
    Keywords: "",
    SetKeywords: (value: string) => set({Keywords: value}),
}))