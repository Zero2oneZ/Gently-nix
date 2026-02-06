// Content script injected into claude.ai webviews
// Intercepts message input to prepend stamps

(function() {
  'use strict';

  let currentStamp = '';

  // Listen for stamp updates from main process
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'gently-stamp-update') {
      currentStamp = event.data.stamp;
    }
  });

  // Find the message input textarea
  function findMessageInput() {
    // Claude.ai uses a contenteditable div or textarea
    // Selectors may need updating if Claude changes their UI
    return document.querySelector('[data-placeholder*="message"]') ||
           document.querySelector('textarea[placeholder*="message"]') ||
           document.querySelector('.ProseMirror') ||
           document.querySelector('[contenteditable="true"]');
  }

  // Intercept form submission
  function interceptSubmit() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      if (!currentStamp) return;

      const input = findMessageInput();
      if (!input) return;

      // Prepend stamp to message
      if (input.tagName === 'TEXTAREA') {
        input.value = `${currentStamp}\n\n${input.value}`;
      } else if (input.contentEditable === 'true') {
        const stampNode = document.createTextNode(`${currentStamp}\n\n`);
        input.insertBefore(stampNode, input.firstChild);
      }
    }, true);
  }

  // Wait for page to load
  function init() {
    interceptSubmit();

    // Re-attach on navigation (SPA)
    const observer = new MutationObserver(() => {
      interceptSubmit();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
