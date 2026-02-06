// stamp-inject.js
// Injected into claude.ai WebContentsView
// Intercepts message submission, prepends stamp

const { ipcRenderer } = require('electron');

let currentStamp = '';

// Listen for stamp updates from main process
ipcRenderer.on('stamp-update', (event, stamp) => {
  currentStamp = stamp;
  updateStampOverlay();
});

function updateStampOverlay() {
  let overlay = document.getElementById('gently-stamp-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gently-stamp-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(8,8,12,0.9);
      border: 1px solid rgba(0,229,160,0.2);
      border-radius: 4px;
      padding: 4px 10px;
      font-family: monospace;
      font-size: 9px;
      color: rgba(0,229,160,0.6);
      z-index: 99999;
      pointer-events: none;
      max-width: 600px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    document.body.appendChild(overlay);
  }
  overlay.textContent = currentStamp;
}

// Intercept message submission
function interceptSubmit() {
  // Watch for the submit button / Enter key in claude.ai's input
  const observer = new MutationObserver(() => {
    const textarea = document.querySelector('div[contenteditable="true"], textarea[placeholder]');
    if (textarea && !textarea._gentlyPatched) {
      textarea._gentlyPatched = true;

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && currentStamp) {
          // Prepend stamp to the message
          const content = textarea.textContent || textarea.value || '';
          if (!content.startsWith('[OLO|')) {
            const stamped = `${currentStamp}\n${content}`;
            if (textarea.textContent !== undefined) {
              textarea.textContent = stamped;
            } else {
              textarea.value = stamped;
            }
            // Dispatch input event so claude.ai picks up the change
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Wait for page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', interceptSubmit);
} else {
  interceptSubmit();
}
