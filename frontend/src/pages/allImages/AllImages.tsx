import { ImageCard, type ImageItem } from "../customcomponents/ui/imagecard";
import { PageHeader } from "../customcomponents/ui/PageHeader";
import { ImageGrid } from "../customcomponents/ui/ImageGrid";

export default function AllImages() {
  const mockImages: ImageItem[] = [
    {
      id: "1",
      url: "public/gallery/landscapes/IMG_8200.JPG",
      filename: "photo-1.jpg",
      createdAt: "2023-10-27",
      size: "3.2 MB",
    },
    {
      id: "2",
      url: "public/gallery/landscapes/IMG_8200.JPG",
      filename: "photo-2.jpg",
      createdAt: "2023-10-28",
      size: "4.1 MB",
    },
    {
      id: "3",
      url: "public/gallery/landscapes/IMG_8200.JPG",
      filename: "photo-3.jpg",
      createdAt: "2023-10-29",
      size: "2.8 MB",
    },
    {
      id: "4",
      url: "public/gallery/landscapes/IMG_8200.JPG",
      filename: "photo-4.jpg",
      createdAt: "2023-10-30",
      size: "5.0 MB",
    }
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      <PageHeader title="所有照片" description="在此管理您的所有图片" />
      <ImageGrid>
        {mockImages.map((img) => (
          <ImageCard key={img.id} image={img} />
        ))}
      </ImageGrid>
    </div>
  );
}