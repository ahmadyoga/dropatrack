'use client';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <img
        src={imageUrl}
        alt="Preview"
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
      />
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-all font-bold text-xl"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        ✕
      </button>
    </div>
  );
}
