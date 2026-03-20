import { create } from "zustand"; 

interface TopbarState{
    isSearched: boolean,
    SetisSearched: (v:boolean) => void,
    Keywords: string,
    SetKeywords: (v:string) => void,
}

export const useTopbarNameStore = create<TopbarState>((set) => ({
    isSearched: false,
    SetisSearched: (value: boolean) => set({isSearched: value}),
    Keywords: "",
    SetKeywords: (value: string) => set({Keywords: value}),
}))