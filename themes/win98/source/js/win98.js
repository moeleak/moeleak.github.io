document.addEventListener('DOMContentLoaded', () => {
  const windowContainer = document.getElementById('window-container');
  if (!windowContainer) return;

  const blogTitle = document.body.dataset.blogTitle || document.title || 'Blog';
  const desktopTitle = 'Desktop';
  const mobileBreakpoint = 768;
  const windowMargin = 10;
  const cascadeStep = 24;
  const animationDuration = 160;
  const defaultDocumentIcon = '/images/icon_notepad.png';
  const defaultImageIcon = '/images/icon_image.png';

  let highestZIndex = 10;
  let isInitialLoad = true;
  let activeExternalTaskId = null;
  const taskbarIconCache = new Map();

  window.getWin98HighestZIndex = () => ++highestZIndex;

  const taskbar = ensureTaskbar();
  function ensureTaskbar() {
    let bar = document.getElementById('win98-taskbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'win98-taskbar';
      bar.className = 'win98-taskbar';
      document.body.appendChild(bar);
    }

    bar.querySelector('.win98-start-button')?.remove();

    let taskList = bar.querySelector('.win98-task-list');
    if (!taskList) {
      taskList = document.createElement('div');
      taskList.className = 'win98-task-list';
      taskList.setAttribute('aria-label', '打开的窗口');
      bar.prepend(taskList);
    }

    bar.querySelector('.win98-task-clock')?.remove();

    return bar;
  }

  function getTaskList() {
    return taskbar.querySelector('.win98-task-list');
  }

  function getTaskbarHeight() {
    return taskbar ? taskbar.offsetHeight || 30 : 0;
  }

  function setDocumentTitle(title) {
    const currentTitle = title || desktopTitle;
    const fullTitle = `[${currentTitle}] - ${blogTitle}`;
    document.title = fullTitle;
    return fullTitle;
  }

  function normalizePath(path) {
    if (path !== '/' && !path.endsWith('/') && !path.includes('.')) {
      return `${path}/`;
    }
    return path;
  }

  function isRoutablePath(path) {
    return path !== '/' && !path.endsWith('/index.html') && !path.includes('.');
  }

  function currentRoutePath() {
    return normalizePath(location.pathname);
  }

  function currentFullUrl() {
    return `${location.pathname}${location.search}${location.hash}`;
  }

  function hasGitalkQuery() {
    return location.search.includes('code=') || location.search.includes('state=');
  }

  function getWindowTitle(win) {
    return win.dataset.windowTitle || win.querySelector('.title-bar-text')?.textContent || '窗口';
  }

  function getWindowIcon(win) {
    return win.dataset.iconSrc || defaultDocumentIcon;
  }

  function getIconFromLink(link) {
    const image = link.querySelector('img');
    if (image) return image.getAttribute('src') || image.currentSrc || image.src;
    return getIconForUrl(link.getAttribute('href'));
  }

  function getIconForUrl(url) {
    try {
      const path = normalizePath(new URL(url, location.origin).pathname);
      const matchingIcon = Array.from(document.querySelectorAll('.desktop-icon[href]')).find((icon) => {
        return normalizePath(new URL(icon.getAttribute('href'), location.origin).pathname) === path;
      });
      const image = matchingIcon?.querySelector('img');
      return image?.getAttribute('src') || image?.currentSrc || image?.src || defaultDocumentIcon;
    } catch (error) {
      return defaultDocumentIcon;
    }
  }

  function setTaskButtonContent(button, label, iconSrc) {
    const icon = document.createElement('canvas');
    const text = document.createElement('span');
    const resolvedIconSrc = iconSrc || defaultDocumentIcon;

    icon.className = 'win98-task-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.dataset.iconSource = resolvedIconSrc;
    renderPixelPerfectTaskIcon(icon, resolvedIconSrc);

    text.className = 'win98-task-title';
    text.textContent = label;

    button.replaceChildren(icon, text);
    button.title = label;
  }

  function getTaskbarIconMetrics() {
    const cssSize = 16;
    const deviceScale = Math.max(1, Math.ceil(window.devicePixelRatio || 1));
    return {
      cssSize,
      backingSize: cssSize * deviceScale
    };
  }

  function drawTaskbarIcon(context, source, size) {
    const scale = Math.min(size / source.naturalWidth, size / source.naturalHeight);
    const drawWidth = Math.max(1, Math.round(source.naturalWidth * scale));
    const drawHeight = Math.max(1, Math.round(source.naturalHeight * scale));
    const offsetX = Math.floor((size - drawWidth) / 2);
    const offsetY = Math.floor((size - drawHeight) / 2);

    context.clearRect(0, 0, size, size);
    context.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
  }

  function renderPixelPerfectTaskIcon(canvas, src) {
    if (!(canvas instanceof HTMLCanvasElement) || !src) return;

    const { cssSize, backingSize } = getTaskbarIconMetrics();
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = backingSize;
    canvas.height = backingSize;
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, backingSize, backingSize);

    let source = taskbarIconCache.get(src);
    if (!source) {
      source = new Image();
      source.decoding = 'sync';
      taskbarIconCache.set(src, source);
      source.src = src;
    }

    const paint = () => {
      if (canvas.dataset.iconSource !== src) return;
      const targetContext = canvas.getContext('2d');
      if (!targetContext) return;
      targetContext.imageSmoothingEnabled = false;
      drawTaskbarIcon(targetContext, source, backingSize);
    };

    if (source.complete && source.naturalWidth) {
      paint();
      return;
    }

    source.addEventListener('load', paint, { once: true });
  }

  function setWindowTitle(win, title) {
    const nextTitle = title || '窗口';
    win.dataset.windowTitle = nextTitle;
    win.querySelector('.title-bar-text').textContent = nextTitle;
    updateTaskButton(win);
  }

  function getHistoryUrl(win) {
    const contentUrl = win.dataset.contentUrl;
    if (!contentUrl) return '/';

    const contentPath = normalizePath(new URL(contentUrl, location.origin).pathname);
    if (contentPath === currentRoutePath() && hasGitalkQuery()) {
      return `${contentPath}${location.search}`;
    }
    return contentUrl;
  }

  function writeHistory(win, method = 'replaceState') {
    if (!win.dataset.contentUrl) {
      setDocumentTitle(getWindowTitle(win));
      return;
    }

    const url = getHistoryUrl(win);
    const title = getWindowTitle(win);
    const fullTitle = setDocumentTitle(title);
    const state = { windowUrl: url, windowId: win.id, title };
    const realMethod = method === 'pushState' && currentFullUrl() !== url ? 'pushState' : 'replaceState';

    try {
      history[realMethod](state, fullTitle, url);
    } catch (error) {
      // Keep navigation usable when History API rejects an edge-case URL.
    }
  }

  function writeDesktopHistory() {
    activeExternalTaskId = null;
    const url = currentRoutePath() === '/' && hasGitalkQuery() ? `/${location.search}` : '/';
    const title = setDocumentTitle(null);
    try {
      history.replaceState({ windowUrl: url, title: desktopTitle }, title, url);
    } catch (error) {
      // Ignore History API failures.
    }
  }

  function getDesktopArea() {
    return {
      width: window.innerWidth,
      height: Math.max(0, window.innerHeight - getTaskbarHeight())
    };
  }

  function getWindowPlacement() {
    const area = getDesktopArea();
    const defaultWidth = area.width < mobileBreakpoint ? Math.min(area.width - 20, 300) : 530;
    const defaultHeight = area.width < mobileBreakpoint ? Math.min(area.height - 20, 400) : 640;
    const width = Math.max(200, Math.min(defaultWidth, area.width - windowMargin * 2));
    const height = Math.max(150, Math.min(defaultHeight, area.height - windowMargin * 2));
    const cascadeIndex = getOpenWindows().length % 6;
    const maxLeft = Math.max(windowMargin, area.width - width - windowMargin);
    const maxTop = Math.max(windowMargin, area.height - height - windowMargin);
    const baseLeft = Math.round((area.width - width) / 2);
    const baseTop = Math.round((area.height - height) / 2);

    return {
      width,
      height,
      left: Math.max(windowMargin, Math.min(baseLeft + cascadeIndex * cascadeStep, maxLeft)),
      top: Math.max(windowMargin, Math.min(baseTop + cascadeIndex * cascadeStep, maxTop))
    };
  }

  function getMaximizedPlacement() {
    const area = getDesktopArea();
    return {
      left: 0,
      top: 0,
      width: area.width,
      height: area.height
    };
  }

  function createWindow(title, contentIdentifier, options = {}) {
    const {
      sourceX,
      sourceY,
      animateFromSource = false,
      isAutoOpen = false,
      isImagePopup = false,
      startMaximized = false,
      windowIdToUse,
      historyMode = 'pushState',
      iconSrc
    } = options;

    const existingWindow = windowIdToUse ? document.getElementById(windowIdToUse) : null;
    if (existingWindow) {
      activateWindow(existingWindow, { updateHistory: historyMode !== 'none' });
      return existingWindow;
    }

    const win = document.createElement('div');
    const body = document.createElement('div');
    const statusBar = isImagePopup ? null : createStatusBar();
    const restorePlacement = getWindowPlacement();
    const placement = startMaximized ? getMaximizedPlacement() : restorePlacement;
    const titleBar = createTitleBar(title, {
      onMinimize: () => minimizeWindow(win),
      onMaximize: () => toggleMaximizeWindow(win),
      onClose: () => closeWindow(win)
    });
    const windowId = windowIdToUse || `window-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    win.className = 'window';
    win.id = windowId;
    win.dataset.windowTitle = title;
    win.dataset.iconSrc = iconSrc || (isImagePopup ? defaultImageIcon : getIconForUrl(contentIdentifier));
    win.style.position = 'absolute';
    win.style.zIndex = String(++highestZIndex);

    if (isImagePopup) {
      win.dataset.imageSrc = contentIdentifier;
      body.className = 'window-body image-popup-body';
    } else {
      win.dataset.contentUrl = contentIdentifier;
      body.className = 'window-body';
    }

    placeWindow(win, placement);
    if (startMaximized) {
      win._restorePlacement = restorePlacement;
      win.classList.add('is-maximized');
    }
    if (statusBar) win._statusBar = statusBar;
    win.append(titleBar, body, ...(statusBar ? [statusBar] : []), createResizer(win));
    win.addEventListener('pointerdown', () => activateWindow(win), true);
    makeDraggable(win, titleBar);
    windowContainer.appendChild(win);
    addTaskButton(win);
    if (startMaximized) updateMaximizeButton(win);

    if (animateFromSource && sourceX !== undefined && sourceY !== undefined) {
      animateWindowOpen(win, rectFromCenter(sourceX, sourceY, 32));
    }

    if (isImagePopup) {
      renderImageWindow(body, contentIdentifier, title);
    } else {
      renderContentWindow(win, body, contentIdentifier);
    }

    const shouldUpdateHistory = !isImagePopup && historyMode !== 'none';
    if (shouldUpdateHistory) {
      writeHistory(win, isInitialLoad && isAutoOpen ? 'replaceState' : historyMode);
    } else {
      setDocumentTitle(title);
    }

    if (isInitialLoad && isAutoOpen) isInitialLoad = false;
    updateTaskbar(win);
    return win;
  }

  function createStatusBar() {
    const statusBar = document.createElement('div');
    const wordCountField = document.createElement('p');
    const publishedAtField = document.createElement('p');

    statusBar.className = 'status-bar window-status-bar';
    statusBar.hidden = true;

    wordCountField.className = 'status-bar-field';
    wordCountField.dataset.statusField = 'word-count';

    publishedAtField.className = 'status-bar-field';
    publishedAtField.dataset.statusField = 'published-at';

    statusBar.append(wordCountField, publishedAtField);
    return statusBar;
  }

  function countDocumentUnits(text) {
    return (text || '').replace(/\s+/g, '').length;
  }

  function extractContentStatus(mainContent) {
    if (!mainContent) return null;

    const content = mainContent.querySelector('.post-content, .page-body');
    if (!content) return null;

    const wordCount = countDocumentUnits(content.textContent || '');
    const publishedAt = mainContent.dataset.publishedAt
      || mainContent.querySelector('.post-meta')?.textContent.replace(/^发布于:\s*/, '').trim()
      || '';

    return {
      wordCount,
      publishedAt
    };
  }

  function updateWindowStatusBar(win, status) {
    const statusBar = win?._statusBar;
    if (!statusBar) return;

    const wordCountField = statusBar.querySelector('[data-status-field="word-count"]');
    const publishedAtField = statusBar.querySelector('[data-status-field="published-at"]');
    if (!wordCountField || !publishedAtField) return;

    if (!status) {
      statusBar.hidden = true;
      wordCountField.textContent = '';
      publishedAtField.textContent = '';
      return;
    }

    wordCountField.textContent = `字数: ${status.wordCount}`;
    publishedAtField.textContent = status.publishedAt
      ? `发表时间: ${status.publishedAt}`
      : '静态页';
    statusBar.hidden = false;
  }

  function createTitleBar(title, callbacks) {
    const titleBar = document.createElement('div');
    const titleText = document.createElement('div');
    const controls = document.createElement('div');
    const minimizeButton = createTitleButton('Minimize', callbacks.onMinimize);
    const maximizeButton = createTitleButton('Maximize', callbacks.onMaximize);
    const closeButton = createTitleButton('Close', callbacks.onClose);

    titleBar.className = 'title-bar';
    titleText.className = 'title-bar-text';
    titleText.textContent = title;
    controls.className = 'title-bar-controls';
    maximizeButton.dataset.windowAction = 'maximize';

    titleBar.addEventListener('dblclick', (event) => {
      if (event.target.closest('.title-bar-controls')) return;
      callbacks.onMaximize();
    });

    controls.append(minimizeButton, maximizeButton, closeButton);
    titleBar.append(titleText, controls);
    return titleBar;
  }

  function createTitleButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function updateMaximizeButton(win) {
    const button = win.querySelector('[data-window-action="maximize"]');
    if (!button) return;
    button.setAttribute('aria-label', win.classList.contains('is-maximized') ? 'Restore' : 'Maximize');
  }

  function createResizeHandle(win, direction) {
    const handle = document.createElement('div');
    handle.className = `window-resizer is-${direction}`;
    handle.dataset.resizeDirection = direction;
    makeResizable(win, handle, direction);
    return handle;
  }

  function createResizer(win) {
    const fragment = document.createDocumentFragment();
    ['west', 'east', 'south', 'southeast'].forEach((direction) => {
      fragment.appendChild(createResizeHandle(win, direction));
    });
    return fragment;
  }

  function placeWindow(win, placement) {
    Object.assign(win.style, {
      left: `${placement.left}px`,
      top: `${placement.top}px`,
      width: `${placement.width}px`,
      height: `${placement.height}px`,
      opacity: '1',
      transform: 'none'
    });
  }

  function rectFromCenter(x, y, size) {
    return {
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size
    };
  }

  function placementToScreenRect(placement) {
    const containerRect = windowContainer.getBoundingClientRect();
    return {
      left: containerRect.left + placement.left,
      top: containerRect.top + placement.top,
      width: placement.width,
      height: placement.height
    };
  }

  function getWindowScreenRect(win) {
    if (!win.classList.contains('is-minimized')) {
      return elementRect(win);
    }

    return placementToScreenRect({
      left: parseFloat(win.style.left) || 0,
      top: parseFloat(win.style.top) || 0,
      width: parseFloat(win.style.width) || 200,
      height: parseFloat(win.style.height) || 150
    });
  }

  function elementRect(element) {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    };
  }

  function getTaskButtonRect(win) {
    const button = getTaskButton(win);
    if (button) return elementRect(button);

    const taskbarRect = elementRect(taskbar);
    return {
      left: taskbarRect.left,
      top: taskbarRect.top,
      width: 1,
      height: taskbarRect.height
    };
  }

  function animateWindowOpen(win, sourceRect) {
    const targetRect = getWindowScreenRect(win);
    setWindowAnimationHidden(win, true);
    animateRectTransition(sourceRect, targetRect, () => {
      setWindowAnimationHidden(win, false);
      activateWindow(win);
    });
  }

  function animateRectTransition(fromRect, toRect, onComplete) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onComplete?.();
      return;
    }

    const animator = document.createElement('div');
    let finished = false;
    animator.className = 'win98-window-animator';
    applyScreenRect(animator, fromRect);
    document.body.appendChild(animator);

    const finish = () => {
      if (finished) return;
      finished = true;
      animator.remove();
      onComplete?.();
    };

    animator.offsetWidth;
    requestAnimationFrame(() => {
      animator.classList.add('is-running');
      applyScreenRect(animator, toRect);
    });

    animator.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, animationDuration + 80);
  }

  function applyScreenRect(element, rect) {
    Object.assign(element.style, {
      left: `${Math.round(rect.left)}px`,
      top: `${Math.round(rect.top)}px`,
      width: `${Math.max(1, Math.round(rect.width))}px`,
      height: `${Math.max(1, Math.round(rect.height))}px`
    });
  }

  function setWindowAnimationHidden(win, hidden) {
    win.classList.toggle('is-animating-shell', hidden);
  }

  function activateWindow(win, options = {}) {
    const { updateHistory = true } = options;
    activeExternalTaskId = null;
    if (win.classList.contains('is-minimized')) {
      restoreMinimizedWindow(win, { updateHistory });
      return;
    }

    if (Number(win.style.zIndex || 0) < highestZIndex) {
      win.style.zIndex = String(++highestZIndex);
    }

    if (updateHistory) writeHistory(win);
    else setDocumentTitle(getWindowTitle(win));

    updateTaskbar(win);
  }

  function minimizeWindow(win) {
    if (win.classList.contains('is-minimized')) return;

    clearWindowFocus(win);
    const wasActive = getActiveWindow() === win;
    const fromRect = getWindowScreenRect(win);
    const toRect = getTaskButtonRect(win);
    setWindowAnimationHidden(win, true);

    animateRectTransition(fromRect, toRect, () => {
      win.classList.add('is-minimized');
      setWindowAnimationHidden(win, false);
      updateTaskButton(win);

      const nextWindow = getTopWindow();
      if (wasActive && nextWindow) {
        activateWindow(nextWindow);
      } else if (wasActive) {
        updateTaskbar(null);
        writeDesktopHistory();
      } else {
        updateTaskbar(getActiveWindow());
      }
    });
  }

  function clearWindowFocus(win) {
    win.classList.add('is-gitalk-suspended');

    if (win.contains(document.activeElement) && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    win.querySelectorAll('.gt-container').forEach((container) => {
      container.classList.remove('gt-input-focused');
    });

    win.querySelectorAll('.gt-header-textarea').forEach((textarea) => {
      if (typeof textarea.blur === 'function') textarea.blur();
    });

    win.querySelectorAll('.gt-header-comment').forEach((commentBox) => {
      commentBox.dataset.win98Hidden = 'true';
      commentBox.style.setProperty('display', 'none', 'important');
      commentBox.style.setProperty('visibility', 'hidden', 'important');
    });
  }

  function restoreWindowFocus(win) {
    win.classList.remove('is-gitalk-suspended');

    win.querySelectorAll('.gt-header-comment[data-win98-hidden="true"]').forEach((commentBox) => {
      delete commentBox.dataset.win98Hidden;
      commentBox.style.removeProperty('display');
      commentBox.style.removeProperty('visibility');
    });
  }

  function restoreMinimizedWindow(win, options = {}) {
    const { updateHistory = true } = options;
    if (!win.classList.contains('is-minimized')) {
      activateWindow(win, { updateHistory });
      return;
    }

    const fromRect = getTaskButtonRect(win);
    win.classList.remove('is-minimized');
    const toRect = getWindowScreenRect(win);
    setWindowAnimationHidden(win, true);
    updateTaskButton(win);

    animateRectTransition(fromRect, toRect, () => {
      setWindowAnimationHidden(win, false);
      restoreWindowFocus(win);
      activateWindow(win, { updateHistory });
    });
  }

  function toggleMaximizeWindow(win) {
    if (win.classList.contains('is-minimized')) return;
    if (win.classList.contains('is-maximized')) restoreMaximizedWindow(win);
    else maximizeWindow(win);
  }

  function maximizeWindow(win) {
    activateWindow(win);
    win._restorePlacement = {
      left: parseFloat(win.style.left) || 0,
      top: parseFloat(win.style.top) || 0,
      width: parseFloat(win.style.width) || win.offsetWidth,
      height: parseFloat(win.style.height) || win.offsetHeight
    };

    const fromRect = getWindowScreenRect(win);
    const targetPlacement = getMaximizedPlacement();
    const toRect = placementToScreenRect(targetPlacement);
    setWindowAnimationHidden(win, true);

    animateRectTransition(fromRect, toRect, () => {
      placeWindow(win, targetPlacement);
      win.classList.add('is-maximized');
      setWindowAnimationHidden(win, false);
      updateMaximizeButton(win);
      activateWindow(win);
    });
  }

  function restoreMaximizedWindow(win) {
    const targetPlacement = win._restorePlacement || getWindowPlacement();
    const fromRect = getWindowScreenRect(win);
    const toRect = placementToScreenRect(targetPlacement);
    setWindowAnimationHidden(win, true);

    animateRectTransition(fromRect, toRect, () => {
      win.classList.remove('is-maximized');
      placeWindow(win, targetPlacement);
      setWindowAnimationHidden(win, false);
      updateMaximizeButton(win);
      activateWindow(win);
    });
  }

  function restoreMaximizedWindowForDrag(win, handle, pointerEvent, pointerRatioX, titleGrabOffset) {
    const targetPlacement = win._restorePlacement || getWindowPlacement();
    const area = getDesktopArea();
    const minTop = -handle.offsetHeight + 10;
    const maxTop = area.height - handle.offsetHeight - 5;
    const minLeft = 50 - targetPlacement.width;
    const maxLeft = area.width - 50;
    const nextLeft = clamp(pointerEvent.clientX - targetPlacement.width * pointerRatioX, minLeft, maxLeft);
    const nextTop = clamp(pointerEvent.clientY - titleGrabOffset, minTop, maxTop);

    win.classList.remove('is-maximized');
    placeWindow(win, {
      ...targetPlacement,
      left: nextLeft,
      top: nextTop
    });
    updateMaximizeButton(win);
  }

  function closeWindow(win) {
    const wasActive = getActiveWindow() === win;
    removeTaskButton(win.id);
    win.remove();

    const nextWindow = getTopWindow();
    if (nextWindow) {
      activateWindow(nextWindow, { updateHistory: wasActive });
    } else {
      updateTaskbar(null);
      writeDesktopHistory();
    }
  }

  function getOpenWindows() {
    return Array.from(windowContainer.querySelectorAll('.window'));
  }

  function getVisibleWindows() {
    return getOpenWindows().filter((win) => !win.classList.contains('is-minimized'));
  }

  function getTopWindow() {
    return getVisibleWindows().reduce((top, win) => {
      if (!top) return win;
      return Number(win.style.zIndex || 0) > Number(top.style.zIndex || 0) ? win : top;
    }, null);
  }

  function getActiveWindow() {
    return getTopWindow();
  }

  function addTaskButton(win) {
    const taskList = getTaskList();
    if (!taskList || taskList.querySelector(`[data-window-id="${win.id}"]`)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'win98-task-button';
    button.dataset.windowId = win.id;
    button.addEventListener('click', () => {
      const targetWindow = document.getElementById(button.dataset.windowId);
      if (!targetWindow) return;

      if (targetWindow.classList.contains('is-minimized')) {
        restoreMinimizedWindow(targetWindow);
        return;
      }

      if (targetWindow === getActiveWindow()) {
        minimizeWindow(targetWindow);
        return;
      }

      activateWindow(targetWindow);
    });

    taskList.appendChild(button);
    updateTaskButton(win);
  }

  function getTaskButton(win) {
    return getTaskList()?.querySelector(`[data-window-id="${win.id}"]`) || null;
  }

  function removeTaskButton(windowId) {
    getTaskList()?.querySelector(`[data-window-id="${windowId}"]`)?.remove();
  }

  function updateWindowTitleBars(activeWindow) {
    const activeId = !activeExternalTaskId ? activeWindow?.id || null : null;

    getOpenWindows().forEach((win) => {
      const titleBar = win.querySelector('.title-bar');
      if (!titleBar) return;

      const isActive = win.id === activeId && !win.classList.contains('is-minimized');
      titleBar.classList.toggle('inactive', !isActive);
    });
  }

  function updateTaskButton(win) {
    const button = getTaskButton(win);
    if (!button) return;

    const label = getWindowTitle(win);
    setTaskButtonContent(button, label, getWindowIcon(win));
    button.classList.toggle('is-minimized', win.classList.contains('is-minimized'));
  }

  function updateTaskbar(activeWindow) {
    const activeId = activeWindow?.id || null;

    getTaskList()?.querySelectorAll('.win98-task-button[data-window-id]').forEach((button) => {
      const win = document.getElementById(button.dataset.windowId);
      const isActive = !activeExternalTaskId && button.dataset.windowId === activeId && !win?.classList.contains('is-minimized');
      button.classList.toggle('is-active', isActive);
      if (win) button.classList.toggle('is-minimized', win.classList.contains('is-minimized'));
    });

    getTaskList()?.querySelectorAll('.win98-task-button[data-task-id]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.taskId === activeExternalTaskId);
    });

    updateWindowTitleBars(activeWindow);
  }

  function registerExternalTask(options) {
    const { id, title, onClick, iconSrc = defaultDocumentIcon } = options;
    const taskList = getTaskList();
    if (!taskList || !id) return null;

    let button = taskList.querySelector(`[data-task-id="${id}"]`);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'win98-task-button';
      button.dataset.taskId = id;
      button.dataset.iconSrc = iconSrc;
      taskList.appendChild(button);
    }
    if (!button.dataset.iconSrc) button.dataset.iconSrc = iconSrc;

    const api = {
      button,
      setTitle(nextTitle) {
        setTaskButtonContent(button, nextTitle || title || id, button.dataset.iconSrc || iconSrc);
      },
      setIcon(nextIconSrc) {
        button.dataset.iconSrc = nextIconSrc || defaultDocumentIcon;
        const label = button.querySelector('.win98-task-title')?.textContent || title || id;
        setTaskButtonContent(button, label, button.dataset.iconSrc);
      },
      setActive(isActive = true) {
        activeExternalTaskId = isActive ? id : null;
        updateTaskbar(isActive ? null : getActiveWindow());
      },
      setMinimized(isMinimized = true) {
        button.classList.toggle('is-minimized', isMinimized);
      },
      remove() {
        if (activeExternalTaskId === id) activeExternalTaskId = null;
        button.remove();
        updateTaskbar(getActiveWindow());
      },
      getRect() {
        return elementRect(button);
      },
      animateToButton(element, onComplete) {
        animateRectTransition(elementRect(element), elementRect(button), onComplete);
      },
      animateFromButton(element, onComplete) {
        animateRectTransition(elementRect(button), elementRect(element), onComplete);
      }
    };

    api.setTitle(title);
    button.onclick = () => onClick?.(api);
    return api;
  }

  window.Win98Shell = {
    registerTask: registerExternalTask,
    setActiveTask(taskId) {
      activeExternalTaskId = taskId || null;
      updateTaskbar(null);
    },
    clearActiveTask() {
      activeExternalTaskId = null;
      updateTaskbar(getActiveWindow());
    },
    nextZIndex: window.getWin98HighestZIndex,
    animateRectTransition,
    elementRect
  };

  function renderImageWindow(body, src, title) {
    const image = document.createElement('img');
    image.src = src;
    image.alt = title;
    body.replaceChildren(image);
  }

  function renderContentWindow(win, body, url) {
    body.innerHTML = '<p>加载中...</p>';

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP 错误！状态: ${response.status}`);
        return response.text();
      })
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const mainContent = doc.querySelector('#content-main');

        if (!mainContent) {
          setWindowTitle(win, `${getWindowTitle(win)} (内容加载失败)`);
          body.innerHTML = '<p>错误：在获取的页面中未找到 #content-main 结构。</p>';
          updateWindowStatusBar(win, null);
          return;
        }

        const contentStatus = extractContentStatus(mainContent);

        const heading = mainContent.querySelector('h1');
        if (heading?.textContent.trim()) {
          setWindowTitle(win, heading.textContent.trim());
        }

        body.replaceChildren(...Array.from(mainContent.childNodes));
        updateWindowStatusBar(win, contentStatus);
        initializeGitalk(body, win.id, url);
        enhanceContent(body);
        setupWindowInteractions(body);

        if (getActiveWindow() === win) writeHistory(win);
      })
      .catch((error) => {
        setWindowTitle(win, `${getWindowTitle(win)} (加载错误)`);
        body.innerHTML = `<p style="color: red;">加载内容出错: ${error.message}</p>`;
        updateWindowStatusBar(win, null);
      });
  }

  function initializeGitalk(body, windowId, contentUrl) {
    const placeholder = body.querySelector('#gitalk-container-placeholder');
    if (!placeholder) return;

    if (typeof initializeGitalkForWindow !== 'function') {
      placeholder.innerHTML = '<p style="color:red;">错误：无法找到 Gitalk 初始化函数！</p>';
      return;
    }

    const gitalkId = `gitalk-container-${windowId}`;
    placeholder.id = gitalkId;
    placeholder.classList.remove('gitalk-placeholder');
    initializeGitalkForWindow(gitalkId, contentUrl);
  }

  function makeDraggable(win, handle) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let frame = null;
    let pendingLeft = 0;
    let pendingTop = 0;
    let previousTransition = '';
    let startedMaximized = false;
    let restoredFromMaximized = false;
    let maximizedPointerRatioX = 0.5;
    let maximizedTitleGrabOffset = 8;

    const commitPosition = () => {
      win.style.left = `${pendingLeft}px`;
      win.style.top = `${pendingTop}px`;
      frame = null;
    };

    const onMove = (event) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();

      if (startedMaximized && !restoredFromMaximized) {
        const movedDistance = Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY);
        const restoreThreshold = event.pointerType === 'touch' ? 10 : 4;
        if (movedDistance < restoreThreshold) return;

        restoreMaximizedWindowForDrag(win, handle, event, maximizedPointerRatioX, maximizedTitleGrabOffset);
        restoredFromMaximized = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = win.offsetLeft;
        startTop = win.offsetTop;
        pendingLeft = startLeft;
        pendingTop = startTop;
      }

      const area = getDesktopArea();
      const minTop = -handle.offsetHeight + 10;
      const maxTop = area.height - handle.offsetHeight - 5;
      const minLeft = 50 - win.offsetWidth;
      const maxLeft = area.width - 50;

      pendingLeft = clamp(startLeft + event.clientX - startX, minLeft, maxLeft);
      pendingTop = clamp(startTop + event.clientY - startY, minTop, maxTop);

      if (frame === null) frame = requestAnimationFrame(commitPosition);
    };

    const stopDrag = (event) => {
      if (event.pointerId !== pointerId) return;
      if (frame !== null) {
        cancelAnimationFrame(frame);
        commitPosition();
      }

      document.body.classList.remove('is-dragging-window');
      win.style.transition = previousTransition;
      pointerId = null;
      startedMaximized = false;
      restoredFromMaximized = false;

      try { handle.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointercancel', stopDrag);
    };

    handle.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.title-bar-controls') || event.target.classList.contains('window-resizer')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      activateWindow(win);
      pointerId = event.pointerId;
      startedMaximized = win.classList.contains('is-maximized');
      restoredFromMaximized = false;
      startX = event.clientX;
      startY = event.clientY;
      if (startedMaximized) {
        const rect = win.getBoundingClientRect();
        maximizedPointerRatioX = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
        maximizedTitleGrabOffset = clamp(event.clientY - rect.top, 6, Math.max(6, handle.offsetHeight - 6));
      }
      startLeft = win.offsetLeft;
      startTop = win.offsetTop;
      pendingLeft = startLeft;
      pendingTop = startTop;
      previousTransition = win.style.transition || '';
      win.style.transition = 'none';
      document.body.classList.add('is-dragging-window');

      event.preventDefault();
      event.stopPropagation();
      try { handle.setPointerCapture(pointerId); } catch (error) { /* ignore */ }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', stopDrag);
      document.addEventListener('pointercancel', stopDrag);
    });

    handle.ondragstart = () => false;
  }

  function makeResizable(win, handle, direction = 'southeast') {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startWidth = 0;
    let startHeight = 0;

    const onMove = (event) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();

      const area = getDesktopArea();
      const minWidth = parseInt(getComputedStyle(win).minWidth || '200', 10);
      const minHeight = parseInt(getComputedStyle(win).minHeight || '150', 10);
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      const resizeWest = direction === 'west';
      const resizeEast = direction === 'east' || direction === 'southeast';
      const resizeSouth = direction === 'south' || direction === 'southeast';

      let nextLeft = startLeft;
      let nextWidth = startWidth;
      let nextHeight = startHeight;

      if (resizeWest) {
        const widthDelta = clamp(deltaX, -startLeft, startWidth - minWidth);
        nextLeft = startLeft + widthDelta;
        nextWidth = startWidth - widthDelta;
      }

      if (resizeEast) {
        const maxWidth = area.width - startLeft - windowMargin;
        nextWidth = clamp(startWidth + deltaX, minWidth, maxWidth);
      }

      if (resizeSouth) {
        const maxHeight = area.height - win.offsetTop - windowMargin;
        nextHeight = clamp(startHeight + deltaY, minHeight, maxHeight);
      }

      win.style.left = `${Math.round(nextLeft)}px`;
      win.style.width = `${Math.round(nextWidth)}px`;
      win.style.height = `${Math.round(nextHeight)}px`;
    };

    const stopResize = (event) => {
      if (event.pointerId !== pointerId) return;
      document.body.classList.remove('is-resizing-window');
      document.body.style.removeProperty('--win98-resize-cursor');
      pointerId = null;

      try { handle.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', stopResize);
      document.removeEventListener('pointercancel', stopResize);
    };

    handle.addEventListener('pointerdown', (event) => {
      if (win.classList.contains('is-maximized')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      activateWindow(win);
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = win.offsetLeft;
      startWidth = win.offsetWidth;
      startHeight = win.offsetHeight;
      document.body.classList.add('is-resizing-window');
      document.body.style.setProperty('--win98-resize-cursor', getComputedStyle(handle).cursor || 'nwse-resize');

      event.preventDefault();
      event.stopPropagation();
      try { handle.setPointerCapture(pointerId); } catch (error) { /* ignore */ }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', stopResize);
      document.addEventListener('pointercancel', stopResize);
    });

    handle.ondragstart = () => false;
  }

  function enhanceContent(parent) {
    if (!parent) return;

    parent.querySelectorAll('.post-content ul, .page-body ul').forEach((list) => {
      if (list.parentElement?.closest('ul')) return;
      list.classList.add('tree-view');
    });

    parent.querySelectorAll('pre').forEach((pre) => {
      if (pre.parentElement?.classList.contains('code-block-wrapper')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      pre.before(wrapper);
      wrapper.appendChild(pre);

      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'copy-code-button';
      copyButton.textContent = '复制';
      copyButton.addEventListener('click', () => copyCode(pre, copyButton));
      wrapper.appendChild(copyButton);

      const language = pre.querySelector('code')?.className.match(/hljs\s+(\S+)/)?.[1];
      if (language) {
        wrapper.classList.add('has-language-label');
        const label = document.createElement('span');
        label.className = 'code-language-label';
        label.textContent = language;
        wrapper.appendChild(label);
      }
    });

    parent.querySelectorAll('table').forEach((table) => {
      if (table.closest('figure.highlight')) return;
      if (table.parentElement?.classList.contains('table-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.before(wrapper);
      wrapper.appendChild(table);
    });
  }

  function copyCode(pre, button) {
    if (!navigator.clipboard?.writeText) {
      setTemporaryButtonText(button, '不可用');
      return;
    }

    const code = pre.querySelector('code')?.innerText || pre.innerText;
    navigator.clipboard.writeText(code)
      .then(() => setTemporaryButtonText(button, '已复制!'))
      .catch(() => setTemporaryButtonText(button, '失败'));
  }

  function setTemporaryButtonText(button, text) {
    const originalText = button.textContent;
    button.textContent = text;
    button.disabled = true;
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }

  function setupWindowInteractions(parent) {
    if (!parent || parent.dataset?.interactionListenerAttached === 'true') return;

    parent.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (openImageFromClick(target, event)) return;
      openInternalLinkFromClick(target, event);
    });

    if (parent.dataset) parent.dataset.interactionListenerAttached = 'true';
  }

  function openImageFromClick(target, event) {
    const body = target.closest('.window-body');
    if (target.tagName !== 'IMG' || !body || body.classList.contains('image-popup-body')) return false;

    event.preventDefault();
    event.stopPropagation();

    const rect = target.getBoundingClientRect();
    createWindow(target.alt || target.src.split('/').pop() || 'Image Viewer', target.src, {
      isImagePopup: true,
      sourceX: rect.left + rect.width / 2,
      sourceY: rect.top + rect.height / 2,
      animateFromSource: true,
      historyMode: 'none',
      iconSrc: defaultImageIcon
    });
    return true;
  }

  function openInternalLinkFromClick(target, event) {
    const link = target.closest('a.desktop-icon, .window-body:not(.image-popup-body) a[href^="/"]:not([href="/"]):not(.no-window):not([target="_blank"])');
    if (!link) return;

    if (target.tagName === 'IMG' && link.contains(target) && !link.classList.contains('desktop-icon')) return;

    event.preventDefault();
    event.stopPropagation();

    const url = new URL(link.getAttribute('href'), location.origin);
    const path = normalizePath(url.pathname);
    const targetUrl = `${path}${url.search}${url.hash}`;
    const title = link.dataset.windowTitle || link.textContent.trim() || '窗口';
    const iconSrc = getIconFromLink(link);
    const existingWindow = findWindowByContentUrl(targetUrl);

    if (existingWindow) {
      activateWindow(existingWindow);
      existingWindow.classList.add('window-shake');
      setTimeout(() => existingWindow.classList.remove('window-shake'), 280);
      return;
    }

    const rect = link.getBoundingClientRect();
    createWindow(title, targetUrl, {
      sourceX: rect.left + rect.width / 2,
      sourceY: rect.top + rect.height / 2,
      animateFromSource: true,
      iconSrc
    });
  }

  function findWindowByContentUrl(url) {
    return getOpenWindows().find((win) => win.dataset.contentUrl === url) || null;
  }

  function findWindowForRoute(path, windowId) {
    if (windowId) {
      const win = document.getElementById(windowId);
      if (win?.dataset.contentUrl && normalizePath(new URL(win.dataset.contentUrl, location.origin).pathname) === path) {
        return win;
      }
    }

    return getOpenWindows().find((win) => {
      if (!win.dataset.contentUrl) return false;
      return normalizePath(new URL(win.dataset.contentUrl, location.origin).pathname) === path;
    }) || null;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function bootFromCurrentRoute() {
    const path = currentRoutePath();
    if (isRoutablePath(path)) {
      createWindow('加载中...', path, {
        animateFromSource: false,
        isAutoOpen: true,
        startMaximized: true,
        historyMode: 'replaceState'
      });
      return;
    }

    isInitialLoad = false;
    writeDesktopHistory();
  }

  function handlePopState(event) {
    const state = event.state || {};
    const path = currentRoutePath();

    if (isRoutablePath(path)) {
      const title = state.title || document.querySelector(`.desktop-icon[href^="${path}"]`)?.dataset.windowTitle || path.split('/').filter(Boolean).pop() || '窗口';
      const win = findWindowForRoute(path, state.windowId) || createWindow(title, path, {
        animateFromSource: false,
        startMaximized: true,
        windowIdToUse: state.windowId,
        historyMode: 'none'
      });
      activateWindow(win, { updateHistory: false });
      return;
    }

    const topWindow = getTopWindow();
    if (topWindow) activateWindow(topWindow, { updateHistory: false });
    else writeDesktopHistory();
  }

  setupWindowInteractions(document);
  bootFromCurrentRoute();
  window.addEventListener('popstate', handlePopState);
});
