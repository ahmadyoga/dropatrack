'use client';

import Modal from '../ui/Modal';
import Icon from '../ui/Icon';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  return (
    <Modal onClose={onClose} label="Image preview" zIndex={320} style={{ position: 'relative' }}>
      <img
        src={imageUrl}
        alt="Shared image, full size"
        style={{
          maxWidth: '88vw', maxHeight: '82vh',
          borderRadius: 16, border: '4px solid var(--outline)',
          boxShadow: '9px 9px 0 var(--shadow)',
        }}
      />
      <button
        type="button"
        className="btn pop-sm btn-icon"
        onClick={onClose}
        aria-label="Close preview"
        style={{ position: 'absolute', top: -16, right: -16, width: 44, height: 44, padding: 0 }}
      >
        <Icon name="close" size={18} />
      </button>
    </Modal>
  );
}
