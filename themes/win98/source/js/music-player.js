document.addEventListener('DOMContentLoaded', function () {
  const musicPlayerIcon = document.getElementById('icon-musicplayer');
  let webampInstance = null;
  let musicTask = null;
  let isClosed = false;
  const webampWindowSelectors = ['#main-window', '#playlist-window', '#equalizer-window'];
  const webampLayoutSelectors = ['#webamp', ...webampWindowSelectors];
  const shakeDuration = 280;
  const musicDragPositionGrid = 16;

  const getWebampContainer = () => document.getElementById('webamp-container');
  const getWebampRoot = () => document.getElementById('webamp');
  const getMainWindow = () => document.querySelector('#main-window') || getWebampRoot();
  const getWebampWindows = () => webampWindowSelectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);
  const hasMusicUi = () => !!getWebampRoot() || getWebampWindows().length > 0;
  const requestLayoutSave = () => window.Win98Shell?.requestLayoutSave?.();
  const quantizeMusicDragValue = (value) => Math.round(value / musicDragPositionGrid) * musicDragPositionGrid;

  const getInlineStyleSnapshot = (element) => ({
    display: element.style.display || '',
    left: element.style.left || '',
    top: element.style.top || '',
    right: element.style.right || '',
    bottom: element.style.bottom || '',
    width: element.style.width || '',
    height: element.style.height || '',
    zIndex: element.style.zIndex || '',
    transform: element.style.transform || ''
  });

  const applyInlineStyleSnapshot = (element, styleSnapshot = {}) => {
    ['display', 'left', 'top', 'right', 'bottom', 'width', 'height', 'zIndex', 'transform'].forEach((property) => {
      if (typeof styleSnapshot[property] === 'string') {
        element.style[property] = styleSnapshot[property];
      }
    });
  };

  const getMusicLayoutSnapshot = () => {
    const open = hasMusicUi() && !isClosed;

    return {
      open,
      minimized: open ? !isMusicVisible() : false,
      active: open ? musicTask?.button.classList.contains('is-active') || false : false,
      elements: webampLayoutSelectors.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        return {
          selector,
          style: getInlineStyleSnapshot(element)
        };
      }).filter(Boolean)
    };
  };

  const restoreMusicLayoutSnapshot = (snapshot) => {
    if (!snapshot?.open) return;

    (snapshot.elements || []).forEach((item) => {
      const element = item?.selector ? document.querySelector(item.selector) : null;
      if (element) applyInlineStyleSnapshot(element, item.style);
    });

    if (snapshot.minimized) {
      setWebampVisible(false);
      setMusicTaskState({ active: false, minimized: true });
      requestLayoutSave();
      return;
    }

    setWebampVisible(true);
    if (snapshot.active) {
      bringMusicToFront();
    } else {
      setMusicTaskState({ active: false, minimized: false });
    }
    requestLayoutSave();
  };

  const cleanupClosedMusicPlayer = () => {
    musicTask?.remove();
    musicTask = null;
    webampInstance = null;
    isClosed = false;

    getWebampRoot()?.remove();
    getWebampWindows().forEach((element) => element.remove());
    getWebampContainer()?.replaceChildren();
    requestLayoutSave();
  };

  const syncMusicPlayerState = () => {
    if (webampInstance && isClosed) return false;
    if (hasMusicUi()) return false;
    cleanupClosedMusicPlayer();
    return true;
  };

  const triggerShake = (elements) => {
    const targets = elements.filter(Boolean);
    targets.forEach((element) => {
      element.classList.remove('window-shake');
      void element.offsetWidth;
      element.classList.add('window-shake');
    });

    if (!targets.length) return;
    window.setTimeout(() => {
      targets.forEach((element) => element.classList.remove('window-shake'));
    }, shakeDuration);
  };

  const shakeMusicPlayer = () => {
    const root = getWebampRoot();
    const windows = getWebampWindows().filter((element) => element.style.display !== 'none');
    triggerShake(root ? [root] : windows);
  };

  const quantizePixelStyle = (element, property) => {
    const value = element.style[property];
    const match = /^\s*(-?\d+(?:\.\d+)?)px\s*$/.exec(value || '');
    if (!match) return;

    element.style[property] = `${quantizeMusicDragValue(Number(match[1]))}px`;
  };

  const quantizeTransformTranslate = (element) => {
    const transform = element.style.transform;
    if (!transform || !transform.includes('translate')) return;

    element.style.transform = transform
      .replace(/translate3d\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/g, (_, x, y, z) => (
        `translate3d(${quantizeMusicDragValue(Number(x))}px, ${quantizeMusicDragValue(Number(y))}px, ${z}px)`
      ))
      .replace(/translate\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/g, (_, x, y) => (
        `translate(${quantizeMusicDragValue(Number(x))}px, ${quantizeMusicDragValue(Number(y))}px)`
      ))
      .replace(/translateX\(\s*(-?\d+(?:\.\d+)?)px\s*\)/g, (_, x) => (
        `translateX(${quantizeMusicDragValue(Number(x))}px)`
      ))
      .replace(/translateY\(\s*(-?\d+(?:\.\d+)?)px\s*\)/g, (_, y) => (
        `translateY(${quantizeMusicDragValue(Number(y))}px)`
      ));
  };

  const quantizeWebampWindowPosition = (element) => {
    quantizePixelStyle(element, 'left');
    quantizePixelStyle(element, 'top');
    quantizeTransformTranslate(element);
  };

  const installWebampDragPixelGrid = (element) => {
    if (!element || element.dataset.win98MusicDragGrid === 'true') return;
    element.dataset.win98MusicDragGrid = 'true';

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let frame = null;
    let hasMoved = false;

    const flushPosition = () => {
      frame = null;
      quantizeWebampWindowPosition(element);
    };

    const schedulePositionFlush = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(flushPosition);
    };

    const onMove = (event) => {
      if (event.pointerId !== pointerId) return;

      if (!hasMoved && Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) > 3) {
        hasMoved = true;
        element.classList.add('is-music-dragging-active-window');
      }

      schedulePositionFlush();
    };

    const stopDrag = (event) => {
      if (event.pointerId !== pointerId) return;

      if (frame !== null) {
        cancelAnimationFrame(frame);
        flushPosition();
      } else {
        quantizeWebampWindowPosition(element);
      }

      element.classList.remove('is-music-dragging-active-window');
      pointerId = null;
      hasMoved = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', stopDrag);
      document.removeEventListener('pointercancel', stopDrag);
      requestLayoutSave();
    };

    element.addEventListener('pointerdown', (event) => {
      if (pointerId !== null) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      hasMoved = false;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', stopDrag);
      document.addEventListener('pointercancel', stopDrag);
    });
  };

  const isMusicVisible = () => {
    const root = getWebampRoot();
    const mainWindow = document.querySelector('#main-window');
    return !!root && root.style.display !== 'none' && !!mainWindow && mainWindow.style.display !== 'none';
  };

  const registerMusicTask = () => {
    if (musicTask || !window.Win98Shell?.registerTask) return musicTask;

    musicTask = window.Win98Shell.registerTask({
      id: 'music-player',
      title: '音乐播放器',
      iconSrc: musicPlayerIcon.querySelector('img')?.getAttribute('src') || '/images/icon_musicplayer.png',
      onClick: () => {
        syncMusicPlayerState();

        if (!webampInstance && !document.querySelector('#main-window')) {
          initWebamp();
          return;
        }

        if (isMusicVisible() && musicTask?.button.classList.contains('is-active')) {
          minimizeMusicPlayer();
        } else {
          showMusicPlayer();
        }
      }
    });

    return musicTask;
  };

  const setMusicTaskState = ({ active, minimized }) => {
    const task = registerMusicTask();
    task?.setActive(active);
    task?.setMinimized(minimized);
  };

  const setWebampVisible = (visible) => {
    const root = getWebampRoot();
    if (root) root.style.display = visible ? 'block' : 'none';

    getWebampWindows().forEach((element) => {
      if (visible && element.style.display === 'none') {
        element.style.display = 'block';
      }
    });
    requestLayoutSave();
  };

  const bringMusicToFront = () => {
    const root = getWebampRoot();
    if (!root || typeof window.getWin98HighestZIndex !== 'function') return;
    root.style.zIndex = window.getWin98HighestZIndex();
    setMusicTaskState({ active: true, minimized: false });
    requestLayoutSave();
  };

  const reopenMusicPlayer = (options = {}) => {
    const { onShown } = options;

    if (!webampInstance || typeof webampInstance.reopen !== 'function') {
      cleanupClosedMusicPlayer();
      initWebamp();
      return;
    }

    isClosed = false;
    webampInstance.reopen();
    registerMusicTask();

    window.setTimeout(() => {
      setWebampVisible(true);
      manageWebampWindowsZIndex();
      onShown?.();
    }, 0);
  };

  const showMusicPlayer = (options = {}) => {
    const { onShown } = options;
    syncMusicPlayerState();

    if (webampInstance && isClosed) {
      reopenMusicPlayer({ onShown });
      return;
    }

    if (!webampInstance && !document.querySelector('#main-window')) {
      initWebamp();
      return;
    }

    const task = registerMusicTask();
    setWebampVisible(true);
    const root = getWebampRoot();
    const mainWindow = getMainWindow();

    if (root && mainWindow && task?.animateFromButton) {
      root.style.visibility = 'hidden';
      task.animateFromButton(mainWindow, () => {
        root.style.visibility = '';
        bringMusicToFront();
        onShown?.();
      });
    } else {
      bringMusicToFront();
      onShown?.();
    }
  };

  const minimizeMusicPlayer = () => {
    const task = registerMusicTask();
    const root = getWebampRoot();
    const mainWindow = getMainWindow();

    if (!root) return;

    const finish = () => {
      setWebampVisible(false);
      setMusicTaskState({ active: false, minimized: true });
    };

    if (mainWindow && task?.animateToButton) {
      root.style.visibility = 'hidden';
      task.animateToButton(mainWindow, () => {
        root.style.visibility = '';
        finish();
      });
    } else {
      finish();
    }
  };

  if (!musicPlayerIcon) {
    console.error('Required elements for music player not found.');
    return;
  }

  window.Win98MusicPlayer = {
    getLayoutSnapshot: getMusicLayoutSnapshot
  };

  const manageWebampWindowsZIndex = (options = {}) => {
    const { activate = true } = options;

    getWebampWindows().forEach((element) => {
      element.addEventListener('pointerdown', bringMusicToFront);
      installWebampDragPixelGrid(element);
    });

    if (activate) bringMusicToFront();
  };

  const initWebamp = (options = {}) => {
    const { layoutSnapshot = null } = options;

    if (webampInstance) {
      webampInstance.dispose();
    }

    const webamp = new Webamp({
      initialTracks: [
        {
          metaData: {
            artist: "Key Sounds Label",
            title: "渚",
          },
          url: "https://box.leak.moe/blog/music/Key%20Sounds%20Label%20-%20%E6%B8%9A.mp3",
        },
        {
          metaData: {
            artist: "折戸伸治",
            title: "潮鳴り",
          },
          url: "https://box.leak.moe/blog/music/%E6%8A%98%E6%88%B8%E4%BC%B8%E6%B2%BB%20-%20%E6%BD%AE%E9%B3%B4%E3%82%8A.mp3",
        },
        {
          metaData: {
            artist: "Arte Refact",
            title: "月に寄りそう乙女の夜の作法",
          },
          url: "https://box.leak.moe/blog/music/Arte%20Refact%20-%20%E6%9C%88%E3%81%AB%E5%AF%84%E3%82%8A%E3%81%9D%E3%81%86%E4%B9%99%E5%A5%B3%E3%81%AE%E5%A4%9C%E3%81%AE%E4%BD%9C%E6%B3%95.flac"
        },
        {
          metaData: {
            artist: "市川淳",
            title: "ヨスガノソラ メインテーマ -記憶-.mp3",
          },
          url: "https://box.leak.moe/blog/music/%E5%B8%82%E5%B7%9D%E6%B7%B3%20-%20%E3%83%A8%E3%82%B9%E3%82%AB%E3%82%99%E3%83%8E%E3%82%BD%E3%83%A9%20%E3%83%A1%E3%82%A4%E3%83%B3%E3%83%86%E3%83%BC%E3%83%9E%20-%E8%A8%98%E6%86%B6-.mp3"
        },
        {
          metaData: {
            artist: "张学友",
            title: "遥远的她",
          },
          url: "https://box.leak.moe/blog/music/%E5%BC%A0%E5%AD%A6%E5%8F%8B%20-%20%E9%81%A5%E8%BF%9C%E7%9A%84%E5%A5%B9.flac"
        },
        {
          metaData: {
            artist: "张学友",
            title: "她来听我的演唱会",
          },
          url: "https://box.leak.moe/blog/music/%E5%BC%A0%E5%AD%A6%E5%8F%8B%20-%20%E5%A5%B9%E6%9D%A5%E5%90%AC%E6%88%91%E7%9A%84%E6%BC%94%E5%94%B1%E4%BC%9A.flac"
        },
        {
          metaData: {
            artist: "张学友",
            title: "蓝雨",
          },
          url: "https://box.leak.moe/blog/music/%E5%BC%A0%E5%AD%A6%E5%8F%8B%20-%20%E8%93%9D%E9%9B%A8.flac"
        },
        {
          metaData: {
            artist: "Mili",
            title: "world.execute (me) ;",
          },
          url: "https://box.leak.moe/blog/music/Mili%20-%20world.execute%20(me)%20%3B.mp3"
        },
        {
          metaData: {
            artist: "ClariS",
            title: "コネクト",
          },
          url: "https://box.leak.moe/blog/music/ClariS%20-%20%E3%82%B3%E3%83%8D%E3%82%AF%E3%83%88.mp3"
        },
        {
          metaData: {
            artist: "宋冬野",
            title: "董小姐",
          },
          url: "https://box.leak.moe/blog/music/%E5%AE%8B%E5%86%AC%E9%87%8E%20-%20%E8%91%A3%E5%B0%8F%E5%A7%90.m4a"
        },
      ],
      initialSkin: {
        url: "/skins/dango_takegasuki.wsz",
      },
      });

    webamp.onClose(() => {
      isClosed = true;
      musicTask?.remove();
      musicTask = null;
      requestLayoutSave();
    });

    return webamp.renderWhenReady(getWebampContainer()).then(() => {
      webampInstance = webamp;
      isClosed = false;
      registerMusicTask();
      setWebampVisible(true);
      setTimeout(() => {
        manageWebampWindowsZIndex({ activate: !layoutSnapshot || layoutSnapshot.active });
        if (layoutSnapshot) restoreMusicLayoutSnapshot(layoutSnapshot);
        else requestLayoutSave();
      }, 0);
      return webamp;
    });
  };

  musicPlayerIcon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    syncMusicPlayerState();

    if (webampInstance && isClosed) {
      reopenMusicPlayer();
      return;
    }

    if (!webampInstance && !document.querySelector('#main-window')) {
      initWebamp();
      return;
    }

    if (isMusicVisible()) {
      bringMusicToFront();
      shakeMusicPlayer();
      return;
    }

    showMusicPlayer();
  });

  const savedMusicLayout = window.Win98Shell?.getSavedLayoutSnapshot?.()?.musicPlayer;
  if (savedMusicLayout?.open) {
    initWebamp({ layoutSnapshot: savedMusicLayout });
  }
});
