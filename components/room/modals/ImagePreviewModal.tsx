'use client';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  return (
    <div className="scrim" onClick={onClose} style={{ zIndex: 320 }}>
      <div className="popin" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <img
          src={imageUrl}
          alt="Preview"
          style={{
            maxWidth: '88vw', maxHeight: '82vh',
            borderRadius: 16, border: '4px solid var(--outline)',
            boxShadow: '10px 10px 0 var(--accent)',
          }}
        />
        <button
          className="btn btn-accent pop-sm btn-icon"
          onClick={onClose}
          style={{ position: 'absolute', top: -16, right: -16 }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
