import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Icon } from "@/components/ui/icon";
import { Camera, Trash2, Plus, ImageIcon, CheckCircle } from "lucide-react";
import type { BookingPhoto } from "@shared/schema";

interface PhotoUploadPanelProps {
  bookingId: number;
  status: string; // 'assigned' | 'in_progress' | 'completed'
  showSection?: 'before' | 'after' | 'both';
}

function compressImage(file: File, maxWidthPx = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidthPx) {
          height = Math.round((height * maxWidthPx) / width);
          width = maxWidthPx;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PhotoGrid({
  photos,
  onDelete,
  canDelete,
}: {
  photos: BookingPhoto[];
  onDelete: (id: number) => void;
  canDelete: boolean;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 mt-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
            <img
              src={photo.dataUrl}
              alt={photo.photoType}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightbox(photo.dataUrl)}
            />
            {canDelete && (
              <button
                onClick={() => onDelete(photo.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon icon={Trash2} size="xs" className="text-white" />
              </button>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
}

function UploadButton({
  photoType,
  bookingId,
  disabled,
}: {
  photoType: "before" | "after";
  bookingId: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (dataUrl: string) =>
      apiRequest("POST", `/api/bookings/${bookingId}/photos`, { photoType, dataUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", bookingId, "photos"] });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      await uploadMutation.mutateAsync(dataUrl);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-[#8c52ff] hover:text-[#8c52ff] transition-colors disabled:opacity-50"
      >
        <Icon icon={uploading ? Camera : Plus} size="xs" />
        {uploading ? "Uploading…" : "Add photo"}
      </button>
    </>
  );
}

export default function PhotoUploadPanel({ bookingId, status, showSection = 'both' }: PhotoUploadPanelProps) {
  const { data: photos = [], isLoading } = useQuery<BookingPhoto[]>({
    queryKey: ["/api/bookings", bookingId, "photos"],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/photos`);
      if (!res.ok) throw new Error("Failed to fetch photos");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: number) =>
      apiRequest("DELETE", `/api/bookings/${bookingId}/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", bookingId, "photos"] });
    },
  });

  const beforePhotos = photos.filter((p) => p.photoType === "before");
  const afterPhotos = photos.filter((p) => p.photoType === "after");

  const canUpload = status === "assigned" || status === "in_progress";
  const isCompleted = status === "completed";

  if (isLoading) return null;

  return (
    <div className="mt-4 rounded-xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-100">
        <Icon icon={ImageIcon} size="sm" className="text-[#8c52ff]" />
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Job Photos</p>
        {isCompleted && photos.length > 0 && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium">
            <Icon icon={CheckCircle} size="xs" />
            {photos.length} saved
          </span>
        )}
      </div>

      <div className="p-4 space-y-5 bg-white">
        {/* Before section */}
        {(showSection === 'both' || showSection === 'before') && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Before</span>
              {canUpload && <UploadButton photoType="before" bookingId={bookingId} />}
            </div>
            {beforePhotos.length === 0 ? (
              <p className="text-xs text-gray-400 italic mt-2">
                {canUpload ? "Capture vehicle condition before starting service." : "No before photos captured."}
              </p>
            ) : (
              <PhotoGrid
                photos={beforePhotos}
                onDelete={(id) => deleteMutation.mutate(id)}
                canDelete={canUpload}
              />
            )}
          </div>
        )}

        {/* Divider — only when showing both */}
        {showSection === 'both' && <div className="border-t border-gray-100" />}

        {/* After section */}
        {(showSection === 'both' || showSection === 'after') && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">After</span>
              {canUpload && <UploadButton photoType="after" bookingId={bookingId} />}
            </div>
            {afterPhotos.length === 0 ? (
              <p className="text-xs text-gray-400 italic mt-2">
                {canUpload ? "Upload after photos to complete the quality check." : "No after photos captured."}
              </p>
            ) : (
              <PhotoGrid
                photos={afterPhotos}
                onDelete={(id) => deleteMutation.mutate(id)}
                canDelete={canUpload}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
