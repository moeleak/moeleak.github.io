// source/js/win98.js

document.addEventListener('DOMContentLoaded', () => {
  const windowContainer = document.getElementById('window-container');
  let highestZIndex = 10;

  // --- Window Creation Function (Updated for 98.css & Mobile Position) ---
  function createWindow(title, contentUrl) {
    highestZIndex++;
    const windowId = `window-${Date.now()}`;

    const windowDiv = document.createElement('div');
    windowDiv.className = 'window';
    windowDiv.id = windowId;
    windowDiv.style.position = 'absolute'; // Crucial for positioning

    // --- Initial Position Calculation (Mobile Friendly) ---
    const initialWidth = 450;
    const initialHeight = 350;
    const margin = 10; // Minimum margin from viewport edges

    // Ensure dimensions don't exceed viewport size, especially on mobile
    const clampedWidth = Math.min(initialWidth, window.innerWidth - 2 * margin);
    const clampedHeight = Math.min(initialHeight, window.innerHeight - 2 * margin);

    const maxLeft = window.innerWidth - clampedWidth - margin;
    const maxTop = window.innerHeight - clampedHeight - margin - 30; // Account for potential top bars/notches

    // Calculate random position within safe bounds
    const randomLeft = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxLeft)));
    const randomTop = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxTop)));

    windowDiv.style.left = `${randomLeft}px`;
    windowDiv.style.top = `${randomTop}px`;
    windowDiv.style.width = `${clampedWidth}px`; // Use clamped width
    windowDiv.style.height = `${clampedHeight}px`; // Use clamped height
    windowDiv.style.zIndex = highestZIndex;

    // --- Title bar ---
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';

    const titleText = document.createElement('div');
    titleText.className = 'title-bar-text';
    titleText.textContent = title;
    titleBar.appendChild(titleText);

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'title-bar-controls';

    const closeButton = document.createElement('button');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.textContent = 'X';
    closeButton.onclick = () => {
      windowDiv.remove();
    };
    buttonsDiv.appendChild(closeButton);
    titleBar.appendChild(buttonsDiv);

    // --- Window content area ---
    const contentDiv = document.createElement('div');
    contentDiv.className = 'window-body';
    contentDiv.innerHTML = '<p>加载中...</p>'; // Use Chinese here
    // Scrolling is handled by CSS flexbox overflow in style.css

    windowDiv.appendChild(titleBar);
    windowDiv.appendChild(contentDiv);

    // --- Bring to front on interaction ---
    const bringToFront = () => {
      if (parseInt(windowDiv.style.zIndex) < highestZIndex) {
        highestZIndex++;
        windowDiv.style.zIndex = highestZIndex;
      }
    };
    // Use pointerdown for unified mouse/touch start
    windowDiv.addEventListener('pointerdown', bringToFront, true);


    // --- Make window draggable (Unified Mouse/Touch) ---
    makeDraggable(windowDiv, titleBar);

    // --- Make window resizable (Unified Mouse/Touch) ---
    const resizer = document.createElement('div');
    resizer.style.width = '15px'; // Slightly larger touch target
    resizer.style.height = '15px';
    resizer.style.position = 'absolute';
    resizer.style.right = '0';
    resizer.style.bottom = '0';
    resizer.style.cursor = 'nwse-resize';
    resizer.style.zIndex = '1';
    // Optional: Add a visual indicator for the handle if needed
    // resizer.style.backgroundColor = 'rgba(0,0,255,0.1)';
    windowDiv.appendChild(resizer);

    makeResizable(windowDiv, resizer);


    windowContainer.appendChild(windowDiv);

    // --- Load content ---
    if (contentUrl) {
      fetch(contentUrl)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP 错误！状态: ${response.status}`);
          return response.text();
        })
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const mainContent = doc.querySelector('#content-main');
          if (mainContent) {
            contentDiv.innerHTML = mainContent.innerHTML;
            setupWindowLinks(contentDiv); // Re-scan links inside loaded content
          } else {
            contentDiv.innerHTML = '<p>错误：在获取的页面中未找到内容结构。</p>';
            console.warn("无法在获取的 HTML 中找到选择器 '#content-main' 的元素:", contentUrl);
          }
        })
        .catch(error => {
          console.error('加载内容时出错:', error);
          contentDiv.innerHTML = `<p>加载内容出错: ${error.message}</p>`;
        });
    } else {
      contentDiv.innerHTML = '<p>未提供内容 URL。</p>';
    }

    return windowDiv;
  }

  function makeDraggable(element, handle) {
    let isDragging = false;
    let pointerId = null;
    let startX, startY, initialLeft, initialTop;

    // Define event handler functions beforehand
    // We need named functions to be able to remove them with the correct options

    const onPointerMove = (e) => {
      // Only react if we are dragging the correct pointer
      if (!isDragging || e.pointerId !== pointerId) return;

      // ---- CRITICAL: Prevent default touch actions DURING move ----
      // This might be necessary if the browser decides mid-drag
      // that the user might be trying to scroll.
      e.preventDefault();
      // e.stopPropagation(); // Optional: uncomment if issues persist

      // Calculate movement
      const currentX = e.clientX;
      const currentY = e.clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // Boundary checks (Keep fully on screen)
      const VpWidth = window.innerWidth;
      const VpHeight = window.innerHeight;
      const elWidth = element.offsetWidth;
      const elHeight = element.offsetHeight;

      newLeft = Math.max(0, Math.min(newLeft, VpWidth - elWidth));
      newTop = Math.max(0, Math.min(newTop, VpHeight - elHeight));
      // Ensure calculations are correct if window > viewport
      if (elWidth > VpWidth) {
        newLeft = 0; // Or center it: Math.max(0, VpWidth - elWidth);
      }
      if (elHeight > VpHeight) {
        newTop = 0; // Or center it: Math.max(0, VpHeight - elHeight);
      }


      // Apply position
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;

      // console.log(`Dragging: ${newLeft}, ${newTop}`); // DEBUG
    };

    const onPointerUp = (e) => {
      // Only react if ending the drag for the pointer we are tracking
      if (!isDragging || e.pointerId !== pointerId) return;

      isDragging = false;
      // console.log("Drag End"); // DEBUG

      // Restore styles
      handle.style.cursor = 'grab';
      element.style.removeProperty('user-select');
      document.body.style.removeProperty('user-select');
      document.body.classList.remove('is-dragging-window');

      // Release pointer capture
      if (handle.hasPointerCapture(pointerId)) {
        try {
          handle.releasePointerCapture(pointerId);
          // console.log("Pointer Capture Released"); // DEBUG
        } catch (err) {
          console.error("Error releasing pointer capture:", err);
        }
      }
      pointerId = null;

      // Remove global listeners WITH specific options for passive
      document.removeEventListener('pointermove', onPointerMove, { passive: false, capture: false }); // Ensure options match addEventListener
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);

      // Optional: Reset ondragstart if it was set
      // if (handle.ondragstart !== undefined) { handle.ondragstart = null; }
    };

    const onPointerDown = (e) => {
      // Ignore non-primary mouse button or touches on the resizer
      if ((e.pointerType === 'mouse' && e.button !== 0) || e.target.style.cursor === 'nwse-resize') {
        return;
      }

      isDragging = true;
      pointerId = e.pointerId;
      // console.log(`Drag Start - Pointer ID: ${pointerId}`); // DEBUG

      startX = e.clientX;
      startY = e.clientY;
      initialLeft = element.offsetLeft;
      initialTop = element.offsetTop;

      // Style changes
      handle.style.cursor = 'grabbing';
      element.style.userSelect = 'none';
      document.body.style.userSelect = 'none';
      document.body.classList.add('is-dragging-window');

      // Bring window to front
      if (typeof highestZIndex !== 'undefined' && parseInt(element.style.zIndex) < highestZIndex) {
        highestZIndex++;
        element.style.zIndex = highestZIndex;
      }

      // ---- CRITICAL: Prevent default actions & Stop Propagation ----
      e.preventDefault(); // Prevent scrolling, context menu, etc.
      e.stopPropagation(); // Stop event from bubbling up

      // Set touch-action explicitly on the handle (belt and suspenders)
      handle.style.touchAction = 'none';

      // Capture the pointer
      try {
        handle.setPointerCapture(pointerId);
        // console.log("Pointer Capture Set"); // DEBUG
      } catch (err) {
        console.error("Error setting pointer capture:", err);
      }

      // Add global listeners for move and up/cancel
      // ---- CRITICAL: Add listener with passive: false ----
      document.addEventListener('pointermove', onPointerMove, { passive: false, capture: false });
      document.addEventListener('pointerup', onPointerUp);       // passive default is fine here
      document.addEventListener('pointercancel', onPointerUp); // passive default is fine here

    }; // --- End of onPointerDown ---


    // Attach the initial listener to the handle element
    handle.addEventListener('pointerdown', onPointerDown);

    // Set initial cursor style
    handle.style.cursor = 'grab';

    // Prevent default image drag behavior (redundant but safe)
    if (handle.ondragstart !== undefined) {
      handle.ondragstart = () => false;
    }

  } // --- End of makeDraggable function ---

  // --- Unified Resizable Functionality (Mouse & Touch) ---
  function makeResizable(element, handle) {
    let isResizing = false;
    let startX, startY, initialWidth, initialHeight;

    const onPointerDown = (e) => {
      // Ignore if not left mouse button (for mouse)
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      initialWidth = element.offsetWidth;
      initialHeight = element.offsetHeight;

      // Global styles during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nwse-resize';

      // Bring window to front
      if (parseInt(element.style.zIndex) < highestZIndex) {
        highestZIndex++;
        element.style.zIndex = highestZIndex;
      }

      // Capture events on the handle itself
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);

      handle.setPointerCapture(e.pointerId); // Capture pointer events
      // Prevent default touch actions (like scrolling) when resizing
      if (e.pointerType === 'touch') {
        e.preventDefault();
      }
      handle.style.touchAction = 'none';
      e.stopPropagation(); // Prevent triggering drag start
    };

    const onPointerMove = (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = initialWidth + deltaX;
      let newHeight = initialHeight + deltaY;

      // Minimum size constraints
      const computedStyle = window.getComputedStyle(element);
      const minWidth = parseInt(computedStyle.minWidth || '150'); // Adjusted minimums
      const minHeight = parseInt(computedStyle.minHeight || '100');

      newWidth = Math.max(minWidth, newWidth);
      newHeight = Math.max(minHeight, newHeight);

      // Apply new dimensions
      element.style.width = `${newWidth}px`;
      element.style.height = `${newHeight}px`;

      // Prevent page scroll during resize via touch
      if (e.pointerType === 'touch') {
        e.preventDefault();
      }
    };

    const onPointerUp = (e) => {
      if (!isResizing) return;

      isResizing = false;
      // Restore global styles
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');

      // Release event listeners and capture
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      handle.releasePointerCapture(e.pointerId);
    };

    handle.addEventListener('pointerdown', onPointerDown);
    // Prevent default drag behavior on the handle
    handle.ondragstart = () => false;
  }


  // --- Link Handling (Refined Selector - ensure it matches your intent) ---
  function setupWindowLinks(parentElement = document) {
    // Select links that should open in a window.
    // This example targets:
    // 1. Desktop icons with 'data-window-title'
    // 2. Internal links starting with '/' BUT NOT just '/' (homepage)
    // 3. Exclude links with class 'no-window' (add this class if needed)
    const windowLinks = parentElement.querySelectorAll(
      'a.desktop-icon[data-window-title], a[href^="/"]:not([href="/"]):not(.no-window)'
    );

    windowLinks.forEach(link => {
      // Prevent adding listener multiple times if content is reloaded/rescanned
      if (link.dataset.windowListenerAttached) return;

      link.addEventListener('click', (event) => {
        event.preventDefault(); // Stop default navigation
        const url = link.getAttribute('href');
        const title = link.dataset.windowTitle || link.textContent.trim() || '窗口'; // Default title

        // --- Check if window for this URL already exists ---
        let existingWindow = null;
        const windows = windowContainer.querySelectorAll('.window');
        for (let win of windows) {
          if (win.dataset.contentUrl === url) {
            existingWindow = win;
            break;
          }
        }

        if (existingWindow) {
          // Bring existing window to front and shake it
          highestZIndex++;
          existingWindow.style.zIndex = highestZIndex;
          existingWindow.classList.add('window-shake');
          setTimeout(() => existingWindow.classList.remove('window-shake'), 300);
        } else {
          // Create a new window
          const newWindow = createWindow(title, url);
          newWindow.dataset.contentUrl = url; // Store URL for checking later
        }
      });
      link.dataset.windowListenerAttached = 'true'; // Mark as processed
    });
  }

  // --- Initial Setup ---
  setupWindowLinks(); // Setup links on the main page

  // --- Add CSS for shake animation and global drag style ---
  // (Keep the existing style injection part, it's fine)
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
.window-shake { animation: shake 0.3s ease-in-out; }
body.is-dragging-window { user-select: none; -webkit-user-select: none; } /* Prevent text selection page-wide during drag */
`;
  document.head.appendChild(styleSheet);

});

