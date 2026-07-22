document.addEventListener('DOMContentLoaded', () => {
    // State
    let fixedNumbers = new Set();
    let excludedNumbers = new Set();
    let generatedGames = [];
    let savedFavorites = JSON.parse(localStorage.getItem('lotto_favorites')) || [];
    let numberFrequency = {};

    for (let i = 1; i <= 45; i++) {
        numberFrequency[i] = 0;
    }

    // Color range mapping helper
    function getBallColorClass(num) {
        if (num >= 1 && num <= 10) return 'ball-1-10';
        if (num >= 11 && num <= 20) return 'ball-11-20';
        if (num >= 21 && num <= 30) return 'ball-21-30';
        if (num >= 31 && num <= 40) return 'ball-31-40';
        return 'ball-41-45';
    }

    // Create Ball HTML
    function createBallHTML(num, sizeClass = '') {
        const colorClass = getBallColorClass(num);
        return `<div class="lotto-ball ${colorClass} ${sizeClass}">${num}</div>`;
    }

    // Initialize Chamber Animation Balls
    function initChamber() {
        const chamber = document.getElementById('chamber-balls');
        if (!chamber) return;

        let ballsHTML = '';
        for (let i = 1; i <= 20; i++) {
            const randomNum = Math.floor(Math.random() * 45) + 1;
            ballsHTML += createBallHTML(randomNum, 'micro');
        }
        chamber.innerHTML = ballsHTML;
    }
    initChamber();

    // Render Filter Grids (1 ~ 45)
    function renderFilterGrids() {
        const fixedGrid = document.getElementById('fixed-numbers-grid');
        const excludedGrid = document.getElementById('excluded-numbers-grid');

        if (!fixedGrid || !excludedGrid) return;

        let fixedHTML = '';
        let excludedHTML = '';

        for (let i = 1; i <= 45; i++) {
            const isFixed = fixedNumbers.has(i);
            const isExcluded = excludedNumbers.has(i);

            fixedHTML += `
                <div class="num-chip ${isFixed ? 'fixed' : ''}" data-num="${i}" data-type="fixed">
                    ${i}
                </div>
            `;

            excludedHTML += `
                <div class="num-chip ${isExcluded ? 'excluded' : ''}" data-num="${i}" data-type="excluded">
                    ${i}
                </div>
            `;
        }

        fixedGrid.innerHTML = fixedHTML;
        excludedGrid.innerHTML = excludedHTML;

        // Attach Click Listeners
        fixedGrid.querySelectorAll('.num-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const num = Number(chip.getAttribute('data-num'));
                if (fixedNumbers.has(num)) {
                    fixedNumbers.delete(num);
                } else {
                    if (fixedNumbers.size >= 5) {
                        showToast('고정수는 최대 5개까지 설정할 수 있습니다.');
                        return;
                    }
                    if (excludedNumbers.has(num)) {
                        excludedNumbers.delete(num);
                    }
                    fixedNumbers.add(num);
                }
                renderFilterGrids();
            });
        });

        excludedGrid.querySelectorAll('.num-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const num = Number(chip.getAttribute('data-num'));
                if (excludedNumbers.has(num)) {
                    excludedNumbers.delete(num);
                } else {
                    if (fixedNumbers.has(num)) {
                        fixedNumbers.delete(num);
                    }
                    excludedNumbers.add(num);
                }
                renderFilterGrids();
            });
        });
    }

    renderFilterGrids();

    // Reset Filters
    document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
        fixedNumbers.clear();
        excludedNumbers.clear();
        renderFilterGrids();
        showToast('필터가 초기화되었습니다.');
    });

    // Single Game Generation Algorithm
    function generateSingleLottoGame() {
        const selected = new Set(fixedNumbers);
        const pool = [];

        for (let i = 1; i <= 45; i++) {
            if (!selected.has(i) && !excludedNumbers.has(i)) {
                pool.push(i);
            }
        }

        // Shuffle Pool (Fisher-Yates Shuffle)
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // Fill up to 6 numbers
        while (selected.size < 6 && pool.length > 0) {
            selected.add(pool.pop());
        }

        const numbers = Array.from(selected).sort((a, b) => a - b);

        // Bonus Number (from remaining pool)
        let bonus = null;
        if (pool.length > 0) {
            bonus = pool.pop();
        } else {
            for (let i = 1; i <= 45; i++) {
                if (!numbers.includes(i)) {
                    bonus = i;
                    break;
                }
            }
        }

        return { numbers, bonus };
    }

    // Main Draw Button Event
    const btnDraw = document.getElementById('btn-draw');
    btnDraw?.addEventListener('click', () => {
        const gameCount = Number(document.getElementById('game-count').value);
        const statusBadge = document.getElementById('machine-status');
        const mainDisplay = document.getElementById('main-result-display');
        const container = document.getElementById('games-results-container');

        if (statusBadge) statusBadge.textContent = 'DRAWING...';
        btnDraw.disabled = true;

        // Shuffle chamber animation
        initChamber();

        // Animate result presentation
        generatedGames = [];
        for (let i = 0; i < gameCount; i++) {
            generatedGames.push(generateSingleLottoGame());
        }

        // Update Frequency Stats
        generatedGames.forEach(g => {
            g.numbers.forEach(n => { numberFrequency[n]++; });
        });
        updateFrequencyStats();

        // Reveal First Game in Chamber Display
        const firstGame = generatedGames[0];
        if (mainDisplay) {
            mainDisplay.innerHTML = firstGame.numbers.map(n => createBallHTML(n)).join('') +
                `<div class="plus-sign">+</div>` +
                `<div class="bonus-wrapper">${createBallHTML(firstGame.bonus)}<span class="bonus-tag">보너스</span></div>`;
        }

        // Render Game List (A, B, C, D, E...)
        const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        if (container) {
            container.innerHTML = generatedGames.map((game, idx) => `
                <div class="game-row">
                    <span class="game-label">${labels[idx] || (idx + 1)}</span>
                    <div class="game-balls">
                        ${game.numbers.map(n => createBallHTML(n, 'small')).join('')}
                        <span style="color:var(--gold-accent); font-weight:800; margin:0 4px;">+</span>
                        ${createBallHTML(game.bonus, 'small')}
                    </div>
                    <button class="btn-text btn-fav" data-idx="${idx}">⭐ 저장</button>
                </div>
            `).join('');

            // Favorite click event
            container.querySelectorAll('.btn-fav').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = Number(e.target.getAttribute('data-idx'));
                    const gameToSave = generatedGames[idx];
                    if (gameToSave) {
                        savedFavorites.unshift(gameToSave);
                        localStorage.setItem('lotto_favorites', JSON.stringify(savedFavorites));
                        renderFavorites();
                        showToast(`${labels[idx]} 게임이 보관함에 저장되었습니다.`);
                    }
                });
            });
        }

        setTimeout(() => {
            if (statusBadge) statusBadge.textContent = 'COMPLETE';
            btnDraw.disabled = false;
        }, 300);
    });

    // Copy All Results
    document.getElementById('btn-copy-all')?.addEventListener('click', () => {
        if (generatedGames.length === 0) {
            showToast('복사할 생성된 번호가 없습니다.');
            return;
        }

        const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const textLines = generatedGames.map((game, idx) => {
            return `[${labels[idx] || (idx + 1)}] ${game.numbers.join(', ')} + 보너스 (${game.bonus})`;
        }).join('\n');

        navigator.clipboard.writeText(textLines).then(() => {
            showToast('전체 로또 번호가 클립보드에 복사되었습니다! 📋');
        });
    });

    // Render Favorites List
    function renderFavorites() {
        const favContainer = document.getElementById('favorites-list-container');
        const favCount = document.getElementById('fav-count');

        if (favCount) favCount.textContent = savedFavorites.length;

        if (favContainer) {
            if (savedFavorites.length === 0) {
                favContainer.innerHTML = '<div class="empty-state small">보관된 번호가 없습니다.</div>';
                return;
            }

            favContainer.innerHTML = savedFavorites.map((game, idx) => `
                <div class="game-row">
                    <div class="game-balls">
                        ${game.numbers.map(n => createBallHTML(n, 'micro')).join('')}
                        <span style="color:var(--gold-accent); font-weight:700; font-size:11px;">+</span>
                        ${createBallHTML(game.bonus, 'micro')}
                    </div>
                    <button class="btn-text btn-del-fav" data-idx="${idx}" style="color:#ef4444;">삭제</button>
                </div>
            `).join('');

            favContainer.querySelectorAll('.btn-del-fav').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = Number(e.target.getAttribute('data-idx'));
                    savedFavorites.splice(idx, 1);
                    localStorage.setItem('lotto_favorites', JSON.stringify(savedFavorites));
                    renderFavorites();
                });
            });
        }
    }

    document.getElementById('btn-clear-favs')?.addEventListener('click', () => {
        savedFavorites = [];
        localStorage.setItem('lotto_favorites', JSON.stringify(savedFavorites));
        renderFavorites();
        showToast('보관함이 비워졌습니다.');
    });

    renderFavorites();

    // Update Frequency Bar Charts
    function updateFrequencyStats() {
        let ranges = [0, 0, 0, 0, 0]; // 1-10, 11-20, 21-30, 31-40, 41-45
        let totalDrawn = 0;

        for (let i = 1; i <= 45; i++) {
            const count = numberFrequency[i];
            totalDrawn += count;
            if (i <= 10) ranges[0] += count;
            else if (i <= 20) ranges[1] += count;
            else if (i <= 30) ranges[2] += count;
            else if (i <= 40) ranges[3] += count;
            else ranges[4] += count;
        }

        if (totalDrawn === 0) return;

        ranges.forEach((cnt, idx) => {
            const pct = Math.round((cnt / totalDrawn) * 100);
            const bar = document.getElementById(`stat-bar-${idx + 1}`);
            const val = document.getElementById(`stat-val-${idx + 1}`);
            if (bar) bar.style.width = `${pct}%`;
            if (val) val.textContent = `${pct}%`;
        });
    }

    // Toast Notification System
    function showToast(msg) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }
});
