import { useEffect, useState } from 'react';

interface ImagePreloaderProps {
  imagePaths: string[];
  children: React.ReactNode;
}

export function ImagePreloader({ imagePaths, children }: ImagePreloaderProps) {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const imagePromises = imagePaths.map((path) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = path;
            img.onload = resolve;
            img.onerror = reject;
          });
        });

        await Promise.all(imagePromises);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Failed to preload images:', error);
        // If images fail to load, still show content
        setImagesLoaded(true);
      }
    };

    loadImages();
  }, [imagePaths]);

  if (!imagesLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="rounded-full h-12 w-12 border-4 border-[#8c52ff] border-t-transparent animate-spin"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading resources...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}