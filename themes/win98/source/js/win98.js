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
  const desktopIconMetaByPath = new Map();
  const openWindowById = new Map();
  const contentWindowByUrl = new Map();

  window.getWin98HighestZIndex = () => ++highestZIndex;
  window.updateWin98GitalkCommentCount = (containerId, count) => {
    const container = document.getElementById(containerId);
    const win = container?.closest('.window');
    if (!win || win.dataset.statusType !== 'guestbook') return;

    updateWindowStatusBar(win, {
      type: 'guestbook',
      commentCount: parseCount(count)
    });
  };

  const taskbar = ensureTaskbar();
  const taskList = taskbar.querySelector('.win98-task-list');
  cacheDesktopIconMeta();
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
    return taskList;
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

  function normalizeContentUrl(url) {
    const parsedUrl = new URL(url, location.origin);
    return `${normalizePath(parsedUrl.pathname)}${parsedUrl.search}${parsedUrl.hash}`;
  }

  function hasGitalkQuery() {
    return location.search.includes('code=') || location.search.includes('state=');
  }

  function getWindowTitle(win) {
    return win.dataset.windowTitle || win._parts?.titleText?.textContent || '窗口';
  }

  function getWindowIcon(win) {
    return win.dataset.iconSrc || defaultDocumentIcon;
  }

  function getIconFromLink(link) {
    const image = link.querySelector('img');
    if (image) return image.getAttribute('src') || image.currentSrc || image.src;
    return getIconForUrl(link.getAttribute('href'));
  }

  function cacheDesktopIconMeta() {
    document.querySelectorAll('.desktop-icon[href]').forEach((icon) => {
      const href = icon.getAttribute('href');
      if (!href) return;

      try {
        const path = normalizePath(new URL(href, location.origin).pathname);
        const image = icon.querySelector('img');
        desktopIconMetaByPath.set(path, {
          title: icon.dataset.windowTitle || icon.textContent.trim() || '窗口',
          iconSrc: image?.getAttribute('src') || image?.currentSrc || image?.src || defaultDocumentIcon
        });
      } catch (error) {}
    });
  }

  function getIconForUrl(url) {
    try {
      const path = normalizePath(new URL(url, location.origin).pathname);
      return desktopIconMetaByPath.get(path)?.iconSrc || defaultDocumentIcon;
    } catch (error) {
      return defaultDocumentIcon;
    }
  }

  function getTitleForPath(path) {
    return desktopIconMetaByPath.get(normalizePath(path))?.title || null;
  }

  function setTaskButtonContent(button, label, iconSrc) {
    const resolvedIconSrc = iconSrc || defaultDocumentIcon;
    if (button.dataset.label === label && button.dataset.iconSrc === resolvedIconSrc) return;

    const icon = document.createElement('canvas');
    const text = document.createElement('span');

    icon.className = 'win98-task-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.dataset.iconSource = resolvedIconSrc;
    renderPixelPerfectTaskIcon(icon, resolvedIconSrc);

    text.className = 'win98-task-title';
    text.textContent = label;

    button.replaceChildren(icon, text);
    button.dataset.label = label;
    button.dataset.iconSrc = resolvedIconSrc;
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
    if (win._parts?.titleText) win._parts.titleText.textContent = nextTitle;
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

  function getActiveArchiveTabForWindow(win) {
    return win.querySelector('.archive-tab-list [role="tab"][aria-selected="true"]') || null;
  }

  function getWindowHistoryDetails(win) {
    const archiveTab = getActiveArchiveTabForWindow(win);
    if (archiveTab?.dataset.tabUrl) {
      const title = archiveTab.dataset.tabTitle || archiveTab.textContent.trim() || getWindowTitle(win);
      return {
        title,
        url: archiveTab.dataset.tabUrl,
        archiveTabUrl: archiveTab.dataset.tabUrl,
        archiveWindowUrl: win.dataset.contentUrl || '/archives/'
      };
    }

    return {
      title: getWindowTitle(win),
      url: getHistoryUrl(win)
    };
  }

  function writeHistory(win, method = 'replaceState') {
    if (!win.dataset.contentUrl) {
      setDocumentTitle(getWindowTitle(win));
      return;
    }

    const historyDetails = getWindowHistoryDetails(win);
    const url = historyDetails.url;
    const title = historyDetails.title;
    const fullTitle = setDocumentTitle(title);
    const state = { windowUrl: url, windowId: win.id, title };
    if (historyDetails.archiveTabUrl) {
      state.archiveTabUrl = historyDetails.archiveTabUrl;
      state.archiveWindowUrl = historyDetails.archiveWindowUrl;
    }
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

    const existingWindow = windowIdToUse ? openWindowById.get(windowIdToUse) : null;
    if (existingWindow) {
      activateWindow(existingWindow, { updateHistory: historyMode !== 'none' });
      return existingWindow;
    }

    const win = document.createElement('div');
    const body = document.createElement('div');
    const statusBar = isImagePopup ? null : createStatusBar();
    const contentUrl = isImagePopup ? '' : normalizeContentUrl(contentIdentifier);
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
    win.dataset.iconSrc = iconSrc || (isImagePopup ? defaultImageIcon : getIconForUrl(contentUrl));
    win._parts = {
      body,
      titleBar,
      titleText: titleBar._titleText,
      maximizeButton: titleBar._maximizeButton,
      statusBar,
      taskButton: null
    };
    win.style.position = 'absolute';
    win.style.zIndex = String(++highestZIndex);

    if (isImagePopup) {
      win.dataset.imageSrc = contentIdentifier;
      body.className = 'window-body image-popup-body';
    } else {
      win.dataset.contentUrl = contentUrl;
      body.className = 'window-body';
    }

    openWindowById.set(windowId, win);
    if (contentUrl) contentWindowByUrl.set(contentUrl, win);

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
      renderContentWindow(win, body, contentUrl);
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
    const primaryField = document.createElement('p');
    const secondaryField = document.createElement('p');

    statusBar.className = 'status-bar window-status-bar';
    statusBar.hidden = true;

    primaryField.className = 'status-bar-field';
    primaryField.dataset.statusField = 'primary';

    secondaryField.className = 'status-bar-field';
    secondaryField.dataset.statusField = 'secondary';

    statusBar.append(primaryField, secondaryField);
    statusBar._fields = {
      primary: primaryField,
      secondary: secondaryField
    };
    return statusBar;
  }

  function parseCount(value) {
    const count = parseInt(value, 10);
    return Number.isFinite(count) && count >= 0 ? count : 0;
  }

  function countDocumentUnits(text) {
    return (text || '').replace(/\s+/g, '').length;
  }

  function extractContentStatus(mainContent) {
    if (!mainContent) return null;

    if (mainContent.dataset.statusType === 'none') {
      return null;
    }

    if (mainContent.dataset.statusType === 'archive') {
      return {
        type: 'archive',
        postCount: parseCount(mainContent.dataset.postCount)
      };
    }

    if (mainContent.dataset.statusType === 'guestbook') {
      return {
        type: 'guestbook',
        commentCount: null
      };
    }

    const content = mainContent.querySelector('.post-content, .page-body');
    if (!content) return null;

    const wordCount = countDocumentUnits(content.textContent || '');
    const publishedAt = mainContent.dataset.publishedAt
      || mainContent.querySelector('.post-meta')?.textContent.replace(/^发布于:\s*/, '').trim()
      || '';

    return {
      type: 'content',
      wordCount,
      publishedAt
    };
  }

  function updateWindowStatusBar(win, status) {
    const statusBar = win?._statusBar;
    if (!statusBar) return;

    if (!status) {
      delete win.dataset.statusType;
      setWindowStatusFields(statusBar, '', '');
      return;
    }

    win.dataset.statusType = status.type || 'content';

    if (status.type === 'archive') {
      setWindowStatusFields(statusBar, `共 ${status.postCount} 篇文章`, '');
      return;
    }

    if (status.type === 'guestbook') {
      const commentText = Number.isFinite(status.commentCount)
        ? `共有 ${status.commentCount} 条评论`
        : '评论加载中...';
      setWindowStatusFields(statusBar, commentText, '');
      return;
    }

    setWindowStatusFields(
      statusBar,
      `字数: ${status.wordCount}`,
      status.publishedAt ? `发表时间: ${status.publishedAt}` : '静态页'
    );
  }

  function setWindowStatusFields(statusBar, primaryText, secondaryText) {
    const primaryField = statusBar._fields?.primary || statusBar.querySelector('[data-status-field="primary"]');
    const secondaryField = statusBar._fields?.secondary || statusBar.querySelector('[data-status-field="secondary"]');
    if (!primaryField || !secondaryField) return;

    primaryField.textContent = primaryText;
    primaryField.hidden = !primaryText;
    secondaryField.textContent = secondaryText;
    secondaryField.hidden = !secondaryText;
    statusBar.hidden = !primaryText && !secondaryText;
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
    titleBar._titleText = titleText;
    titleBar._maximizeButton = maximizeButton;
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
    const button = win._parts?.maximizeButton || win.querySelector('[data-window-action="maximize"]');
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
    ['west', 'east', 'south', 'southeast', 'northeast'].forEach((direction) => {
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
    openWindowById.delete(win.id);
    if (win.dataset.contentUrl) contentWindowByUrl.delete(win.dataset.contentUrl);
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
    return Array.from(openWindowById.values());
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
    if (!taskList || win._parts?.taskButton) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'win98-task-button';
    button.dataset.windowId = win.id;
    button.addEventListener('click', () => {
      const targetWindow = openWindowById.get(button.dataset.windowId);
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

    if (win._parts) win._parts.taskButton = button;
    taskList.appendChild(button);
    updateTaskButton(win);
  }

  function getTaskButton(win) {
    return win?._parts?.taskButton || null;
  }

  function removeTaskButton(windowId) {
    const win = openWindowById.get(windowId);
    const button = win?._parts?.taskButton || null;
    if (win?._parts) win._parts.taskButton = null;
    button?.remove();
  }

  function updateWindowTitleBars(activeWindow) {
    const activeId = !activeExternalTaskId ? activeWindow?.id || null : null;

    getOpenWindows().forEach((win) => {
      const titleBar = win._parts?.titleBar || win.querySelector('.title-bar');
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

    getOpenWindows().forEach((win) => {
      const button = getTaskButton(win);
      if (!button) return;
      const isActive = !activeExternalTaskId && button.dataset.windowId === activeId && !win?.classList.contains('is-minimized');
      button.classList.toggle('is-active', isActive);
      button.classList.toggle('is-minimized', win.classList.contains('is-minimized'));
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

  function fetchMainContent(url) {
    return fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP 错误！状态: ${response.status}`);
        return response.text();
      })
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const mainContent = doc.querySelector('#content-main');
        if (!mainContent) throw new Error('在获取的页面中未找到 #content-main 结构。');
        return mainContent;
      });
  }

  function moveMainContentChildren(target, mainContent) {
    target.replaceChildren(...Array.from(mainContent.childNodes));
  }

  function initializeGitalkPlaceholder(container, targetContainerId, uniquePageId) {
    const placeholder = container.querySelector('#gitalk-container-placeholder, .gitalk-placeholder');
    if (!placeholder) return;

    if (typeof initializeGitalkForWindow !== 'function') {
      placeholder.innerHTML = '<p style="color:red;">错误：无法找到 Gitalk 初始化函数！</p>';
      return;
    }

    placeholder.id = targetContainerId;
    placeholder.classList.remove('gitalk-placeholder');
    initializeGitalkForWindow(targetContainerId, uniquePageId);
  }

  function renderContentWindow(win, body, url) {
    body.innerHTML = '<p>加载中...</p>';
    body.classList.remove('is-archive-body');
    win.classList.remove('is-archive-window');

    fetchMainContent(url)
      .then((mainContent) => {
        const contentStatus = extractContentStatus(mainContent);
        body.classList.toggle('is-archive-body', contentStatus?.type === 'archive');
        win.classList.toggle('is-archive-window', contentStatus?.type === 'archive');

        const contentTitle = mainContent.dataset.windowTitle || mainContent.querySelector(':scope > h1')?.textContent.trim();
        if (contentTitle) {
          setWindowTitle(win, contentTitle);
        }

        mainContent.querySelector(':scope > h1')?.remove();
        mainContent.querySelector(':scope > hr')?.remove();

        moveMainContentChildren(body, mainContent);
        updateWindowStatusBar(win, contentStatus);
        initializeGitalk(body, win.id, url);
        enhanceContent(body);
        setupArchiveWorkspace(body);
        setupWindowInteractions(body);

        if (getActiveWindow() === win) writeHistory(win);
      })
      .catch((error) => {
        body.classList.remove('is-archive-body');
        win.classList.remove('is-archive-window');
        setWindowTitle(win, `${getWindowTitle(win)} (加载错误)`);
        body.innerHTML = `<p style="color: red;">加载内容出错: ${error.message}</p>`;
        updateWindowStatusBar(win, null);
      });
  }

  function createSafeDomId(prefix, value) {
    const suffix = encodeURIComponent(value || 'content')
      .replace(/%/g, '-')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'content';
    return `${prefix}-${suffix}`;
  }

  function initializeGitalk(body, windowId, contentUrl) {
    initializeGitalkPlaceholder(body, `gitalk-container-${windowId}`, contentUrl);
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
    let startTop = 0;
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
      const resizeEast = direction === 'east' || direction === 'southeast' || direction === 'northeast';
      const resizeNorth = direction === 'northeast';
      const resizeSouth = direction === 'south' || direction === 'southeast';

      let nextLeft = startLeft;
      let nextTop = startTop;
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

      if (resizeNorth) {
        const heightDelta = clamp(deltaY, Math.min(0, -startTop), startHeight - minHeight);
        nextTop = startTop + heightDelta;
        nextHeight = startHeight - heightDelta;
      }

      if (resizeSouth) {
        const maxHeight = area.height - win.offsetTop - windowMargin;
        nextHeight = clamp(startHeight + deltaY, minHeight, maxHeight);
      }

      win.style.left = `${Math.round(nextLeft)}px`;
      win.style.top = `${Math.round(nextTop)}px`;
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
      startTop = win.offsetTop;
      startWidth = win.offsetWidth;
      startHeight = win.offsetHeight;
      document.body.classList.add('is-resizing-window');
      document.body.style.setProperty('--win98-resize-cursor', getResizeCursor(direction));

      event.preventDefault();
      event.stopPropagation();
      try { handle.setPointerCapture(pointerId); } catch (error) { /* ignore */ }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', stopResize);
      document.addEventListener('pointercancel', stopResize);
    });

    handle.ondragstart = () => false;
  }

  function getResizeCursor(direction) {
    const cursors = {
      west: 'ew-resize',
      east: 'ew-resize',
      south: 'ns-resize',
      southeast: 'nwse-resize',
      northeast: 'nesw-resize'
    };
    return cursors[direction] || 'nwse-resize';
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

      if (openArchivePostInTabFromClick(target, event)) return;
      if (openImageFromClick(target, event)) return;
      openInternalLinkFromClick(target, event);
    });

    if (parent.dataset) parent.dataset.interactionListenerAttached = 'true';
  }

  function setupArchiveWorkspace(parent) {
    parent.querySelectorAll('.archive-workspace').forEach((workspace) => {
      if (workspace.dataset.archiveWorkspaceReady === 'true') return;

      cacheArchiveLinks(workspace);

      if (!workspace.style.getPropertyValue('--archive-tree-width')) {
        const initialTreeWidth = 145;
        workspace.style.setProperty('--archive-tree-width', `${initialTreeWidth}px`);
        workspace.style.setProperty('--archive-tree-min', `${initialTreeWidth}px`);
      }

      workspace.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const tab = target.closest('.archive-tab-list [role="tab"]');
        if (!tab || !workspace.contains(tab)) return;

        event.preventDefault();
        if (tab.dataset.suppressClick === 'true') {
          delete tab.dataset.suppressClick;
          return;
        }

        activateArchiveTab(workspace, tab);
      });

      workspace.addEventListener('pointerdown', (event) => startArchiveTabDrag(workspace, event));
      workspace.addEventListener('pointerdown', (event) => startArchivePaneResize(workspace, event));

      const win = workspace.closest('.window');
      const pendingTabUrl = win?.dataset.pendingArchiveTabUrl;
      if (pendingTabUrl) {
        const pendingLink = findArchiveLinkByUrl(workspace, pendingTabUrl);
        const pendingTitle = pendingLink ? getArchiveLinkTitle(pendingLink) : win.dataset.pendingArchiveTabTitle || pendingTabUrl;
        openArchivePostTab(workspace, pendingLink?.href || pendingTabUrl, pendingTitle, pendingLink, { updateHistory: false });
        delete win.dataset.pendingArchiveTabUrl;
        delete win.dataset.pendingArchiveTabTitle;
      } else {
        const firstPost = getArchiveState(workspace).links[0];
        if (firstPost) openArchivePostTab(workspace, firstPost.href, getArchiveLinkTitle(firstPost), firstPost, { historyMode: 'replaceState' });
      }

      workspace.dataset.archiveWorkspaceReady = 'true';
    });
  }

  function startArchivePaneResize(workspace, event) {
    const handle = event.target.closest('.archive-pane-resizer');
    if (!handle || !workspace.contains(handle)) return;

    event.preventDefault();

    const treePane = workspace.querySelector('.archive-tree-pane');
    const editorPane = workspace.querySelector('.archive-editor-pane');
    if (!treePane || !editorPane) return;

    const workspaceRect = workspace.getBoundingClientRect();
    const styles = getComputedStyle(workspace);
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    const minTreeWidth = parseFloat(styles.getPropertyValue('--archive-tree-min')) || 145;
    const editorMinWidth = 180;
    const maxTreeWidth = Math.max(minTreeWidth, workspaceRect.width - editorMinWidth - gap);
    let pointerId = event.pointerId;
    let active = true;

    document.body.classList.add('is-resizing-archive-pane');

    const onMove = (pointerEvent) => {
      if (!active || pointerEvent.pointerId !== pointerId) return;

      const nextWidth = clamp(pointerEvent.clientX - workspaceRect.left, minTreeWidth, maxTreeWidth);
      workspace.style.setProperty('--archive-tree-width', `${Math.round(nextWidth)}px`);
      pointerEvent.preventDefault();
    };

    const stop = (pointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      active = false;
      document.body.classList.remove('is-resizing-archive-pane');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
  }

  function getArchiveState(workspace) {
    if (!workspace._archiveState) {
      workspace._archiveState = {
        tabByUrl: new Map(),
        linkByUrl: new Map(),
        links: []
      };
    }
    return workspace._archiveState;
  }

  function cacheArchiveLinks(workspace) {
    const state = getArchiveState(workspace);
    state.linkByUrl.clear();
    state.links = Array.from(workspace.querySelectorAll('.archive-post-link'));
    state.links.forEach((link) => state.linkByUrl.set(normalizeContentUrl(link.href), link));
  }

  function findArchiveLinkByUrl(workspace, url) {
    return getArchiveState(workspace).linkByUrl.get(normalizeContentUrl(url)) || null;
  }

  function openArchivePostInTabFromClick(target, event) {
    const link = target.closest('a.archive-post-link[href]');
    if (!link) return false;

    const workspace = link.closest('.archive-workspace');
    if (!workspace) return false;

    event.preventDefault();
    event.stopPropagation();
    openArchivePostTab(workspace, link.href, getArchiveLinkTitle(link), link);
    return true;
  }

  function getArchiveLinkTitle(link) {
    return link.dataset.archiveTitle || link.textContent.trim() || '文章';
  }

  function openArchivePostTab(workspace, url, title, sourceLink, options = {}) {
    const tabList = workspace.querySelector('.archive-tab-list');
    const tabBody = workspace.querySelector('.archive-tab-body');
    if (!tabList || !tabBody) return null;

    const state = getArchiveState(workspace);
    const targetUrl = normalizeContentUrl(url);
    const existingTab = state.tabByUrl.get(targetUrl);
    if (existingTab) {
      activateArchiveTab(workspace, existingTab, options);
      setActiveArchiveLink(workspace, targetUrl);
      return existingTab;
    }

    const tab = document.createElement('li');
    const tabLink = document.createElement('a');
    const tabContent = document.createElement('div');

    tab.role = 'tab';
    tab.dataset.tabUrl = targetUrl;
    tab.dataset.tabTitle = title;
    tab.setAttribute('aria-selected', 'false');
    tabLink.href = '#tabs';
    tabLink.draggable = false;
    tabLink.textContent = title;
    tabContent.className = 'archive-tab-content';
    tabContent.innerHTML = '<p>加载中...</p>';
    tab._contentElement = tabContent;
    tab._workspace = workspace;

    tab.appendChild(tabLink);
    tabList.appendChild(tab);
    state.tabByUrl.set(targetUrl, tab);
    activateArchiveTab(workspace, tab, options);
    setActiveArchiveLink(workspace, targetUrl);
    loadArchiveTabContent(tab, targetUrl);

    return tab;
  }

  function activateArchiveTab(workspace, tab, options = {}) {
    const { updateHistory = true, historyMode = 'pushState' } = options;
    const tabList = workspace.querySelector('.archive-tab-list');
    const tabBody = workspace.querySelector('.archive-tab-body');
    if (!tabList || !tabBody || !tab) return;

    tabList.querySelectorAll('[role="tab"]').forEach((candidate) => {
      candidate.setAttribute('aria-selected', candidate === tab ? 'true' : 'false');
    });

    tabBody.replaceChildren(tab._contentElement || document.createTextNode(''));
    setActiveArchiveLink(workspace, tab.dataset.tabUrl);

    const win = workspace.closest('.window');
    if (updateHistory && win) writeHistory(win, historyMode);
  }

  function setActiveArchiveLink(workspace, targetUrl) {
    getArchiveState(workspace).links.forEach((link) => {
      const isActive = targetUrl && normalizeContentUrl(link.href) === targetUrl;
      link.classList.toggle('is-active', isActive);
      if (!isActive && document.activeElement === link) link.blur();
    });
  }

  function loadArchiveTabContent(tab, url) {
    const content = tab._contentElement;
    if (!content || tab.dataset.loaded === 'true') return;

    fetchMainContent(url)
      .then((mainContent) => {
        moveMainContentChildren(content, mainContent);
        initializeGitalkPlaceholder(content, createSafeDomId('gitalk-container-archive-tab', tab.dataset.tabUrl || url), tab.dataset.tabUrl || url);

        enhanceContent(content);
        setupWindowInteractions(content);
        tab.dataset.loaded = 'true';
      })
      .catch((error) => {
        content.innerHTML = `<p style="color: red;">加载内容出错: ${error.message}</p>`;
      });
  }

  function startArchiveTabDrag(workspace, event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const tab = target.closest('.archive-tab-list [role="tab"]');
    if (!tab || !workspace.contains(tab)) return;

    const tabList = workspace.querySelector('.archive-tab-list');
    const editorPane = workspace.querySelector('.archive-editor-pane');
    if (!tabList || !editorPane) return;

    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let didDrag = false;
    let preview = null;

    const movePreview = (pointerEvent) => {
      if (!preview) return;
      preview.style.left = `${pointerEvent.clientX + 12}px`;
      preview.style.top = `${pointerEvent.clientY + 12}px`;
    };

    const ensurePreview = (pointerEvent) => {
      if (!preview) {
        const tabRect = tab.getBoundingClientRect();
        preview = document.createElement('div');
        preview.className = 'archive-tab-drag-preview';
        preview.textContent = tab.dataset.tabTitle || tab.textContent.trim() || '文章';
        preview.style.width = `${Math.max(80, Math.round(tabRect.width))}px`;
        preview.style.height = `${Math.max(22, Math.round(tabRect.height))}px`;
        document.body.appendChild(preview);
      }
      movePreview(pointerEvent);
    };

    event.preventDefault();
    try { tab.setPointerCapture(pointerId); } catch (error) { /* ignore */ }

    const stopDrag = (pointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;

      document.body.classList.remove('is-dragging-archive-tab');
      window.getSelection()?.removeAllRanges();
      try { tab.releasePointerCapture(pointerId); } catch (error) { /* ignore */ }
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointercancel', stopDrag);

      if (preview) {
        preview.remove();
        preview = null;
      }

      if (didDrag) {
        tab.dataset.suppressClick = 'true';
        if (shouldTearOffArchiveTab(tabList, editorPane, pointerEvent)) {
          tearOffArchiveTab(workspace, tab, pointerEvent);
        }
      }
    };

    const onMove = (pointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;

      const dragDistance = Math.abs(pointerEvent.clientX - startX) + Math.abs(pointerEvent.clientY - startY);
      if (dragDistance > 8) {
        didDrag = true;
        document.body.classList.add('is-dragging-archive-tab');
        window.getSelection()?.removeAllRanges();
        pointerEvent.preventDefault();
        ensurePreview(pointerEvent);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', stopDrag);
    document.addEventListener('pointercancel', stopDrag);
  }

  function shouldTearOffArchiveTab(tabList, editorPane, event) {
    const tabListRect = tabList.getBoundingClientRect();
    const editorRect = editorPane.getBoundingClientRect();

    return event.clientX < editorRect.left
      || event.clientX > editorRect.right
      || event.clientY < tabListRect.top - 4
      || event.clientY > tabListRect.bottom + 12;
  }

  function tearOffArchiveTab(workspace, tab, event) {
    const targetUrl = tab.dataset.tabUrl;
    const title = tab.dataset.tabTitle || tab.textContent.trim() || '文章';
    if (!targetUrl) return;

    const existingWindow = findWindowByContentUrl(targetUrl);
    if (existingWindow) {
      activateWindow(existingWindow);
    } else {
      createWindow(title, targetUrl, {
        sourceX: event.clientX,
        sourceY: event.clientY,
        animateFromSource: true,
        iconSrc: getIconForUrl(targetUrl)
      });
    }

    removeArchiveTab(workspace, tab, { updateHistory: false });
  }

  function removeArchiveTab(workspace, tab, options = {}) {
    const { updateHistory = true } = options;
    const tabList = workspace.querySelector('.archive-tab-list');
    const tabBody = workspace.querySelector('.archive-tab-body');
    const wasActive = tab.getAttribute('aria-selected') === 'true';
    const nextTab = tab.nextElementSibling || tab.previousElementSibling;

    tab._contentElement?.remove();
    workspace._archiveState?.tabByUrl?.delete(tab.dataset.tabUrl);
    tab.remove();

    if (wasActive && nextTab) {
      activateArchiveTab(workspace, nextTab, { updateHistory });
      return;
    }

    if (!tabList?.querySelector('[role="tab"]')) {
      tabBody.innerHTML = '<p class="archive-empty-message">从左侧树状列表选择文章。</p>';
      setActiveArchiveLink(workspace, null);
    }
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
    const targetUrl = normalizeContentUrl(url.href);
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
    return contentWindowByUrl.get(normalizeContentUrl(url)) || null;
  }

  function findWindowForRoute(path, windowId) {
    if (windowId) {
      const win = openWindowById.get(windowId);
      if (win?.dataset.contentUrl && normalizePath(new URL(win.dataset.contentUrl, location.origin).pathname) === normalizePath(path)) {
        return win;
      }
    }

    const normalizedPath = normalizePath(path);
    return getOpenWindows().find((win) => win.dataset.contentUrl && normalizePath(new URL(win.dataset.contentUrl, location.origin).pathname) === normalizedPath) || null;
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

    if (state.archiveTabUrl) {
      const archiveWindowUrl = state.archiveWindowUrl || '/archives/';
      let win = openWindowById.get(state.windowId) || findWindowByContentUrl(archiveWindowUrl);

      if (!win) {
        win = createWindow('存档', archiveWindowUrl, {
          animateFromSource: false,
          startMaximized: true,
          windowIdToUse: state.windowId,
          historyMode: 'none'
        });
      }

      win.dataset.pendingArchiveTabUrl = state.archiveTabUrl;
      win.dataset.pendingArchiveTabTitle = state.title || '';

      const workspace = win.querySelector('.archive-workspace');
      if (workspace) {
        const link = findArchiveLinkByUrl(workspace, state.archiveTabUrl);
        openArchivePostTab(workspace, link?.href || state.archiveTabUrl, link ? getArchiveLinkTitle(link) : state.title || state.archiveTabUrl, link, { updateHistory: false });
        delete win.dataset.pendingArchiveTabUrl;
        delete win.dataset.pendingArchiveTabTitle;
      }

      activateWindow(win, { updateHistory: false });
      return;
    }

    if (isRoutablePath(path)) {
      const title = state.title || getTitleForPath(path) || path.split('/').filter(Boolean).pop() || '窗口';
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
