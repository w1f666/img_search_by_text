import { ImageCard, type ImageItem } from "../customcomponents/ui/imagecard";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { ImageGrid } from "../customcomponents/ui/ImageGrid";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Trash2 } from "lucide-react";

export default function Trash() {
  const mockImages: ImageItem[] = [
    { id: "5", url: "public/gallery/landscapes/IMG_8203.JPG", filename: "deleted1.jpg", createdAt: "2023-10-25", size: "2.1 MB" },
    { id: "6", url: "public/gallery/landscapes/IMG_8200.JPG", filename: "deleted2.jpg", createdAt: "2023-10-26", size: "1.8 MB" }
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      <PageHeader title="回收站" description="The items will be deleted permanently after 30 days." />
      <ImageGrid>
        {mockImages.map((img) => (
          <ImageCard 
            key={img.id} 
            image={img} 
            actionMask={
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/40" onClick={(e) => { e.stopPropagation(); console.log('restore', img.id) }}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-red-500/80 text-white hover:bg-red-500" onClick={(e) => { e.stopPropagation(); console.log('permanent delete', img.id) }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            }
          />
        ))}
        {mockImages.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No items in Trash.
          </div>
        )}
        </ImageGrid>
    </div>
  );
}
