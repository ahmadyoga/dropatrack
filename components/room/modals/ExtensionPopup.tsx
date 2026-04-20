'use client';

interface ExtensionPopupProps {
  onClose: () => void;
}

export default function ExtensionPopup({ onClose }: ExtensionPopupProps) {
  return (
    <div className="modal-overlay">
      <div className="ext-modal">
        <div className="ext-modal-header">
          <h3 className="ext-modal-title"><span>🧩</span> Install DropATrack Extension</h3>
          <button onClick={onClose} className="ext-close-btn">✕</button>
        </div>

        <div style={{ backgroundColor: '#2d1a1a', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', margin: '0px 0px 16px', color: '#fca5a5', fontSize: '13px' }}>
          <strong>⚠️ Peringatan Penting</strong><br />
          Jika kamu memiliki feedback atau menemukan bug, silakan perbaiki sendiri. Kami open-source!<br />
          Kunjungi repo GitHub kami:{' '}
          <a href="https://github.com/ahmadyoga/dropatrack" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: '#f87171', fontWeight: 'bold' }}>
            GitHub DropATrack
          </a>.<br /><br />
          <em>&quot;tidak menerima wong ruwet, gaweo dewe bug/feature,e&quot;</em>
        </div>

        <div className="ext-modal-desc">
          Add YouTube &amp; YouTube Music tracks to this room directly from the browser! Install our Chrome extension in 3 easy steps:
        </div>

        <div className="ext-steps">
          <div className="ext-step">
            <div className="ext-step-num">1</div>
            <div className="ext-step-info">
              <div className="ext-step-title">Download the extension</div>
              <a href="/extension.zip" download className="ext-dl-btn">📦 Download ZIP</a>
            </div>
          </div>
          <div className="ext-step">
            <div className="ext-step-num">2</div>
            <div className="ext-step-info">
              <div className="ext-step-title">Unzip & open Extensions page</div>
              <div className="ext-step-text">
                Extract the ZIP, then go to <code className="ext-code">chrome://extensions</code><br />
                Turn on <strong>Developer mode</strong> (top right)
              </div>
            </div>
          </div>
          <div className="ext-step">
            <div className="ext-step-num">3</div>
            <div className="ext-step-info">
              <div className="ext-step-title">Load the extension</div>
              <div className="ext-step-text" style={{ paddingBottom: 6 }}>
                Click <strong>&quot;Load unpacked&quot;</strong> and select the unzipped <code className="ext-code">extension</code> folder.
              </div>
              <div className="ext-step-text" style={{ color: '#4ade80' }}>
                Done! Open any YouTube or YouTube Music playlist/queue and the DropATrack buttons will appear 🎉
              </div>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="ext-cta-btn">Got it, let&apos;s go! 🎵</button>
      </div>
    </div>
  );
}
