// ==UserScript==
// @name         SoundCloud Bulk Playlist Adder - Native UI Fixed
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Select multiple tracks and add them to a playlist with native SoundCloud UI
// @author       You
// @match        https://soundcloud.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    let selectMode = false;
    let selectedCount = 0;

    GM_addStyle(`
      .sc-bulk-select {
        margin-right: 12px;
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #ff5500;
        flex-shrink: 0;
      }
      .sc-bulk-track-item {
        display: flex;
        align-items: center;
        min-height: 40px;
      }
      .sc-bulk-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        padding: 12px 20px;
        border-bottom: 1px solid #e5e5e5;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .sc-bulk-header-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      .sc-bulk-header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .sc-bulk-button {
        background: #f50;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }
      .sc-bulk-button:hover {
        background: #ff3300;
      }
      .sc-bulk-button-secondary {
        background: transparent;
        color: #999;
        border: 1px solid #e5e5e5;
      }
      .sc-bulk-button-secondary:hover {
        background: #f8f8f8;
        color: #666;
      }
      .sc-bulk-button:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      .sc-bulk-playlist-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10001;
        width: 400px;
        max-width: 90vw;
        max-height: 80vh;
        overflow: hidden;
      }
      .sc-bulk-modal-header {
        padding: 20px;
        border-bottom: 1px solid #e5e5e5;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .sc-bulk-modal-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }
      .sc-bulk-modal-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
      }
      .sc-bulk-modal-content {
        padding: 20px;
        max-height: 400px;
        overflow-y: auto;
      }
      .sc-bulk-playlist-item {
        display: flex;
        align-items: center;
        padding: 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
        margin-bottom: 4px;
      }
      .sc-bulk-playlist-item:hover {
        background: #f8f8f8;
      }
      .sc-bulk-playlist-item.selected {
        background: #f0f7ff;
      }
      .sc-bulk-playlist-info {
        flex: 1;
        margin-left: 12px;
      }
      .sc-bulk-playlist-name {
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }
      .sc-bulk-playlist-count {
        font-size: 12px;
        color: #999;
      }
      .sc-bulk-modal-footer {
        padding: 16px 20px;
        border-top: 1px solid #e5e5e5;
        text-align: right;
      }
      .sc-bulk-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
      }
      .sc-bulk-loading {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #fff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      /* トラックリストの特定のレイアウト用スタイル */
      .soundList .sc-bulk-track-item,
      .sc-list .sc-bulk-track-item,
      .trackList .sc-bulk-track-item {
        padding: 8px 0;
      }
    `);

    function createPlaylistModal(playlists, selectedCount) {
        const overlay = document.createElement('div');
        overlay.className = 'sc-bulk-overlay';

        const modal = document.createElement('div');
        modal.className = 'sc-bulk-playlist-modal';

        modal.innerHTML = `
            <div class="sc-bulk-modal-header">
                <div class="sc-bulk-modal-title">プレイリストに追加</div>
                <button class="sc-bulk-modal-close">&times;</button>
            </div>
            <div class="sc-bulk-modal-content">
                <div style="margin-bottom: 16px; color: #666;">
                    ${selectedCount}曲を追加します
                </div>
                ${playlists.map((playlist, index) => `
                    <div class="sc-bulk-playlist-item" data-playlist-id="${playlist.id}">
                        <input type="radio" name="playlist" id="playlist-${index}"
                               value="${playlist.id}" ${index === 0 ? 'checked' : ''}>
                        <div class="sc-bulk-playlist-info">
                            <div class="sc-bulk-playlist-name">${playlist.title}</div>
                            <div class="sc-bulk-playlist-count">${playlist.track_count}曲</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="sc-bulk-modal-footer">
                <button class="sc-bulk-button-secondary" id="sc-bulk-cancel">キャンセル</button>
                <button class="sc-bulk-button" id="sc-bulk-confirm">追加</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        return new Promise((resolve) => {
            const closeModal = () => {
                overlay.remove();
                resolve(null);
            };

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });

            modal.querySelector('.sc-bulk-modal-close').addEventListener('click', closeModal);
            modal.querySelector('#sc-bulk-cancel').addEventListener('click', closeModal);

            modal.querySelector('#sc-bulk-confirm').addEventListener('click', () => {
                const selected = modal.querySelector('input[name="playlist"]:checked');
                if (selected) {
                    overlay.remove();
                    resolve(selected.value);
                }
            });

            modal.querySelectorAll('.sc-bulk-playlist-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.type !== 'radio') {
                        const radio = item.querySelector('input[type="radio"]');
                        radio.checked = true;
                        modal.querySelectorAll('.sc-bulk-playlist-item').forEach(i => {
                            i.classList.remove('selected');
                        });
                        item.classList.add('selected');
                    }
                });
            });
        });
    }

    function createHeader() {
        const header = document.createElement('div');
        header.className = 'sc-bulk-header';
        header.innerHTML = `
            <div class="sc-bulk-header-title">${selectedCount}曲選択中</div>
            <div class="sc-bulk-header-actions">
                <button class="sc-bulk-button-secondary" id="sc-bulk-cancel">キャンセル</button>
                <button class="sc-bulk-button" id="sc-bulk-add" ${selectedCount === 0 ? 'disabled' : ''}>
                    ${selectedCount === 0 ? '曲を選択' : 'プレイリストに追加'}
                </button>
            </div>
        `;
        return header;
    }

    function updateHeader() {
        const header = document.querySelector('.sc-bulk-header');
        if (header) {
            header.querySelector('.sc-bulk-header-title').textContent = `${selectedCount}曲選択中`;
            const addButton = header.querySelector('#sc-bulk-add');
            addButton.textContent = selectedCount === 0 ? '曲を選択' : 'プレイリストに追加';
            addButton.disabled = selectedCount === 0;
        }
    }

    function getTrackElements() {
        // より包括的なセレクター
        const selectors = [
            'a[href*="/soundcloud.com/"][href*="/"]:not([href*="/sets/"])',
            '.soundTitle__title',
            '.trackItem__title',
            '.trackItem__trackTitle',
            '.sc-link-primary',
            '.sc-media-content a[href*="/"]',
            '.soundList__item a',
            '.sc-list-item a',
            '[data-testid="track-item"] a',
            '.trackItem a'
        ];

        let trackElements = [];
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.href &&
                        el.href.includes('/soundcloud.com/') &&
                        !el.href.includes('/sets/') &&
                        !el.closest('.sc-bulk-track-item') &&
                        !el.querySelector('.sc-bulk-select')) {
                        trackElements.push(el);
                    }
                });
            } catch (e) {
                console.log('Selector error:', selector, e);
            }
        });

        return trackElements.filter((el, index, self) =>
            index === self.findIndex(t => t.href === el.href)
        );
    }

    function findTrackContainer(element) {
        const containerSelectors = [
            '.trackItem',
            '.sc-list-item',
            '.sc-media-list-item',
            '.soundList__item',
            '.sc-type-tracks',
            'li',
            '.sc-ministats-item',
            '[data-testid="track-item"]',
            '.trackList__item',
            '.soundList__item'
        ];

        for (const selector of containerSelectors) {
            const container = element.closest(selector);
            if (container) return container;
        }

        // コンテナが見つからない場合は、トラックリンクを含む適切な親要素を探す
        let parent = element.parentElement;
        while (parent && parent !== document.body) {
            if (parent.querySelector('a[href*="/soundcloud.com/"]')) {
                return parent;
            }
            parent = parent.parentElement;
        }

        return element.parentElement;
    }

    function injectCheckboxes() {
        if (!selectMode) return;

        const trackElements = getTrackElements();
        console.log('Found track elements:', trackElements.length);

        trackElements.forEach(trackElement => {
            try {
                const container = findTrackContainer(trackElement);
                if (!container) return;

                // すでにチェックボックスがある場合はスキップ
                if (container.querySelector('.sc-bulk-select')) return;

                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.className = "sc-bulk-select";
                cb.dataset.trackUrl = trackElement.href;

                cb.addEventListener('change', () => {
                    selectedCount += cb.checked ? 1 : -1;
                    updateHeader();
                });

                // 既存のコンテンツを保持しながらチェックボックスを追加
                if (container.classList.contains('sc-bulk-track-item')) {
                    // すでにラッパーされている場合は先頭に追加
                    container.insertBefore(cb, container.firstChild);
                } else {
                    // 新しいラッパーを作成
                    const wrapper = document.createElement("div");
                    wrapper.className = "sc-bulk-track-item";

                    // 元のコンテンツを保持
                    const originalContent = container.innerHTML;
                    wrapper.innerHTML = originalContent;

                    // チェックボックスを先頭に追加
                    wrapper.insertBefore(cb, wrapper.firstChild);

                    // 元のコンテナを置換
                    container.innerHTML = '';
                    container.appendChild(wrapper);
                }
            } catch (error) {
                console.error('Error injecting checkbox:', error);
            }
        });
    }

    function cleanupCheckboxes() {
        document.querySelectorAll('.sc-bulk-track-item').forEach(wrapper => {
            if (wrapper.parentElement) {
                // ラッパーを解除して元の状態に戻す
                const content = wrapper.innerHTML;
                wrapper.outerHTML = content;
            }
        });

        document.querySelectorAll('.sc-bulk-select').forEach(cb => {
            cb.remove();
        });

        selectedCount = 0;
    }

    const observer = new MutationObserver(() => {
        if (selectMode) {
            // 少し遅延させてDOMの更新を待つ
            setTimeout(injectCheckboxes, 100);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    async function fetchPlaylists() {
        const token = document.cookie.match(/oauth_token=([^;]+)/)?.[1];
        if (!token) return [];
        try {
            const resMe = await fetch("https://api-v2.soundcloud.com/me?client_id=ZhY1ZEiuWYBY7krRgevXg7fRXCIaRw6r", {
                headers: { "Authorization": `OAuth ${token}` },
                credentials: "include"
            });
            const me = await resMe.json();
            const userId = me.id;

            const res = await fetch(`https://api-v2.soundcloud.com/users/${userId}/playlists?limit=50&linked_partitioning=1&client_id=ZhY1ZEiuWYBY7krRgevXg7fRXCIaRw6r`, {
                headers: { "Authorization": `OAuth ${token}` },
                credentials: "include"
            });
            const data = await res.json();
            return data.collection || [];
        } catch (error) {
            console.error('プレイリスト取得エラー:', error);
            return [];
        }
    }

    async function getPlaylistTracks(playlistId) {
        const token = document.cookie.match(/oauth_token=([^;]+)/)?.[1];
        if (!token) return [];

        try {
            const res = await fetch(`https://api-v2.soundcloud.com/playlists/${playlistId}?client_id=ZhY1ZEiuWYBY7krRgevXg7fRXCIaRw6r`, {
                headers: { "Authorization": `OAuth ${token}` },
                credentials: "include"
            });

            if (res.ok) {
                const playlistData = await res.json();
                return playlistData.tracks || [];
            }
        } catch (e) {
            console.error("プレイリストの取得に失敗", e);
        }

        return [];
    }

    async function resolveTrackId(url) {
        const token = document.cookie.match(/oauth_token=([^;]+)/)?.[1];
        if (!token) return null;
        try {
            const apiUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=ZhY1ZEiuWYBY7krRgevXg7fRXCIaRw6r`;
            const res = await fetch(apiUrl, {
                headers: { "Authorization": `OAuth ${token}` },
                credentials: "include"
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.id || null;
        } catch (error) {
            console.error('トラック解決エラー:', error);
            return null;
        }
    }

    async function addTracksToPlaylist(playlistId, newTrackIds) {
        if (!playlistId || !newTrackIds.length) return false;

        const token = document.cookie.match(/oauth_token=([^;]+)/)?.[1];
        if (!token) return false;

        try {
            const existingTracks = await getPlaylistTracks(playlistId);
            const existingTrackIds = existingTracks.map(track => track.id);

            const allTrackIds = [...new Set([...existingTrackIds, ...newTrackIds])];

            const url = `https://api-v2.soundcloud.com/playlists/${playlistId}?client_id=ZhY1ZEiuWYBY7krRgevXg7fRXCIaRw6r`;
            const body = { playlist: { tracks: allTrackIds.map(id => Number(id)) } };

            const res = await fetch(url, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `OAuth ${token}`
                },
                body: JSON.stringify(body)
            });

            return res.ok;
        } catch (e) {
            console.error("追加エラー:", e);
            return false;
        }
    }

    function startSelectionMode() {
        selectMode = true;
        selectedCount = 0;

        const header = createHeader();
        document.body.appendChild(header);

        // 初期チェックボックス注入
        setTimeout(injectCheckboxes, 500);

        header.querySelector('#sc-bulk-cancel').addEventListener('click', () => {
            stopSelectionMode();
        });

        header.querySelector('#sc-bulk-add').addEventListener('click', async () => {
            if (selectedCount === 0) return;

            const selectedUrls = [...document.querySelectorAll(".sc-bulk-select:checked")]
                .map(cb => cb.dataset.trackUrl)
                .filter(Boolean);

            const playlists = await fetchPlaylists();
            if (!playlists.length) {
                alert("プレイリストを取得できませんでした");
                return;
            }

            const playlistId = await createPlaylistModal(playlists, selectedCount);
            if (!playlistId) return;

            const addButton = header.querySelector('#sc-bulk-add');
            const originalText = addButton.textContent;
            addButton.innerHTML = '<span class="sc-bulk-loading"></span>処理中...';
            addButton.disabled = true;

            try {
                const trackIds = [];
                for (const url of selectedUrls) {
                    const id = await resolveTrackId(url);
                    if (id) trackIds.push(id);
                }

                if (trackIds.length === 0) {
                    alert("トラックIDを解決できませんでした");
                    return;
                }

                const success = await addTracksToPlaylist(playlistId, trackIds);
                if (success) {
                    alert(`${trackIds.length}曲を追加しました`);
                    stopSelectionMode();
                } else {
                    alert("追加に失敗しました");
                }
            } catch (error) {
                console.error('エラー:', error);
                alert("エラーが発生しました");
            } finally {
                addButton.textContent = originalText;
                addButton.disabled = false;
            }
        });
    }

    function stopSelectionMode() {
        selectMode = false;
        cleanupCheckboxes();

        const header = document.querySelector('.sc-bulk-header');
        if (header) header.remove();
    }

    // メインボタンの作成
    const mainButton = document.createElement('button');
    mainButton.className = 'sc-bulk-button';
    mainButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: none;
    `;
    mainButton.textContent = '🎵 一括追加';

    mainButton.addEventListener('click', () => {
        if (selectMode) {
            stopSelectionMode();
        } else {
            startSelectionMode();
        }
    });

    document.body.appendChild(mainButton);

    // スクロール時にボタンを表示
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (!selectMode && Math.abs(scrollTop - lastScrollTop) > 50) {
            mainButton.style.display = 'block';
            setTimeout(() => {
                if (!selectMode) mainButton.style.display = 'none';
            }, 2000);
        }
        lastScrollTop = scrollTop;
    });

    // ページ読み込み時と変更時にボタンを表示
    function showMainButton() {
        if (!selectMode) {
            mainButton.style.display = 'block';
            setTimeout(() => {
                if (!selectMode) mainButton.style.display = 'none';
            }, 3000);
        }
    }

    showMainButton();
    setInterval(showMainButton, 30000); // 30秒ごとに表示

})();
