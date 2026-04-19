/**
 * EcoScan Camera Scanner Overlay
 * Adds a floating camera button + fullscreen barcode scanner
 * Uses native BarcodeDetector API (with fallback)
 */
(function() {
  'use strict';

  // Wait for Flutter to load, then inject UI
  let retries = 0;
  const waitForApp = setInterval(() => {
    retries++;
    if (retries > 50 || document.querySelector('flt-glass-pane') || document.querySelector('flutter-view')) {
      clearInterval(waitForApp);
      setTimeout(initScanner, 500);
    }
  }, 200);

  function initScanner() {
    injectStyles();
    createFAB();
    createScannerOverlay();
    requestNotificationPermission();
  }

  // ============ STYLES ============
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #eco-camera-fab {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #2E7D32, #4CAF50);
        border: none;
        box-shadow: 0 4px 20px rgba(76,175,80,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 9998;
        transition: transform 0.2s, box-shadow 0.2s;
        -webkit-tap-highlight-color: transparent;
      }
      #eco-camera-fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 28px rgba(76,175,80,0.7);
      }
      #eco-camera-fab:active {
        transform: scale(0.95);
      }
      #eco-camera-fab svg {
        width: 28px;
        height: 28px;
        fill: white;
      }

      #eco-scanner-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: #000;
        display: none;
        flex-direction: column;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      #eco-scanner-overlay.active {
        display: flex;
        opacity: 1;
      }

      #eco-scanner-header {
        position: absolute;
        top: 0; left: 0; right: 0;
        padding: 50px 20px 15px;
        background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 3;
      }
      #eco-scanner-header h2 {
        color: #fff;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 1.1rem;
        font-weight: 600;
      }
      .eco-scanner-btn {
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        font-family: 'Inter', -apple-system, sans-serif;
        -webkit-tap-highlight-color: transparent;
      }
      .eco-scanner-btn:active {
        background: rgba(255,255,255,0.3);
      }

      #eco-video-container {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      #eco-scanner-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #eco-scan-frame {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 250px; height: 250px;
        z-index: 2;
      }
      #eco-scan-frame::before,
      #eco-scan-frame::after,
      #eco-scan-frame .corner-bl,
      #eco-scan-frame .corner-br {
        content: '';
        position: absolute;
        width: 30px; height: 30px;
        border-color: #4CAF50;
        border-style: solid;
        border-width: 0;
      }
      #eco-scan-frame::before {
        top: 0; left: 0;
        border-top-width: 3px; border-left-width: 3px;
        border-radius: 4px 0 0 0;
      }
      #eco-scan-frame::after {
        top: 0; right: 0;
        border-top-width: 3px; border-right-width: 3px;
        border-radius: 0 4px 0 0;
      }
      #eco-scan-frame .corner-bl {
        bottom: 0; left: 0;
        border-bottom-width: 3px; border-left-width: 3px;
        border-radius: 0 0 0 4px;
      }
      #eco-scan-frame .corner-br {
        bottom: 0; right: 0;
        border-bottom-width: 3px; border-right-width: 3px;
        border-radius: 0 0 4px 0;
      }

      #eco-scan-line {
        position: absolute;
        left: 10%; right: 10%;
        height: 2px;
        background: linear-gradient(90deg, transparent, #4CAF50, transparent);
        box-shadow: 0 0 8px rgba(76,175,80,0.8);
        animation: eco-scan-anim 2s ease-in-out infinite;
        z-index: 2;
      }
      @keyframes eco-scan-anim {
        0%, 100% { top: 10%; }
        50% { top: 90%; }
      }

      #eco-scan-hint {
        position: absolute;
        bottom: 30%;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255,255,255,0.8);
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 0.85rem;
        text-align: center;
        z-index: 2;
        text-shadow: 0 1px 4px rgba(0,0,0,0.5);
      }

      #eco-scanner-bottom {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        padding: 20px;
        padding-bottom: 40px;
        background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        display: flex;
        align-items: center;
        justify-content: space-around;
        z-index: 3;
      }

      .eco-bottom-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-family: 'Inter', -apple-system, sans-serif;
        -webkit-tap-highlight-color: transparent;
      }
      .eco-bottom-btn .icon-circle {
        width: 50px; height: 50px;
        border-radius: 50%;
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.3rem;
        transition: background 0.2s;
      }
      .eco-bottom-btn:active .icon-circle {
        background: rgba(255,255,255,0.3);
      }
      .eco-bottom-btn .icon-circle.capture {
        width: 65px; height: 65px;
        background: white;
        border: 4px solid rgba(76,175,80,0.8);
      }
      .eco-bottom-btn span {
        font-size: 0.7rem;
        opacity: 0.7;
      }

      /* Result popup */
      #eco-scan-result {
        position: fixed;
        bottom: 120px;
        left: 20px; right: 20px;
        background: rgba(30,50,30,0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(76,175,80,0.4);
        border-radius: 16px;
        padding: 16px 20px;
        z-index: 100000;
        display: none;
        animation: eco-slide-up 0.3s ease;
      }
      @keyframes eco-slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #eco-scan-result h4 {
        color: #4CAF50;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 0.85rem;
        margin-bottom: 4px;
      }
      #eco-scan-result p {
        color: #e8f5e9;
        font-family: 'Inter', monospace;
        font-size: 1rem;
        word-break: break-all;
      }
      #eco-scan-result .result-actions {
        display: flex; gap: 8px; margin-top: 10px;
      }
      #eco-scan-result .result-btn {
        flex: 1;
        padding: 8px;
        border-radius: 8px;
        border: none;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        font-family: 'Inter', -apple-system, sans-serif;
      }
      #eco-scan-result .result-btn.copy {
        background: rgba(76,175,80,0.2);
        color: #4CAF50;
        border: 1px solid rgba(76,175,80,0.4);
      }
      #eco-scan-result .result-btn.close {
        background: rgba(255,255,255,0.1);
        color: #aaa;
      }

      /* Photo preview */
      #eco-photo-preview {
        position: fixed;
        inset: 0;
        z-index: 100001;
        background: rgba(0,0,0,0.95);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
      }
      #eco-photo-preview img {
        max-width: 90%;
        max-height: 60vh;
        border-radius: 12px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.5);
      }
      #eco-photo-preview .actions {
        display: flex; gap: 12px;
      }
      #eco-photo-preview .actions button {
        padding: 10px 24px;
        border-radius: 10px;
        border: none;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        font-family: 'Inter', -apple-system, sans-serif;
      }
      #eco-photo-preview .save-btn {
        background: linear-gradient(135deg, #2E7D32, #4CAF50);
        color: white;
      }
      #eco-photo-preview .discard-btn {
        background: rgba(255,255,255,0.1);
        color: #ccc;
      }
    `;
    document.head.appendChild(style);
  }

  // ============ FAB BUTTON ============
  function createFAB() {
    const fab = document.createElement('button');
    fab.id = 'eco-camera-fab';
    fab.setAttribute('aria-label', 'Scanner öffnen');
    fab.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>`;
    fab.addEventListener('click', openScanner);
    document.body.appendChild(fab);
  }

  // ============ SCANNER OVERLAY ============
  let videoStream = null;
  let scanInterval = null;
  let barcodeDetector = null;

  function createScannerOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'eco-scanner-overlay';
    overlay.innerHTML = `
      <div id="eco-scanner-header">
        <h2>🌿 EcoScan</h2>
        <button class="eco-scanner-btn" id="eco-close-scanner">✕ Schließen</button>
      </div>
      <div id="eco-video-container">
        <video id="eco-scanner-video" autoplay playsinline muted></video>
        <div id="eco-scan-frame">
          <div class="corner-bl"></div>
          <div class="corner-br"></div>
        </div>
        <div id="eco-scan-line"></div>
        <div id="eco-scan-hint">Barcode oder QR-Code in den Rahmen halten</div>
      </div>
      <div id="eco-scanner-bottom">
        <button class="eco-bottom-btn" id="eco-flash-btn">
          <div class="icon-circle">🔦</div>
          <span>Licht</span>
        </button>
        <button class="eco-bottom-btn" id="eco-capture-btn">
          <div class="icon-circle capture">📸</div>
          <span>Foto</span>
        </button>
        <button class="eco-bottom-btn" id="eco-gallery-btn">
          <div class="icon-circle">🖼️</div>
          <span>Galerie</span>
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Result popup
    const result = document.createElement('div');
    result.id = 'eco-scan-result';
    result.innerHTML = `
      <h4>✅ Code erkannt</h4>
      <p id="eco-result-text"></p>
      <div class="result-actions">
        <button class="result-btn copy" id="eco-result-copy">📋 Kopieren</button>
        <button class="result-btn close" id="eco-result-close">Schließen</button>
      </div>
    `;
    document.body.appendChild(result);

    // Photo preview
    const preview = document.createElement('div');
    preview.id = 'eco-photo-preview';
    preview.innerHTML = `
      <img id="eco-preview-img" src="" alt="Foto">
      <div class="actions">
        <button class="save-btn" id="eco-photo-save">💾 Speichern</button>
        <button class="discard-btn" id="eco-photo-discard">✕ Verwerfen</button>
      </div>
    `;
    document.body.appendChild(preview);

    // Event listeners
    document.getElementById('eco-close-scanner').addEventListener('click', closeScanner);
    document.getElementById('eco-capture-btn').addEventListener('click', capturePhoto);
    document.getElementById('eco-flash-btn').addEventListener('click', toggleFlash);
    document.getElementById('eco-gallery-btn').addEventListener('click', openGallery);
    document.getElementById('eco-result-copy').addEventListener('click', copyResult);
    document.getElementById('eco-result-close').addEventListener('click', () => {
      document.getElementById('eco-scan-result').style.display = 'none';
    });
    document.getElementById('eco-photo-save').addEventListener('click', savePhoto);
    document.getElementById('eco-photo-discard').addEventListener('click', () => {
      document.getElementById('eco-photo-preview').style.display = 'none';
    });

    // Init BarcodeDetector if available
    if ('BarcodeDetector' in window) {
      barcodeDetector = new BarcodeDetector({
        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'data_matrix', 'pdf417']
      });
    }
  }

  // ============ OPEN/CLOSE SCANNER ============
  async function openScanner() {
    const overlay = document.getElementById('eco-scanner-overlay');
    const video = document.getElementById('eco-scanner-video');

    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      video.srcObject = videoStream;
      overlay.classList.add('active');

      // Start barcode scanning
      if (barcodeDetector) {
        scanInterval = setInterval(() => detectBarcode(video), 500);
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Kamera-Zugriff fehlgeschlagen. Bitte erlaube den Zugriff in den Einstellungen.');
    }
  }

  function closeScanner() {
    const overlay = document.getElementById('eco-scanner-overlay');
    overlay.classList.remove('active');
    document.getElementById('eco-scan-result').style.display = 'none';

    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      videoStream = null;
    }
  }

  // ============ BARCODE DETECTION ============
  async function detectBarcode(video) {
    if (!barcodeDetector || !videoStream) return;
    try {
      const barcodes = await barcodeDetector.detect(video);
      if (barcodes.length > 0) {
        const code = barcodes[0];
        showResult(code.rawValue, code.format);
        // Vibrate feedback
        if (navigator.vibrate) navigator.vibrate(100);
      }
    } catch (e) {
      // Silent fail
    }
  }

  function showResult(value, format) {
    const resultEl = document.getElementById('eco-scan-result');
    const textEl = document.getElementById('eco-result-text');
    textEl.textContent = value;
    document.querySelector('#eco-scan-result h4').textContent = 
      `✅ ${formatLabel(format)} erkannt`;
    resultEl.style.display = 'block';

    // Save to history
    saveToHistory(value, format);
  }

  function formatLabel(format) {
    const labels = {
      'qr_code': 'QR-Code',
      'ean_13': 'EAN-13 Barcode',
      'ean_8': 'EAN-8 Barcode',
      'code_128': 'Code 128',
      'code_39': 'Code 39',
      'upc_a': 'UPC-A',
      'upc_e': 'UPC-E',
      'data_matrix': 'Data Matrix',
      'pdf417': 'PDF417'
    };
    return labels[format] || 'Code';
  }

  // ============ PHOTO CAPTURE ============
  function capturePhoto() {
    const video = document.getElementById('eco-scanner-video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const preview = document.getElementById('eco-photo-preview');
    const img = document.getElementById('eco-preview-img');
    img.src = dataUrl;
    preview.style.display = 'flex';
  }

  function savePhoto() {
    const img = document.getElementById('eco-preview-img');
    const link = document.createElement('a');
    link.download = `ecoscan_${Date.now()}.jpg`;
    link.href = img.src;
    link.click();
    document.getElementById('eco-photo-preview').style.display = 'none';
  }

  // ============ FLASH ============
  let flashOn = false;
  async function toggleFlash() {
    if (!videoStream) return;
    const track = videoStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities?.();
    if (capabilities && capabilities.torch) {
      flashOn = !flashOn;
      await track.applyConstraints({ advanced: [{ torch: flashOn }] });
      document.querySelector('#eco-flash-btn .icon-circle').textContent = flashOn ? '💡' : '🔦';
    } else {
      alert('Taschenlampe wird auf diesem Gerät nicht unterstützt.');
    }
  }

  // ============ GALLERY ============
  function openGallery() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = await createImageBitmap(file);
      if (barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(img);
          if (barcodes.length > 0) {
            showResult(barcodes[0].rawValue, barcodes[0].format);
          } else {
            alert('Kein Barcode im Bild erkannt.');
          }
        } catch (err) {
          alert('Fehler beim Scannen des Bildes.');
        }
      }
    });
    input.click();
  }

  // ============ COPY ============
  function copyResult() {
    const text = document.getElementById('eco-result-text').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('eco-result-copy');
      btn.textContent = '✓ Kopiert!';
      setTimeout(() => { btn.textContent = '📋 Kopieren'; }, 2000);
    });
  }

  // ============ HISTORY (localStorage) ============
  function saveToHistory(value, format) {
    try {
      const history = JSON.parse(localStorage.getItem('ecoscan_history') || '[]');
      history.unshift({ value, format, date: new Date().toISOString() });
      if (history.length > 50) history.pop();
      localStorage.setItem('ecoscan_history', JSON.stringify(history));
    } catch (e) {}
  }

  // ============ NOTIFICATIONS ============
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      // Request after a small delay so it doesn't annoy immediately
      setTimeout(() => {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification('EcoScan 🌿', {
              body: 'Benachrichtigungen aktiviert! Wir erinnern dich an ablaufende Lebensmittel.',
              icon: 'icons/Icon-192.png'
            });
          }
        });
      }, 5000);
    }
  }

})();
