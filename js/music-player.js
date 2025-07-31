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
            initialTracks: [{
                metaData: {
                    artist: "Key Sounds Label",
                    title: "渚",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/%E9%BA%BB%E6%9E%9D%E5%87%86,Key%20Sounds%20Label%20-%20%E6%B8%9A.mp3",
            }, {
                metaData: {
                    artist: "折戸伸治",
                    title: "潮鳴り",
                },
                url: "https://download.leak.moe/share/688af0e6e6b70/%E6%8A%98%E6%88%B8%E4%BC%B8%E6%B2%BB%20-%20%E6%BD%AE%E9%B3%B4%E3%82%8A.mp3",
            }],
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
