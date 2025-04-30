// source/js/win98.js

document.addEventListener('DOMContentLoaded', () => {
    const windowContainer = document.getElementById('window-container');
    if (!windowContainer) {
        console.error("关键错误：未在页面中找到 #window-container 元素！");
        return;
    }
    let highestZIndex = 10;
    let isInitialLoad = true; // Flag for initial auto-open URL handling
    const baseTitle = document.body.dataset.baseTitle || 'Desktop'; // Get base title once

    // --- NEW: Flag to detect Gitalk callback ---
    let isGitalkCallback = false;
    const initialUrlParams = new URLSearchParams(window.location.search);
    if (initialUrlParams.has('code') && initialUrlParams.has('state')) {
        isGitalkCallback = true;
        console.log("[Win98 Init] Detected Gitalk OAuth callback parameters (code/state). Delaying history manipulation.");
        // Optional: Add a timeout to reset the flag in case Gitalk fails to clean URL
        // setTimeout(() => {
        //     console.log("[Win98 Init] Resetting Gitalk callback flag after timeout.");
        //     isGitalkCallback = false;
        //     // Force URL cleanup if still present?
        //     const currentParams = new URLSearchParams(window.location.search);
        //     if (currentParams.has('code') || currentParams.has('state')) {
        //         console.warn("[Win98 Init] Gitalk params still present after timeout. Forcing cleanup.");
        //         if (history.state) {
        //             history.replaceState(history.state, document.title, window.location.pathname);
        //         } else {
        //             history.replaceState({ windowUrl: window.location.pathname }, document.title, window.location.pathname);
        //         }
        //     }
        // }, 5000); // Reset after 5 seconds
    }

    // ===============================================
    //  Helper Function for Conditional History API Calls
    // ===============================================
    function safeHistoryCall(method, state, title, url) {
        // Always ensure state has at least windowUrl if possible
        if (state && typeof state === 'object' && !state.windowUrl && url) {
            state.windowUrl = url;
        } else if (!state && url) {
            state = { windowUrl: url };
        }

        if (isGitalkCallback) {
            console.warn(`[Win98 History] Skipped ${method} during Gitalk callback. Target URL: ${url}, Target Title: ${title}`);
            // Prevent win98.js interference. Gitalk should handle the URL cleanup.
            return;
        }

        try {
            // Prevent state object modification by history API
            const clonedState = state ? JSON.parse(JSON.stringify(state)) : null;

            // Ensure title is a string
            const safeTitle = (typeof title === 'string' && title) ? title : document.title; // Use current title as fallback

            // Ensure URL is valid
            const safeUrl = (typeof url === 'string' && url) ? url : window.location.pathname + window.location.search; // Fallback to current full URL

            history[method](clonedState, safeTitle, safeUrl);
            console.log(`[Win98 History] Called ${method}. URL: ${safeUrl}, Title: ${safeTitle}, State:`, clonedState);

            // Also update document.title if the method isn't just replacing state for the *same* URL
            // (or if it's pushState)
            if (document.title !== safeTitle && (method === 'pushState' || window.location.pathname !== safeUrl.split('?')[0])) {
                 document.title = safeTitle;
                 console.log(`[Win98 Title] Updated document.title to: ${safeTitle}`);
            }

        } catch (error) {
            console.error(`[Win98 History] Error calling ${method}:`, error, "State:", state, "Title:", title, "URL:", url);
        }
    }


    // ===============================================
    //  1. 函数定义部分 ( createWindow, makeDraggable, etc.)
    // ===============================================

    /**
     * Creates a new window.
     * @param {string} title - The initial title for the window and browser.
     * @param {string} contentIdentifier - URL to fetch or identifier (like image src).
     * @param {object} [options={}] - Options for creation.
     * @param {number} [options.sourceX] - X coordinate of the click source.
     * @param {number} [options.sourceY] - Y coordinate of the click source.
     * @param {boolean} [options.animateFromSource=false] - Animate from source coordinates?
     * @param {boolean} [options.isAutoOpen=false] - Is this window being opened automatically on page load?
     * @param {boolean} [options.isImagePopup=false] - Is this a dedicated image viewer window?
     */
    function createWindow(title, contentIdentifier, options = {}) {
        const {
            sourceX,
            sourceY,
            animateFromSource = false,
            isAutoOpen = false,
            isImagePopup = false // <-- New option
        } = options;

        const windowId = `window-${Date.now()}`; // Moved ID generation earlier
        highestZIndex++;
        const contentUrl = !isImagePopup ? contentIdentifier : null; // Store actual URL only if not image popup
        const imageSrc = isImagePopup ? contentIdentifier : null; // Store image source if it is an image popup

        const windowDiv = document.createElement('div');
        windowDiv.className = 'window';
        windowDiv.id = windowId;
        windowDiv.style.position = 'absolute';
        windowDiv.style.zIndex = highestZIndex;
        if (contentUrl) {
            windowDiv.dataset.contentUrl = contentUrl; // Store URL for focusing and history
        }
        if (imageSrc) {
             windowDiv.dataset.imageSrc = imageSrc; // Store image src for identification if needed
        }

        // --- Calculate final position and size ---
        const screenWidth = window.innerWidth;
        const mobileBreakpoint = 768;
        const defaultWidth = screenWidth < mobileBreakpoint ? Math.min(screenWidth - 20, 300) : 521;
        const defaultHeight = screenWidth < mobileBreakpoint ? Math.min(window.innerHeight - 50, 400) : 350;
        const targetWidth = defaultWidth;
        const targetHeight = defaultHeight;
        const margin = 10;
        const clampedWidth = Math.min(targetWidth, screenWidth - 2 * margin);
        const clampedHeight = Math.min(targetHeight, window.innerHeight - 2 * margin - 30); // Adjust for potential taskbar?
        const maxLeft = screenWidth - clampedWidth - margin;
        const maxTop = window.innerHeight - clampedHeight - margin - 30; // Adjust for potential taskbar?
        const randomLeft = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxLeft)));
        const randomTop = Math.max(margin, Math.floor(Math.random() * Math.max(margin, maxTop)));
        const finalLeft = randomLeft;
        const finalTop = randomTop;
        const finalWidth = clampedWidth;
        const finalHeight = clampedHeight;

        // --- Set Initial State (for animation) ---
         if (animateFromSource && sourceX !== undefined && sourceY !== undefined) {
            windowDiv.style.left = `${sourceX}px`;
            windowDiv.style.top = `${sourceY}px`;
            windowDiv.style.width = '32px';
            windowDiv.style.height = '32px';
            windowDiv.style.opacity = '0';
            windowDiv.style.transform = 'scale(0.1)';
            windowDiv.style.transformOrigin = 'center center';
        } else {
            windowDiv.style.left = `${finalLeft}px`;
            windowDiv.style.top = `${finalTop}px`;
            windowDiv.style.width = `${finalWidth}px`;
            windowDiv.style.height = `${finalHeight}px`;
            windowDiv.style.opacity = '1';
            windowDiv.style.transform = 'scale(1)';
        }

        // --- 标题栏 ---
        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        const titleText = document.createElement('div');
        titleText.className = 'title-bar-text';
        titleText.textContent = title; // Use the passed title
        titleBar.appendChild(titleText);
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'title-bar-controls';
        const closeButton = document.createElement('button');
        closeButton.setAttribute('aria-label', 'Close');
        closeButton.onclick = (e) => {
            e.stopPropagation();

            const windowIdToRemove = windowDiv.id;
            const closedWindowUrl = windowDiv.dataset.contentUrl; // Will be null/undefined for image popups

            windowDiv.remove();

            const remainingWindows = windowContainer.querySelectorAll('.window');
            const remainingContentWindows = Array.from(remainingWindows).filter(win => win.dataset.contentUrl);

            if (remainingContentWindows.length === 0) {
                // Last content window closed
                const baseUrl = '/';
                if (location.pathname !== baseUrl) {
                    console.log('[Window Close] Last content window closed. Reverting URL and Title to base.');
                    safeHistoryCall('replaceState', { windowUrl: baseUrl }, baseTitle, baseUrl);
                } else if (document.title !== baseTitle) {
                    // Ensure title is base even if URL was already '/'
                    if (!isGitalkCallback) document.title = baseTitle;
                }
            } else {
                // Other content windows remain, find the topmost one
                 let newTopWindow = null;
                 let maxZ = 0;
                 remainingContentWindows.forEach(win => {
                     const z = parseInt(win.style.zIndex || '0');
                     if (z > maxZ) {
                         maxZ = z;
                         newTopWindow = win;
                     }
                 });

                 if (newTopWindow) {
                     const newTopUrl = newTopWindow.dataset.contentUrl;
                     const newTopTitle = newTopWindow.querySelector('.title-bar-text').textContent || baseTitle;
                     const newTopId = newTopWindow.id;

                     // If the closed window was the active one, update history to the new top window
                     // Or if the current URL doesn't match the new top window
                     if ((closedWindowUrl && location.pathname === closedWindowUrl) || location.pathname !== newTopUrl) {
                         console.log('[Window Close] Updating URL/Title to new top window:', newTopUrl);
                         safeHistoryCall('replaceState', { windowUrl: newTopUrl, windowId: newTopId, windowTitle: newTopTitle }, newTopTitle, newTopUrl);
                     } else if (document.title !== newTopTitle) {
                        // Ensure title matches top window even if URL was already correct
                        if (!isGitalkCallback) document.title = newTopTitle;
                     }
                 } else {
                      // Fallback: Should not happen if remainingContentWindows > 0, but just in case
                      const baseUrl = '/';
                      if (location.pathname !== baseUrl) {
                          safeHistoryCall('replaceState', { windowUrl: baseUrl }, baseTitle, baseUrl);
                      } else if (document.title !== baseTitle) {
                           if (!isGitalkCallback) document.title = baseTitle;
                      }
                 }
            }
        };
        buttonsDiv.appendChild(closeButton);
        titleBar.appendChild(buttonsDiv);

        // --- 窗口内容区域 ---
        const contentDiv = document.createElement('div');
        contentDiv.className = 'window-body';
        if (isImagePopup) {
            contentDiv.classList.add('image-popup-body');
        }
        windowDiv.appendChild(titleBar);
        windowDiv.appendChild(contentDiv);

        // --- 使窗口获得焦点 (Update using safeHistoryCall) ---
        const bringToFront = () => {
            if (parseInt(windowDiv.style.zIndex) < highestZIndex) {
                highestZIndex++;
                windowDiv.style.zIndex = highestZIndex;

                const currentContentUrl = windowDiv.dataset.contentUrl; // Will be null for image popups
                const currentTitle = titleText.textContent;

                // Update Browser URL and Title on Focus ONLY IF it's not an image popup and they don't match current state
                if (currentContentUrl && !isImagePopup && (location.pathname !== currentContentUrl || document.title !== currentTitle)) {
                    safeHistoryCall('replaceState', { windowUrl: currentContentUrl, windowId: windowId, windowTitle: currentTitle }, currentTitle, currentContentUrl);
                } else if (!isImagePopup && document.title !== currentTitle) {
                    // Still update title if it got out of sync, even if URL matches
                    if (!isGitalkCallback) document.title = currentTitle;
                }
            }
        };
        windowDiv.addEventListener('pointerdown', bringToFront, true); // Capture phase

        // --- 使窗口可拖动 (No changes needed here) ---
        makeDraggable(windowDiv, titleBar);

        // --- 使窗口可调整大小 (No changes needed here) ---
        const resizer = document.createElement('div');
        resizer.className = 'window-resizer'; // CSS class controls size
        resizer.style.cssText = `
            position: absolute;
            right: 0; bottom: 0;
            cursor: nwse-resize;
            z-index: 1;
            touch-action: none;
        `;
        windowDiv.appendChild(resizer);
        makeResizable(windowDiv, resizer);

        // --- 将窗口添加到容器 ---
        windowContainer.appendChild(windowDiv);

        // --- Apply Animation (if animating from source) ---
         if (animateFromSource) {
            windowDiv.classList.add('window-opening');
            requestAnimationFrame(() => {
                windowDiv.style.left = `${finalLeft}px`;
                windowDiv.style.top = `${finalTop}px`;
                windowDiv.style.width = `${finalWidth}px`;
                windowDiv.style.height = `${finalHeight}px`;
                windowDiv.style.opacity = '1';
                windowDiv.style.transform = 'scale(1)';
            });
            windowDiv.addEventListener('transitionend', () => {
                windowDiv.classList.remove('window-opening');
            }, { once: true });
        }

        // --- Update Browser URL and Title on Create (Using safeHistoryCall) ---
        if (contentUrl && !isImagePopup) {
           const historyMethod = isInitialLoad && isAutoOpen ? 'replaceState' : 'pushState';
           // Check if state needs update (different URL, or pushing new state, or different title)
           const needsHistoryUpdate = (location.pathname !== contentUrl || historyMethod === 'pushState' || document.title !== title);

           if (needsHistoryUpdate) {
                // Pass windowTitle in state here too
                safeHistoryCall(historyMethod, { windowUrl: contentUrl, windowId: windowId, windowTitle: title }, title, contentUrl);
           } else if (isInitialLoad && isAutoOpen) {
               // Even if URL matches, ensure state object is set on initial load if needed
               if (!history.state || history.state.windowUrl !== contentUrl || history.state.windowId !== windowId) {
                    safeHistoryCall('replaceState', { windowUrl: contentUrl, windowId: windowId, windowTitle: title }, title, contentUrl);
               }
           }

           // Manage the initial load flag correctly
           if (isInitialLoad && isAutoOpen) {
               isInitialLoad = false;
           }

        } else if (isInitialLoad && isAutoOpen && !isImagePopup) {
             // Ensure flag is handled even if no URL update was needed
             isInitialLoad = false;
        }


        // --- 处理内容：加载或直接设置 ---
        if (isImagePopup && imageSrc) {
            // --- Handle Image Popup Directly ---
            contentDiv.innerHTML = `<img src="${imageSrc}" alt="${title}">`; // Use title as alt
            console.log(`[Win98 Image Popup] Created window for image: ${imageSrc}`);

        } else if (contentUrl) {
            // --- 异步加载页面内容 ---
            contentDiv.innerHTML = '<p>加载中...</p>'; // Loading indicator
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
                        // --- 更新窗口标题 和 浏览器标题 (如果找到H1且窗口是活动的, 且非image popup) ---
                        const h1Element = mainContent.querySelector('h1');
                        if (h1Element && h1Element.textContent.trim()) {
                            const newTitle = h1Element.textContent.trim();
                            titleText.textContent = newTitle; // Update window title bar

                            // Update history state title and browser title ONLY if this window is currently active AND NOT image popup
                            if (!isImagePopup && parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                                 // Only update history state/title if URL/Title actually changed or state missing title
                                 if (document.title !== newTitle || !history.state || history.state.windowUrl !== contentUrl || history.state.windowTitle !== newTitle ) {
                                      safeHistoryCall('replaceState', { windowUrl: contentUrl, windowId: windowId, windowTitle: newTitle }, newTitle, contentUrl);
                                 }
                            } else {
                                 console.log(`[Win98] Window title updated to: ${newTitle} (window not active or image popup, browser history/title unchanged)`);
                            }
                        } else {
                            console.log("[Win98] H1 not found in loaded content, keeping initial title:", title);
                            // Ensure history state has the initial title if this window is active
                             if (!isImagePopup && parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                                 if (!history.state || history.state.windowTitle !== title) {
                                      safeHistoryCall('replaceState', { windowUrl: contentUrl, windowId: windowId, windowTitle: title }, title, contentUrl);
                                 }
                             }
                        }

                        // --- 内容处理 和 Gitalk ---
                        contentDiv.innerHTML = ''; // Clear loading message
                        while (mainContent.firstChild) {
                            contentDiv.appendChild(mainContent.firstChild);
                        }
                        console.log("[Win98] Appended fetched content to window body.");

                        // --- Gitalk Initialization ---
                        const gitalkPlaceholder = contentDiv.querySelector('#gitalk-container-placeholder');
                        if (gitalkPlaceholder) {
                            console.log("[Win98] Found Gitalk placeholder.");
                            const uniqueGitalkId = `gitalk-container-${windowId}`;
                            gitalkPlaceholder.id = uniqueGitalkId;
                            console.log(`[Win98] Renamed placeholder ID to: ${uniqueGitalkId}`);
                            if (typeof initializeGitalkForWindow === 'function') {
                                // Pass contentUrl as the unique ID for Gitalk issues
                                initializeGitalkForWindow(uniqueGitalkId, contentUrl);
                            } else {
                                console.error("[Win98] Error: Global function 'initializeGitalkForWindow' not found!");
                                gitalkPlaceholder.innerHTML = '<p style="color:red;">错误：无法找到 Gitalk 初始化函数！</p>';
                            }
                        } else {
                             console.log("[Win98] Gitalk placeholder (#gitalk-container-placeholder) not found in the fetched content.");
                        }

                        // --- 设置窗口内链接 (包括图片点击) ---
                        setupWindowInteractions(contentDiv); // Call the unified handler setup

                    } else {
                        contentDiv.innerHTML = '<p>错误：在获取的页面中未找到 #content-main 结构。</p>';
                        const errorTitle = title + " (内容加载失败)";
                        titleText.textContent = errorTitle;
                         if (!isImagePopup && parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                             safeHistoryCall('replaceState', { windowUrl: contentUrl, windowId: windowId, windowTitle: errorTitle }, errorTitle, contentUrl);
                         }
                        console.warn("[Win98] Cannot find selector '#content-main' in fetched HTML:", contentUrl);
                    }
                })
                .catch(error => {
                    console.error('[Win98] Error fetching content:', contentUrl, error);
                    contentDiv.innerHTML = `<p style="color: red;">加载内容出错: ${error.message}</p>`;
                    const errorTitle = title + " (加载错误)";
                    titleText.textContent = errorTitle;
                     if (!isImagePopup && parseInt(windowDiv.style.zIndex) === highestZIndex && location.pathname === contentUrl) {
                        safeHistoryCall('replaceState', { windowUrl: contentUrl, windowId: windowId, windowTitle: errorTitle }, errorTitle, contentUrl);
                     }
                });
        } else if (!isImagePopup) {
            // Only show "No URL" if it's not an image popup
            contentDiv.innerHTML = '<p>未提供内容 URL。</p>';
            const noContentTitle = title + " (无内容)";
            titleText.textContent = noContentTitle;
            // If this somehow becomes the active state, reflect it
            if (parseInt(windowDiv.style.zIndex) === highestZIndex) {
                 safeHistoryCall('replaceState', { windowUrl: location.pathname, windowId: windowId, windowTitle: noContentTitle }, noContentTitle, location.pathname);
            }
        }

        return windowDiv; // Return the created window element
    }

    /**
     * Makes an element draggable by its handle.
     */
    function makeDraggable(element, handle) {
         let isDragging = false, pointerId = null, startX, startY, initialLeft, initialTop;
        const onPointerMove = (e) => {
            if (!isDragging || e.pointerId !== pointerId) return;
            e.preventDefault();
            const deltaX = e.clientX - startX, deltaY = e.clientY - startY;
            let newLeft = initialLeft + deltaX, newTop = initialTop + deltaY;
            const VpWidth = window.innerWidth, VpHeight = window.innerHeight;
            const elWidth = element.offsetWidth, elHeight = element.offsetHeight;
            const handleHeight = handle.offsetHeight;
            const minTop = -handleHeight + 10; // Allow title bar to go slightly off screen top
            const maxTopAllowed = VpHeight - handleHeight - 5; // Prevent title bar going below viewport bottom edge
            newLeft = Math.max(0 - elWidth + 50, Math.min(newLeft, VpWidth - 50)); // Allow partial offscreen horizontally
            newTop = Math.max(minTop, Math.min(newTop, maxTopAllowed));
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
        };
        const onPointerUp = (e) => {
            if (!isDragging || e.pointerId !== pointerId) return;
            isDragging = false;
            handle.style.cursor = 'grab';
            element.style.removeProperty('user-select');
            document.body.style.removeProperty('user-select');
            document.body.classList.remove('is-dragging-window');
            if (handle.hasPointerCapture(pointerId)) {
                try { handle.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
            }
            pointerId = null;
            document.removeEventListener('pointermove', onPointerMove, { capture: false });
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };
        const onPointerDown = (e) => {
            // Ignore clicks on controls, non-primary mouse buttons, or the resizer
            if (e.target.closest('.title-bar-controls') || (e.pointerType === 'mouse' && e.button !== 0) || e.target.classList.contains('window-resizer')) return;

            isDragging = true;
            pointerId = e.pointerId;
            startX = e.clientX; startY = e.clientY;
            initialLeft = element.offsetLeft; initialTop = element.offsetTop;
            handle.style.cursor = 'grabbing';
            element.style.userSelect = 'none';
            document.body.style.userSelect = 'none'; // Prevent text selection during drag
            document.body.classList.add('is-dragging-window');

            // bringToFront is handled by capture listener on windowDiv

            e.preventDefault(); // Prevent default drag behaviors
            e.stopPropagation(); // Stop event bubbling
            handle.style.touchAction = 'none'; // Prevent scrolling on touch devices
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("Set pointer capture failed (drag):", err); }
            document.addEventListener('pointermove', onPointerMove, { capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp); // Handle cancellation (e.g., ESC key)
        };
        handle.addEventListener('pointerdown', onPointerDown);
        handle.style.cursor = 'grab'; // Initial cursor
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; } // Prevent native image drag
    }

    /**
     * Makes an element resizable using a handle.
     */
    function makeResizable(element, handle) {
         let isResizing = false, pointerId = null, startX, startY, initialWidth, initialHeight; // No initialLeft/Top needed
        const onPointerMove = (e) => {
            if (!isResizing || e.pointerId !== pointerId) return;
            e.preventDefault();
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            let newWidth = initialWidth + deltaX;
            let newHeight = initialHeight + deltaY;
            const computedStyle = window.getComputedStyle(element);
            const minWidth = parseInt(computedStyle.minWidth || '150', 10);
            const minHeight = parseInt(computedStyle.minHeight || '100', 10);
            newWidth = Math.max(minWidth, newWidth);
            newHeight = Math.max(minHeight, newHeight);

            // Optional: Add max width/height constraints based on viewport?
            // const maxWidth = window.innerWidth - element.offsetLeft - 10;
            // const maxHeight = window.innerHeight - element.offsetTop - 10;
            // newWidth = Math.min(newWidth, maxWidth);
            // newHeight = Math.min(newHeight, maxHeight);

            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
        };
        const onPointerUp = (e) => {
            if (!isResizing || e.pointerId !== pointerId) return;
            isResizing = false;
            document.body.style.removeProperty('user-select');
            document.body.style.removeProperty('cursor'); // Restore default cursor
            if (handle.hasPointerCapture(pointerId)) {
                try { handle.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
            }
            pointerId = null;
            document.removeEventListener('pointermove', onPointerMove, { capture: false });
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };
        const onPointerDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return; // Ignore non-primary clicks
            isResizing = true;
            pointerId = e.pointerId;
            startX = e.clientX;
            startY = e.clientY;
            initialWidth = element.offsetWidth;
            initialHeight = element.offsetHeight;
            // initialLeft/Top not needed for resizing width/height from bottom-right

            document.body.style.userSelect = 'none'; // Prevent selection during resize
            document.body.style.cursor = 'nwse-resize'; // Indicate resize action

            // bringToFront is handled by capture listener on windowDiv

            e.preventDefault();
            e.stopPropagation();
            handle.style.touchAction = 'none'; // Crucial for touch devices
            try { handle.setPointerCapture(pointerId); } catch (err) { console.error("Set pointer capture failed (resize):", err); }
            document.addEventListener('pointermove', onPointerMove, { capture: false });
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
        };
        handle.addEventListener('pointerdown', onPointerDown);
        // Cursor is set by CSS on .window-resizer
        if (handle.ondragstart !== undefined) { handle.ondragstart = () => false; } // Prevent default drag
    }


    /**
     * Sets up event listeners for interactions within a parent element (links, image clicks).
     * Uses event delegation.
     */
    function setupWindowInteractions(parentElement) {
        if (!parentElement) {
            console.error("[Win98 Interactions] Attempted to attach listener to an invalid element.");
            return;
        }

        // Prevent attaching multiple listeners to the same content container
        if (parentElement.dataset && parentElement.dataset.interactionListenerAttached === 'true') {
             console.log(`[Win98 Interactions] Listener already attached to <${parentElement.tagName}>. Skipping.`);
             return;
        }

        const elementName = parentElement.nodeName || parentElement.tagName || 'UnknownElement';
        console.log(`[Win98 Interactions] Attaching listener to ${elementName}`);

        parentElement.addEventListener('click', (event) => {
            const target = event.target;

            // --- Handle Image Clicks (for popup) ---
            const imgPopupTarget = target.closest('.window-body:not(.image-popup-body) img');
            if (imgPopupTarget && parentElement.contains(imgPopupTarget)) {
                event.preventDefault(); // Prevent default if image is wrapped in <a>
                event.stopPropagation(); // Stop propagation to prevent link handling

                const imgElement = imgPopupTarget;
                const imgSrc = imgElement.src;
                const imgAlt = imgElement.alt;
                const filename = imgSrc.substring(imgSrc.lastIndexOf('/') + 1);
                const title = imgAlt || filename || 'Image Viewer';

                const rect = imgElement.getBoundingClientRect();
                const clickX = rect.left + (rect.width / 2);
                const clickY = rect.top + (rect.height / 2);

                console.log(`[Win98 Img Click] Detected click for popup: ${imgSrc}`);
                createWindow(title, imgSrc, {
                    isImagePopup: true,
                    sourceX: clickX,
                    sourceY: clickY,
                    animateFromSource: true
                });
                return; // Handled image click, exit
            }

            // --- Handle Link Clicks (Desktop Icons or Internal Links in regular windows) ---
             const link = target.closest(
                 'a.desktop-icon[data-window-title][href^="/"], .window-body:not(.image-popup-body) a[href^="/"]:not([href="/"]):not(.no-window)'
                 // Selects desktop icons OR links starting with / inside regular window bodies,
                 // excluding the root link "/" and links with class "no-window"
             );

            if (link && parentElement.contains(link)) {
                 // Prevent acting on image clicks that were handled above
                if (target.tagName === 'IMG') {
                    console.log("[Win98 Link Click] Ignoring click event target that is an image (should be handled by img popup logic or is desktop icon img).");
                    // If it was a desktop icon image, the link logic below will still proceed because 'link' is valid.
                    // If it was an image inside a window link, the img popup handler above should have caught it.
                }

                event.preventDefault();
                event.stopPropagation();
                const url = link.getAttribute('href');
                const title = link.dataset.windowTitle || link.textContent.trim() || '窗口';
                let existingWindow = null;

                const windows = windowContainer.querySelectorAll('.window');
                for (let win of windows) {
                    // Match only windows with the same contentUrl (ignore image popups)
                    if (win.dataset.contentUrl === url) {
                        existingWindow = win;
                        break;
                    }
                }

                if (existingWindow) {
                    // Bring existing window to front and give feedback
                    existingWindow.dispatchEvent(new Event('pointerdown', { bubbles: true })); // Trigger bringToFront
                    existingWindow.classList.add('window-shake');
                    setTimeout(() => existingWindow.classList.remove('window-shake'), 300);
                } else {
                    // Create new window
                    const rect = link.getBoundingClientRect();
                    const clickX = rect.left + (rect.width / 2);
                    const clickY = rect.top + (rect.height / 2);
                    createWindow(title, url, {
                        sourceX: clickX,
                        sourceY: clickY,
                        animateFromSource: true,
                        isAutoOpen: false,
                        isImagePopup: false // Ensure this is false for links
                    });
                }
                 return; // Handled link click
            }

            // --- Handle External Links (Open in new tab) ---
            const externalLink = target.closest('a[href^="http"]:not([target="_self"]), a[target="_blank"]');
             if (externalLink && parentElement.contains(externalLink)) {
                 console.log("[Win98 External Link] Opening in new tab:", externalLink.href);
                 // Browser default behavior handles target="_blank" or external links automatically
                 // We don't preventDefault() here.
                 return;
             }

        }); // End of click listener

        // Mark as attached only if parentElement is an Element (not Document)
        if (parentElement.dataset) {
             parentElement.dataset.interactionListenerAttached = 'true';
             console.log(`[Win98 Interactions] Marked <${parentElement.tagName}> as attached.`);
        }
    }


    // ===============================================
    //  2. 初始化和执行逻辑部分
    // ===============================================

    setupWindowInteractions(document); // Setup interactions for desktop icons initially

    // --- Auto Open Logic ---
    const currentPath = window.location.pathname;
    // Normalize path: remove trailing slash unless it's the root '/'
    const normalizedPath = (currentPath !== '/' && currentPath.endsWith('/')) ? currentPath.slice(0, -1) : currentPath;
    const isHomePage = (normalizedPath === '/' || normalizedPath === '' || normalizedPath.endsWith('/index.html'));
    let autoOpenTitle = null;
    let autoOpenUrl = null;
    // Map normalized paths (without trailing slash, except root) to titles
    const pathMap = { "/about": "关于我", "/links": "友情链接", "/archives": "存档", "/guestbook": "留言板" };


    if (pathMap[normalizedPath]) {
        autoOpenTitle = pathMap[normalizedPath];
        // Ensure URL passed to createWindow includes trailing slash for consistency
        autoOpenUrl = normalizedPath + '/';
    } else if (!isHomePage) {
        // Auto-open other non-mapped paths (likely blog posts)
        autoOpenTitle = "加载中..."; // Title will be updated from content
        autoOpenUrl = currentPath; // Use the original path
    }


    if (autoOpenTitle && autoOpenUrl) {
        // createWindow call will use safeHistoryCall internally
        createWindow(autoOpenTitle, autoOpenUrl, {
             animateFromSource: false, // Don't animate auto-opened windows
             isAutoOpen: true,
             isImagePopup: false
        });
        // isInitialLoad flag is handled within createWindow now
    } else {
        isInitialLoad = false; // Set flag if no window is auto-opened

        // --- Set initial state for the base page if necessary ---
        // Only manage state for the homepage if no window opened and not during Gitalk callback
        if (isHomePage) {
            const expectedBaseState = { windowUrl: '/' }; // Base state represents root
            if (!history.state || history.state.windowUrl !== expectedBaseState.windowUrl) {
                 // Use location.pathname for URL to preserve potential query strings initially
                 safeHistoryCall('replaceState', expectedBaseState, baseTitle, location.pathname + location.search);
            }
            // Ensure document title is correct if no windows and not in callback
            if (document.title !== baseTitle && windowContainer.querySelectorAll('.window').length === 0) {
                 if (!isGitalkCallback) document.title = baseTitle;
            }
        }
        // For non-homepage, non-auto-open cases, let the initial browser-provided state stand.
        // safeHistoryCall prevents interference during callback.
    }


    // --- 添加 CSS 样式 (不变) ---
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    // Basic styles needed by JS logic
    styleSheet.innerText = `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        .window-shake { animation: shake 0.3s ease-in-out; }
        body.is-dragging-window { user-select: none; -webkit-user-select: none; cursor: grabbing !important; }
        /* Ensure title bar also shows grabbing cursor when body class is active */
        body.is-dragging-window .title-bar { cursor: grabbing !important; }
        /* Resizer touch action */
        .window-resizer { touch-action: none; }
        /* Opening animation class */
        .window-opening {
            transition: opacity 0.25s ease-out, transform 0.25s ease-out,
                        left 0.25s ease-out, top 0.25s ease-out,
                        width 0.25s ease-out, height 0.25s ease-out;
        }
    `;
    document.head.appendChild(styleSheet);


    // --- PopState listener (Handles Back/Forward browser buttons) ---
    window.addEventListener('popstate', (event) => {
        console.log('[PopState] Navigated:', event.state);

        // If Gitalk callback flag is still somehow active, ignore popstate
        // This is a fallback, ideally the flag is short-lived.
        if (isGitalkCallback) {
             console.warn("[PopState] Ignoring popstate event during Gitalk callback phase.");
             return;
        }

        const stateUrl = event.state ? event.state.windowUrl : null;
        const stateWindowId = event.state ? event.state.windowId : null; // Get ID from state
        const stateTitle = event.state ? event.state.windowTitle : null; // Get Title from state

        if (stateUrl) {
            // Target URL from history state
            const targetUrl = stateUrl;
            let windowToFocus = null;

            // Try finding window by ID first (more reliable if IDs are stable)
            if (stateWindowId) {
                 windowToFocus = document.getElementById(stateWindowId);
                 // Verify it's a content window and its URL matches the state
                 if (windowToFocus && (!windowToFocus.dataset.contentUrl || windowToFocus.dataset.contentUrl !== targetUrl)) {
                    console.warn(`[PopState] Found window by ID ${stateWindowId} but its URL (${windowToFocus.dataset.contentUrl}) doesn't match state URL (${targetUrl}). Ignoring ID match.`);
                    windowToFocus = null; // Don't trust ID if URL mismatch
                 }
            }

            // If not found by ID, try finding by URL (only content windows)
            if (!windowToFocus) {
                 const windows = windowContainer.querySelectorAll('.window[data-content-url]');
                 for (let win of windows) {
                     if (win.dataset.contentUrl === targetUrl) {
                         windowToFocus = win;
                         break; // Found first match by URL
                     }
                 }
            }

            if (windowToFocus) {
                // --- Existing Window Found ---
                console.log('[PopState] Found existing content window, bringing to front:', targetUrl);
                const windowTitle = windowToFocus.querySelector('.title-bar-text').textContent || stateTitle || baseTitle; // Prefer live title

                // Bring to front visually
                 if (parseInt(windowToFocus.style.zIndex) < highestZIndex) {
                     highestZIndex++;
                     windowToFocus.style.zIndex = highestZIndex;
                 }
                 // Sync browser title to the focused window's title
                 if (document.title !== windowTitle) {
                    document.title = windowTitle;
                 }
                 // Optional: Visual feedback like shake?
                 // windowToFocus.classList.add('window-shake');
                 // setTimeout(() => windowToFocus.classList.remove('window-shake'), 300);

            } else {
                 // --- Window Not Found ---
                 // Recreate the window if the state represents a specific page (not the root '/')
                 if (targetUrl !== '/') {
                    console.log('[PopState] Content window not found for state, recreating:', targetUrl);

                    // Determine title: Use state > mapping > default
                    let title = stateTitle || pathMap[targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl] || '窗口';

                    // If still default, check desktop icon as last resort
                    if (title === '窗口') {
                        const matchingIcon = document.querySelector(`.desktop-icon[href="${targetUrl}"]`);
                         if(matchingIcon && matchingIcon.dataset.windowTitle) {
                            title = matchingIcon.dataset.windowTitle;
                         } else {
                             title = targetUrl; // Fallback to URL if no title found
                         }
                    }

                    // Recreate the window. It will get the highest z-index.
                    // History state already reflects this URL, so createWindow shouldn't pushState.
                    // It might replaceState if title needs updating, handled by safeHistoryCall.
                    createWindow(title, targetUrl, {
                       animateFromSource: false, // No animation for history navigation
                       isAutoOpen: false,
                       isImagePopup: false
                    });
                    // Ensure title syncs immediately if createWindow didn't set it
                    if (document.title !== title) {
                         document.title = title;
                    }
                 } else {
                      // --- Navigated Back to Base URL State ---
                      console.log('[PopState] Reached base URL state ("/" or equivalent).');
                      // Optional: Close all windows? Or just ensure title? Let's just sync title.
                      if (document.title !== baseTitle) {
                           document.title = baseTitle;
                      }
                      // Ensure no windows are accidentally active visually? (Find highest z-index and check if it matches base?)
                 }
            }
        } else {
             // --- State is null or invalid ---
             // This usually happens when navigating back past the initial entry point or to a page before JS modified history.
             // Treat it as the base desktop state.
             console.log('[PopState] State is null or invalid. Assuming base state.');
             if (document.title !== baseTitle) {
                 document.title = baseTitle;
             }
             // If the URL isn't the root, force replace state to match the base
             if (location.pathname !== '/') {
                 safeHistoryCall('replaceState', { windowUrl: '/' }, baseTitle, '/');
             }
        }
    }); // End of PopState listener

}); // End of DOMContentLoaded listener


