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
    // Store pointerId to manage capture correctly
    let pointerId = null;
    let startX, startY, initialLeft, initialTop;

    // --- Event Handler: Pointer Down ---
    const onPointerDown = (e) => {
      // Ignore if not the primary button (e.g., right-click) for mouse
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Ignore if the event target is the resizer handle (important!)
      // Check based on the cursor style assigned in createWindow
      if (e.target.style.cursor === 'nwse-resize') return;

      isDragging = true;
      pointerId = e.pointerId; // Store the ID of the pointer initiating the drag

      // Record starting positions
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = element.offsetLeft;
      initialTop = element.offsetTop;

      // --- Style changes to indicate dragging ---
      handle.style.cursor = 'grabbing'; // Feedback on the handle
      element.style.userSelect = 'none'; // Prevent text selection *in* the window
      document.body.style.userSelect = 'none'; // Prevent text selection *outside* the window
      document.body.classList.add('is-dragging-window'); // Optional global style hook

      // --- Bring window to front ---
      // Assumes highestZIndex is accessible in this scope
      if (typeof highestZIndex !== 'undefined' && parseInt(element.style.zIndex) < highestZIndex) {
        highestZIndex++;
        element.style.zIndex = highestZIndex;
      }

      // --- Capture the pointer ---
      // Crucial: Ensures subsequent events for *this specific pointer interaction*
      // are directed to 'handle', even if the pointer moves outside its bounds.
      try {
        handle.setPointerCapture(pointerId);
      } catch (err) {
        console.error("Error setting pointer capture:", err);
        // Might fail if the element is not suitable for capture, but usually works on DOM elements.
      }


      // --- Attach move and up listeners to the *document* ---
      // Listening globally ensures we track movement regardless of cursor position.
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp); // Handle interruptions

      // --- Prevent Default Browser Actions ---
      // This is vital for touch interaction to prevent page scrolling, zooming, etc.
      // Calling it in 'pointerdown' is often necessary to stop the browser
      // from initiating its own gesture handling.
      e.preventDefault();

      // Also explicitly prevent default drag behavior (e.g., image ghosting)
      // The 'dragstart' event might still fire without this in some cases.
      if (handle.ondragstart !== undefined) { // Check if event exists
        handle.ondragstart = () => false;
      }

    }; // --- End of onPointerDown ---

    // --- Event Handler: Pointer Move ---
    const onPointerMove = (e) => {
      // Only react if we are dragging and the event is from the correct pointer
      if (!isDragging || e.pointerId !== pointerId) return;

      // Calculate the distance moved
      const currentX = e.clientX;
      const currentY = e.clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // Calculate the new theoretical top-left position
      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // --- Boundary Checks (Keep the window fully within the viewport) ---
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      // Get the element's current dimensions dynamically as they might change (though unlikely during drag)
      const elementWidth = element.offsetWidth;
      const elementHeight = element.offsetHeight;

      // Clamp the left position (prevent moving past left edge 0)
      newLeft = Math.max(0, newLeft);
      // Clamp the top position (prevent moving past top edge 0)
      newTop = Math.max(0, newTop);

      // Clamp the left position based on the right edge (prevent moving past right edge)
      // Ensure the calculation works even if element is wider than viewport
      newLeft = Math.min(newLeft, Math.max(0, viewportWidth - elementWidth)); // Use max(0, ...) to prevent negative offset if wider

      // Clamp the top position based on the bottom edge (prevent moving past bottom edge)
      // Ensure the calculation works even if element is taller than viewport
      newTop = Math.min(newTop, Math.max(0, viewportHeight - elementHeight)); // Use max(0, ...) to prevent negative offset if taller


      // Apply the constrained position
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;

      // --- Prevent Default Actions (during move) ---
      // Continue to prevent default actions like text selection or scrolling during the move.
      e.preventDefault();

    }; // --- End of onPointerMove ---

    // --- Event Handler: Pointer Up / Cancel ---
    const onPointerUp = (e) => {
      // Only react if ending the drag for the pointer we are tracking
      if (!isDragging || e.pointerId !== pointerId) return;

      isDragging = false;

      // --- Restore styles ---
      handle.style.cursor = 'grab'; // Reset handle cursor
      element.style.removeProperty('user-select'); // Re-enable text selection in window
      document.body.style.removeProperty('user-select'); // Re-enable text selection on page
      document.body.classList.remove('is-dragging-window'); // Remove global style hook

      // --- Release pointer capture ---
      // Important to release the capture so other elements can receive pointer events normally.
      // Check if the element still holds the capture before releasing to avoid errors.
      if (handle.hasPointerCapture(pointerId)) {
        try {
          handle.releasePointerCapture(pointerId);
        } catch (err) {
          console.error("Error releasing pointer capture:", err);
        }

      }
      pointerId = null; // Clear the tracked pointer ID


      // --- Remove global listeners ---
      // Clean up listeners to prevent memory leaks and unintended behavior.
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);

      // Optional: Reset ondragstart if it was set
      // if (handle.ondragstart !== undefined) {
      //     handle.ondragstart = null;
      // }

    }; // --- End of onPointerUp ---

    // --- Attach the initial listener to the handle element ---
    handle.addEventListener('pointerdown', onPointerDown);

    // --- Set initial cursor style ---
    handle.style.cursor = 'grab';

    // --- Ensure `touch-action: none` is set via CSS or JS (CSS is preferred) ---
    // If not already done in CSS, uncomment the line below:
    // handle.style.touchAction = 'none';

    // --- Prevent default drag start behavior (redundant but safe) ---
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

