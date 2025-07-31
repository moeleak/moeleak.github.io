document.addEventListener('DOMContentLoaded', function () {
    const musicPlayerIcon = document.getElementById('icon-musicplayer');
    const webampContainer = document.getElementById('webamp-container');
    let webampInstance = null;

    if (!musicPlayerIcon || !webampContainer) {
        console.error('Required elements for music player not found.');
        return;
    }

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
                url: "https://download.leak.moe/share/688af0e6e6b70/%E9%BA%BB%E6%9E%9D%E5%87%86,Key%20Sounds%20Label%20-%20%E6%B8%9A.mp3",
              },
              {
                metaData: {
                    artist: "折戸伸治",
                    title: "潮鳴り",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/%E6%8A%98%E6%88%B8%E4%BC%B8%E6%B2%BB%20-%20%E6%BD%AE%E9%B3%B4%E3%82%8A.mp3",
              },
              {
                metaData: {
                    artist: "Arte Refact",
                    title: "月に寄りそう乙女の夜の作法",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/Arte%20Refact%20-%20%E6%9C%88%E3%81%AB%E5%AF%84%E3%82%8A%E3%81%9D%E3%81%86%E4%B9%99%E5%A5%B3%E3%81%AE%E5%A4%9C%E3%81%AE%E4%BD%9C%E6%B3%95.flac"
              },
              {
              metaData: {
                    artist: "市川淳",
                    title: "ヨスガノソラ メインテーマ -記憶-.mp3",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/%E5%B8%82%E5%B7%9D%E6%B7%B3%20-%20%E3%83%A8%E3%82%B9%E3%82%AB%E3%82%99%E3%83%8E%E3%82%BD%E3%83%A9%20%E3%83%A1%E3%82%A4%E3%83%B3%E3%83%86%E3%83%BC%E3%83%9E%20-%E8%A8%98%E6%86%B6-.mp3"
              },
              {
              metaData: {
                    artist: "张学友",
                    title: "遥远的她",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/%E5%BC%A0%E5%AD%A6%E5%8F%8B%20-%20%E9%81%A5%E8%BF%9C%E7%9A%84%E5%A5%B9.flac"
              },
              {
              metaData: {
                    artist: "张学友",
                    title: "她来听我的演唱会",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/%E5%BC%A0%E5%AD%A6%E5%8F%8B%20-%20%E5%A5%B9%E6%9D%A5%E5%90%AC%E6%88%91%E7%9A%84%E6%BC%94%E5%94%B1%E4%BC%9A.flac"
              },
              {
              metaData: {
                    artist: "张学友",
                    title: "蓝雨",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/%E5%BC%A0%E5%AD%A6%E5%8F%8B%20-%20%E8%93%9D%E9%9B%A8.flac"
              },
              {
              metaData: {
                    artist: "Mili",
                    title: "world.execute (me) ;",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/Mili%20-%20world.execute%20(me)%20;.mp3"
              },
              {
              metaData: {
                    artist: "ClariS",
                    title: "コネクト",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/ClariS%20-%20%E3%82%B3%E3%83%8D%E3%82%AF%E3%83%88.mp3"
              },
              {
              metaData: {
                    artist: "wowoka / 初音ミク",
                    title: "アンノウン マザーグース",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/wowaka,%E5%88%9D%E9%9F%B3%E3%83%9F%E3%82%AF%20-%20%E3%82%A2%E3%83%B3%E3%83%8E%E3%82%A6%E3%83%B3%20%E3%83%9E%E3%82%B5%E3%82%99%E3%83%BC%E3%82%AF%E3%82%99%E3%83%BC%E3%82%B9.flac"
              },
            ],
            initialSkin: {
              url: "/skins/SamuraiCory-Homura2.wsz",
            },
            
            /*
            __initialWindowLayout: {
                main: { position: { x: 20, y: 20 } },
                playlist: { position: { x: 20, y: 135 } },
            },
            */
        });

        return webamp.renderWhenReady(webampContainer).then(() => {
            webampInstance = webamp;
            return webamp;
        });
    };

    musicPlayerIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();

        const webampWindow = webampContainer.querySelector('#main-window');

        if (webampWindow) {
            webampWindow.style.display = 'block';
            if (webampInstance) {
                const playlist = webampContainer.querySelector('#playlist-window');
                if(playlist) playlist.style.display = 'block';
            }
        } else {
            initWebamp();
        }
    });
});
