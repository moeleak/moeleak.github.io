document.addEventListener('DOMContentLoaded', function () {
  const musicPlayerIcon = document.getElementById('icon-musicplayer');
  let webampInstance = null;
  let musicTask = null;
  const webampWindowSelectors = ['#main-window', '#playlist-window', '#equalizer-window'];

  const getWebampRoot = () => document.getElementById('webamp');
  const getMainWindow = () => document.querySelector('#main-window') || getWebampRoot();
  const getWebampWindows = () => webampWindowSelectors
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

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
  };

  const bringMusicToFront = () => {
    const root = getWebampRoot();
    if (!root || typeof window.getWin98HighestZIndex !== 'function') return;
    root.style.zIndex = window.getWin98HighestZIndex();
    setMusicTaskState({ active: true, minimized: false });
  };

  const showMusicPlayer = () => {
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
      });
    } else {
      bringMusicToFront();
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

  const manageWebampWindowsZIndex = () => {
    getWebampWindows().forEach((element) => {
      element.addEventListener('pointerdown', bringMusicToFront);
    });

    bringMusicToFront();
  };

  const initWebamp = () => {
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
          url: "https://download.leak.moe/files/6903418f03745/%E9%BA%BB%E6%9E%9D%E5%87%86%2CKey%20Sounds%20Label%20-%20%E6%B8%9A.mp3",
        },
        {
          metaData: {
            artist: "折戸伸治",
            title: "潮鳴り",
          },
          url: "https://download.leak.moe/files/6903418dc87e8/%E6%8A%98%E6%88%B8%E4%BC%B8%E6%B2%BB%20-%20%E6%BD%AE%E9%B3%B4%E3%82%8A.mp3",
        },
        {
          metaData: {
            artist: "Arte Refact",
            title: "月に寄りそう乙女の夜の作法",
          },
          url: "https://download.leak.moe/files/690341812b3d5/Arte%20Refact%20-%20%E6%9C%88%E3%81%AB%E5%AF%84%E3%82%8A%E3%81%9D%E3%81%86%E4%B9%99%E5%A5%B3%E3%81%AE%E5%A4%9C%E3%81%AE%E4%BD%9C%E6%B3%95.flac"
        },
        {
          metaData: {
            artist: "市川淳",
            title: "ヨスガノソラ メインテーマ -記憶-.mp3",
          },
          url: "https://download.leak.moe/files/6903418728930/%E5%B8%82%E5%B7%9D%E6%B7%B3%20-%20%E3%83%A8%E3%82%B9%E3%82%AB%E3%82%99%E3%83%8E%E3%82%BD%E3%83%A9%20%E3%83%A1%E3%82%A4%E3%83%B3%E3%83%86%E3%83%BC%E3%83%9E%20-%E8%A8%98%E6%86%B6-.mp3"
        },
        {
          metaData: {
            artist: "张学友",
            title: "遥远的她",
          },
          url: "https://download.leak.moe/files/6903418c8173f/%E5%BC%A0%E5%AD%A6%E5%8F%8B%20-%20%E9%81%A5%E8%BF%9C%E7%9A%84%E5%A5%B9.flac"
        },
        {
          metaData: {
            artist: "张学友",
            title: "她来听我的演唱会",
          },
          url: "https://download.leak.moe/files/6903418833671/%E5%BC%A0%E5%AD%A6%E5%8F%8B%20-%20%E5%A5%B9%E6%9D%A5%E5%90%AC%E6%88%91%E7%9A%84%E6%BC%94%E5%94%B1%E4%BC%9A.flac"
        },
        {
          metaData: {
            artist: "张学友",
            title: "蓝雨",
          },
          url: "https://download.leak.moe/files/6903418b23e30/%E5%BC%A0%E5%AD%A6%E5%8F%8B%20-%20%E8%93%9D%E9%9B%A8.flac"
        },
        {
          metaData: {
            artist: "Mili",
            title: "world.execute (me) ;",
          },
          url: "https://download.leak.moe/files/69034186240b9/Mili%20-%20world.execute%20(me)%20%3B.mp3"
        },
        {
          metaData: {
            artist: "ClariS",
            title: "コネクト",
          },
          url: "https://download.leak.moe/files/69034184a25a8/ClariS%20-%20%E3%82%B3%E3%83%8D%E3%82%AF%E3%83%88.mp3"
        },
        {
          metaData: {
            artist: "宋冬野",
            title: "董小姐",
          },
          url: "https://download.leak.moe/share/6903446d50625/%E8%91%A3%E5%B0%8F%E5%A7%90%20-%20%E5%AE%8B%E5%86%AC%E9%87%8E.m4a"
        },
      ],
      initialSkin: {
        url: "/skins/dango_takegasuki.wsz",
      },
      });

    return webamp.renderWhenReady(document.getElementById('webamp-container')).then(() => {
      webampInstance = webamp;
      registerMusicTask();
      setWebampVisible(true);
      setTimeout(manageWebampWindowsZIndex, 0);
      return webamp;
    });
  };

  musicPlayerIcon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    showMusicPlayer();
  });
});

