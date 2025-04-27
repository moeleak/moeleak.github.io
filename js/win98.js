// source/js/win98.js

document.addEventListener('DOMContentLoaded', () => {
    const windowContainer = document.getElementById('window-container');
    let highestZIndex = 10;

    // --- Window Creation Function (Updated for 98.css) ---
    function createWindow(title, contentUrl) {
        highestZIndex++;
        const windowId = `window-${Date.now()}`;

        // Main window element (Uses 98.css class 'window')
        const windowDiv = document.createElement('div');
        windowDiv.className = 'window'; // Use 98.css window class
        windowDiv.id = windowId;
        // position: absolute is set via style.css or inline style below
        windowDiv.style.position = 'absolute';
        windowDiv.style.left = `${Math.random() * 200 + 50}px`;
        windowDiv.style.top = `${Math.random() * 100 + 50}px`;
        windowDiv.style.width = '450px'; // Initial size
        windowDiv.style.height = '350px';
        windowDiv.style.zIndex = highestZIndex;
        // 98.css window has default resize handle, but might need overflow hidden if content overflows strangely
        // windowDiv.style.resize = 'both'; // Keep if you want CSS resize
        // windowDiv.style.overflow = 'hidden'; // Often needed with resize

        // Title bar (Uses 98.css class 'title-bar')
        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';

        // Title text (Uses 98.css class 'title-bar-text')
        const titleText = document.createElement('div');
        titleText.className = 'title-bar-text';
        titleText.textContent = title;
        titleBar.appendChild(titleText);

        // Title bar controls (Uses 98.css class 'title-bar-controls')
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'title-bar-controls';

        // Close button (Uses 98.css button structure)
        const closeButton = document.createElement('button');
        closeButton.setAttribute('aria-label', 'Close');
        // closeButton.innerHTML = '<span>X</span>'; // Or just text 'X'
        closeButton.textContent = 'X'; // Simple 'X' text for the button
        closeButton.onclick = () => {
            windowDiv.remove();
        };
        // Add minimize/maximize buttons similarly if needed
        buttonsDiv.appendChild(closeButton);

        titleBar.appendChild(buttonsDiv); // Append buttons to title bar

        // Window content area (Uses 98.css class 'window-body')
        const contentDiv = document.createElement('div');
        contentDiv.className = 'window-body';
        // contentDiv.classList.add('has-space'); // Optional: adds padding via 98.css
        contentDiv.innerHTML = '<p>Loading...</p>'; // Placeholder
        // Ensure scrolling works if content overflows
        contentDiv.style.overflow = 'auto';


        windowDiv.appendChild(titleBar);
        windowDiv.appendChild(contentDiv);

        // --- Make window active on click ---
        windowDiv.addEventListener('mousedown', () => {
            highestZIndex++;
            windowDiv.style.zIndex = highestZIndex;
        }, true);

        // --- Make window draggable (Using the titleBar as handle) ---
        makeDraggable(windowDiv, titleBar); // Pass titleBar as the handle
        // --- Make window resizable (JS implementation) ---
        const resizer = document.createElement('div');
        resizer.style.width = '12px'; // Slightly larger area
        resizer.style.height = '12px';
        resizer.style.background = 'transparent'; // Invisible handle
        resizer.style.position = 'absolute';
        resizer.style.right = '0';
        resizer.style.bottom = '0';
        resizer.style.cursor = 'nwse-resize'; // Diagonal resize cursor
        resizer.style.zIndex = '1'; // Ensure it's clickable
        windowDiv.appendChild(resizer);

        makeResizable(windowDiv, resizer); // Call the new resize function


        // Append to container
        windowContainer.appendChild(windowDiv);

        // --- Load content (No changes needed here) ---
        if (contentUrl) {
            fetch(contentUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.text();
                })
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    // *** IMPORTANT: Ensure this selector matches your content template ***
                    const mainContent = doc.querySelector('#content-main'); // Or '.win98-content'
                    if (mainContent) {
                        contentDiv.innerHTML = mainContent.innerHTML;
                        setupWindowLinks(contentDiv); // Re-scan links inside loaded content
                    } else {
                        contentDiv.innerHTML = '<p>Error: Content structure not found in fetched page.</p>';
                        console.warn("Could not find element with selector '#content-main' in fetched HTML from:", contentUrl);
                    }
                })
                .catch(error => {
                    console.error('Error loading content:', error);
                    contentDiv.innerHTML = `<p>Error loading content: ${error.message}</p>`;
                });
        } else {
             contentDiv.innerHTML = '<p>No content URL provided.</p>';
        }

    return windowDiv;
  }

  function makeResizable(element, handle) {
    let isResizing = false;
    let startX, startY, initialWidth, initialHeight;

    handle.addEventListener('mousedown', (e) => {
      // Only react to left mouse button
      if (e.button !== 0) return;

      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      initialWidth = element.offsetWidth;
      initialHeight = element.offsetHeight;

      // Prevent text selection globally during resize
      document.body.style.userSelect = 'none';
      // Change cursor globally to indicate resize operation
      document.body.style.cursor = 'nwse-resize';

      // Bring window to front when starting resize
      highestZIndex++;
      element.style.zIndex = highestZIndex;

      // Stop the event from bubbling up (e.g., to prevent window drag)
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = initialWidth + deltaX;
      let newHeight = initialHeight + deltaY;

      // Apply minimum size constraints based on CSS or defaults
      // Use getComputedStyle for more reliable min-width/min-height if set in CSS
      const computedStyle = window.getComputedStyle(element);
      const minWidth = parseInt(computedStyle.minWidth || '200');
      const minHeight = parseInt(computedStyle.minHeight || '150');

      // Ensure size doesn't go below minimum
      newWidth = Math.max(minWidth, newWidth);
      newHeight = Math.max(minHeight, newHeight);

      element.style.width = `${newWidth}px`;
      element.style.height = `${newHeight}px`;

      // Optional: Prevent rapid mouse movements from selecting text outside browser
      e.preventDefault();
    });

    document.addEventListener('mouseup', (e) => {
      // Only react to left mouse button release
      if (e.button !== 0) return;

      if (isResizing) {
        isResizing = false;
        // Restore default cursor and text selection behavior
        document.body.style.removeProperty('user-select');
        document.body.style.removeProperty('cursor');
      }
    });

    // Handle case where mouse leaves the window/document while resizing
    document.addEventListener('mouseleave', (e) => {
      // This event listener on `document` is debated, sometimes mouseup is enough.
      // If resize doesn't stop reliably when mouse button released outside window, add mouseup here too.
      // if (isResizing) {
      //    isResizing = false;
      //    document.body.style.removeProperty('user-select');
      //    document.body.style.removeProperty('cursor');
      // }
    });
  }

  // --- Draggable Functionality (No changes needed) ---
  function makeDraggable(element, handle) {
        let isDragging = false;
        let offsetX, offsetY;

        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left; // Use getBoundingClientRect for accuracy
            offsetY = e.clientY - element.getBoundingClientRect().top;
            handle.style.cursor = 'grabbing';
            element.style.userSelect = 'none';
            highestZIndex++;
            element.style.zIndex = highestZIndex;

            // Add a class to body to prevent text selection globally during drag
            document.body.classList.add('is-dragging-window');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            const VpWidth = window.innerWidth;
            const VpHeight = window.innerHeight;
            const elWidth = element.offsetWidth;
            // Keep window partially visible (e.g., title bar)
            const titleBarHeight = handle.offsetHeight || 20;

            newX = Math.max(-elWidth + 40, Math.min(newX, VpWidth - 40)); // Allow slight offscreen left/right
            newY = Math.max(0, Math.min(newY, VpHeight - titleBarHeight)); // Keep title bar visible

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', (e) => {
             if (e.button !== 0) return;
             if (isDragging) {
                isDragging = false;
                handle.style.cursor = 'grab';
                element.style.removeProperty('user-select');
                 // Remove global class
                document.body.classList.remove('is-dragging-window');
             }
        });

         // Optional: Prevent drag end if mouse leaves handle but button still pressed
        // handle.addEventListener('mouseleave', () => { /* No action needed usually */ });
    }

    // --- Link Handling (No changes needed in logic, but ensure selectors are correct) ---
    function setupWindowLinks(parentElement = document) {
        // Select links that should open in a window. Refine selector as needed.
        // Example: internal posts/pages + desktop icons meant for windows
        const windowLinks = parentElement.querySelectorAll(
            'a[href^="/"]:not([href="/"]), a.desktop-icon[data-window-title]:not(#icon-network):not(#icon-home)' // Exclude network/home icons explicitly if they have special behavior
        );


        windowLinks.forEach(link => {
            if (link.dataset.windowListenerAttached) return;

            link.addEventListener('click', (event) => {
                event.preventDefault();
                const url = link.getAttribute('href');
                const title = link.dataset.windowTitle || link.textContent.trim() || 'Window';

                 const existingWindow = Array.from(windowContainer.children).find(win => win.dataset.contentUrl === url);
                 if(existingWindow){
                      highestZIndex++;
                      existingWindow.style.zIndex = highestZIndex;
                      existingWindow.classList.add('window-shake');
                      setTimeout(() => existingWindow.classList.remove('window-shake'), 300);
                 } else {
                     const newWindow = createWindow(title, url);
                     newWindow.dataset.contentUrl = url; // Store URL
                 }
            });
            link.dataset.windowListenerAttached = 'true';
        });
    }

    // --- Initial Setup ---
    setupWindowLinks(); // Setup links on the main page

    // Add CSS for shake animation and global drag style
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        .window-shake { animation: shake 0.3s ease-in-out; }
        body.is-dragging-window { user-select: none; } /* Prevent text selection page-wide during drag */
    `;
    document.head.appendChild(styleSheet);

});

