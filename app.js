/* ========================================
   PetFace AI - Application Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ─── Model Config ─────────────────────────────────
    const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/4IDAWlwtX/';
    let model = null;
    let webcam = null;
    let isModelLoading = false;
    let currentMode = 'file'; // 'file' | 'webcam'

    // ─── UI Element References ─────────────────────────
    const dropzone         = document.getElementById('dropzone');
    const fileInput        = document.getElementById('file-input');
    const dzPrompt         = document.getElementById('dropzone-prompt');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview     = document.getElementById('image-preview');
    const scannerLine      = document.getElementById('scanner-line');
    const scanOverlay      = document.getElementById('scan-overlay');
    const webcamContainer  = document.getElementById('webcam-container');
    const webcamWrapper    = document.getElementById('webcam-wrapper');

    const tabFile    = document.getElementById('tab-file');
    const tabWebcam  = document.getElementById('tab-webcam');

    const btnCapture  = document.getElementById('btn-webcam-capture');
    const btnReselect = document.getElementById('btn-reselect');

    const resultCard    = document.getElementById('result-card');
    const resultTitle   = document.getElementById('result-title');
    const resultDesc    = document.getElementById('result-desc');
    const mainEmoji     = document.getElementById('main-emoji');
    const mainPct       = document.getElementById('main-percentage');
    const dogVal        = document.getElementById('dog-val');
    const dogFill       = document.getElementById('dog-fill');
    const catVal        = document.getElementById('cat-val');
    const catFill       = document.getElementById('cat-fill');
    const traitHeader   = document.getElementById('trait-header');
    const traitList     = document.getElementById('trait-list');
    const btnCopyLink   = document.getElementById('btn-copy-link');
    const btnRestart    = document.getElementById('btn-restart');

    // ─── Load Model ────────────────────────────────────
    async function loadModel() {
        if (model || isModelLoading) return;
        isModelLoading = true;
        try {
            model = await tmImage.load(MODEL_URL + 'model.json', MODEL_URL + 'metadata.json');
            console.log('[PetFace AI] 모델 로드 완료');
        } catch (err) {
            console.error('[PetFace AI] 모델 로드 실패:', err);
            showToast('⚠️ AI 모델 연결 중... 잠시 후 다시 시도해주세요.');
        } finally {
            isModelLoading = false;
        }
    }

    loadModel();

    // ─── Mode Tab Switcher ─────────────────────────────
    tabFile?.addEventListener('click', () => {
        if (currentMode === 'file') return;
        currentMode = 'file';
        tabFile.classList.add('active');
        tabWebcam.classList.remove('active');

        stopWebcam();
        webcamContainer.classList.add('hidden');
        btnCapture.classList.add('hidden');

        const hasImage = imagePreview.src && imagePreview.src !== window.location.href;
        if (hasImage) {
            previewContainer.classList.remove('hidden');
            dzPrompt.classList.add('hidden');
            btnReselect.classList.remove('hidden');
        } else {
            dzPrompt.classList.remove('hidden');
            previewContainer.classList.add('hidden');
            btnReselect.classList.add('hidden');
        }
    });

    tabWebcam?.addEventListener('click', async () => {
        if (currentMode === 'webcam') return;
        currentMode = 'webcam';
        tabWebcam.classList.add('active');
        tabFile.classList.remove('active');

        dzPrompt.classList.add('hidden');
        previewContainer.classList.add('hidden');
        btnReselect.classList.add('hidden');

        await startWebcam();
    });

    // ─── Dropzone Interactions ─────────────────────────
    dropzone?.addEventListener('click', () => {
        if (currentMode === 'file' && previewContainer.classList.contains('hidden')) {
            fileInput.click();
        }
    });

    dropzone?.addEventListener('dragover', e => {
        e.preventDefault();
        if (currentMode === 'file') dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone?.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file && currentMode === 'file') handleFile(file);
    });

    fileInput?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('🖼️ 이미지 파일(JPG, PNG 등)만 업로드 가능합니다.');
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            imagePreview.src = e.target.result;
            dzPrompt.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            btnReselect.classList.remove('hidden');
            runPrediction(imagePreview);
        };
        reader.readAsDataURL(file);
    }

    // ─── Webcam ────────────────────────────────────────
    async function startWebcam() {
        try {
            webcamContainer.classList.remove('hidden');
            webcamWrapper.innerHTML = '';
            webcam = new tmImage.Webcam(320, 320, true);
            await webcam.setup();
            await webcam.play();
            webcamWrapper.appendChild(webcam.canvas);
            btnCapture.classList.remove('hidden');
            window.requestAnimationFrame(webcamLoop);
        } catch (err) {
            console.error('[PetFace AI] 웹캠 오류:', err);
            showToast('📷 카메라 접근 권한을 허용해주세요.');
            tabFile.click();
        }
    }

    function webcamLoop() {
        if (webcam && currentMode === 'webcam') {
            webcam.update();
            window.requestAnimationFrame(webcamLoop);
        }
    }

    function stopWebcam() {
        if (webcam) {
            webcam.stop();
            webcam = null;
        }
    }

    btnCapture?.addEventListener('click', () => {
        if (webcam?.canvas) {
            imagePreview.src = webcam.canvas.toDataURL();
            stopWebcam();
            webcamContainer.classList.add('hidden');
            btnCapture.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            btnReselect.classList.remove('hidden');
            runPrediction(imagePreview);
        }
    });

    // ─── AI Prediction ─────────────────────────────────
    async function runPrediction(imgEl) {
        if (!model) {
            showToast('⏳ AI 모델을 준비 중입니다. 잠시 후 다시 시도해주세요.');
            await loadModel();
            if (!model) return;
        }

        // Show scanning UI
        scannerLine.classList.remove('hidden');
        scanOverlay.classList.remove('hidden');
        resultCard.classList.add('hidden');

        await new Promise(r => setTimeout(r, 1400)); // deliberate delay for UX

        try {
            const preds = await model.predict(imgEl);

            let dogScore = 0, catScore = 0;
            preds.forEach((p, i) => {
                const n = p.className.toLowerCase();
                if (n.includes('dog') || n.includes('강아지')) {
                    dogScore = p.probability;
                } else if (n.includes('cat') || n.includes('고양이')) {
                    catScore = p.probability;
                } else {
                    // fallback: first class = dog, second = cat
                    if (i === 0) dogScore = p.probability;
                    else catScore = p.probability;
                }
            });

            const total = (dogScore + catScore) || 1;
            const dogPct = Math.round((dogScore / total) * 100);
            const catPct = 100 - dogPct;

            displayResult(dogPct, catPct);

        } catch (err) {
            console.error('[PetFace AI] 분석 오류:', err);
            showToast('❌ 분석 중 오류가 발생했습니다. 다른 사진으로 시도해보세요.');
        } finally {
            scannerLine.classList.add('hidden');
            scanOverlay.classList.add('hidden');
        }
    }

    function displayResult(dogPct, catPct) {
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Animate bars
        setTimeout(() => {
            dogFill.style.width = `${dogPct}%`;
            catFill.style.width = `${catPct}%`;
        }, 50);

        dogVal.textContent = `${dogPct}%`;
        catVal.textContent = `${catPct}%`;

        const GAP = 12; // threshold for decisive result

        if (dogPct > catPct + GAP) {
            // 강아지상
            mainEmoji.textContent = '🐶';
            mainPct.textContent = `${dogPct}%`;
            resultTitle.textContent = '댕댕미 폭발! 강아지상 🐶';
            resultDesc.textContent = '눈웃음이 매력적이고 보는 사람까지 기분 좋게 만드는 따뜻한 댕댕이 타입!';
            traitHeader.textContent = '✨ 강아지상의 대표 특징 & 매력';
            traitList.innerHTML = `
                <li>🐶 <strong>주변을 매료시키는 친근함:</strong> 서글서글한 분위기로 어디서나 인기 만점. 처음 만난 사람도 금방 친해집니다.</li>
                <li>😊 <strong>따뜻한 눈웃음과 호감 인상:</strong> 처음 만난 사람도 금방 마음을 열게 만드는 마법 같은 눈빛의 소유자.</li>
                <li>💖 <strong>해맑고 밝은 에너자이저:</strong> 함께 있으면 주변을 환하게 밝히는 긍정 에너지가 넘칩니다.</li>
                <li>🤝 <strong>높은 공감 능력:</strong> 타인의 감정에 민감하게 반응하며 관계를 소중히 여기는 성격입니다.</li>
            `;
        } else if (catPct > dogPct + GAP) {
            // 고양이상
            mainEmoji.textContent = '🐱';
            mainPct.textContent = `${catPct}%`;
            resultTitle.textContent = '도도하고 세련된 고양이상 🐱';
            resultDesc.textContent = '오묘하고 신비로운 매력! 도도함 속에 숨겨진 츤데레의 매력 소유자!';
            traitHeader.textContent = '✨ 고양이상의 대표 특징 & 매력';
            traitList.innerHTML = `
                <li>🐱 <strong>시선을 사로잡는 오묘한 이목구비:</strong> 또렷하고 날카로운 눈매로 어디서든 강렬한 존재감을 뿜어냅니다.</li>
                <li>✨ <strong>지적이고 도도한 반전 매력:</strong> 겉으로는 차가워 보이지만 속정이 깊은 매력적인 츤데레!</li>
                <li>🔮 <strong>자신만의 독보적인 아우라:</strong> 자신감 있고 당당한 스타일리시한 분위기를 자연스럽게 연출합니다.</li>
                <li>💎 <strong>뚜렷한 자기 기준:</strong> 자신만의 확고한 가치관과 취향을 가진 개성 있는 매력의 소유자입니다.</li>
            `;
        } else {
            // 개냥이상
            mainEmoji.textContent = '🐾';
            mainPct.textContent = `${dogPct}% : ${catPct}%`;
            resultTitle.textContent = '반전 케미! 황금비율 개냥이상 🐾';
            resultDesc.textContent = '강아지의 친근함과 고양이의 도도함을 모두 갖춘 치명적인 매력 소유자!';
            traitHeader.textContent = '✨ 개냥이상의 대표 특징 & 매력';
            traitList.innerHTML = `
                <li>🌟 <strong>상황 따라 자유자재 변신:</strong> 때로는 강아지처럼 친근하게, 때로는 고양이처럼 세련되게 변신하는 카멜레온 매력!</li>
                <li>💫 <strong>질리지 않는 최고의 매력 조합:</strong> 귀여움과 세련됨이 절묘하게 공존하는 중독성 있는 얼굴.</li>
                <li>🎯 <strong>남녀노소 누구에게나 호감:</strong> 강아지파도, 고양이파도 모두 인정하는 만인의 이상형!</li>
                <li>🏆 <strong>연예인 중 가장 많은 유형:</strong> 실제로 대중에게 오래 사랑받는 연예인들에게서 많이 나타납니다.</li>
            `;
        }
    }

    // Reset
    btnReselect?.addEventListener('click', resetTest);
    btnRestart?.addEventListener('click', resetTest);

    function resetTest() {
        dzPrompt.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        resultCard.classList.add('hidden');
        btnReselect.classList.add('hidden');
        imagePreview.src = '';
        fileInput.value = '';
        dogFill.style.width = '0%';
        catFill.style.width = '0%';
    }

    // Share
    btnCopyLink?.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => showToast('🔗 링크가 복사되었습니다! 친구에게 공유해보세요.'))
            .catch(() => showToast('링크 복사를 지원하지 않는 브라우저입니다.'));
    });

    // ─── Makeup Tab Switcher ─────────────────────────────
    const makeupTabs = document.querySelectorAll('.makeup-tab');
    const makeupContents = {
        'dog': document.getElementById('makeup-dog'),
        'cat': document.getElementById('makeup-cat'),
        'dog-to-cat': document.getElementById('makeup-dog-to-cat'),
        'cat-to-dog': document.getElementById('makeup-cat-to-dog'),
    };

    makeupTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const type = tab.getAttribute('data-type');
            makeupTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            Object.entries(makeupContents).forEach(([key, el]) => {
                if (!el) return;
                if (key === type) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });
        });
    });

    // ─── FAQ Accordion ────────────────────────────────
    document.querySelectorAll('.faq-q').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = btn.getAttribute('data-faq');
            const answer = document.getElementById(`faq-${idx}`);
            const item = btn.closest('.faq-item');

            const isOpen = item.classList.contains('open');

            // Close all
            document.querySelectorAll('.faq-item').forEach(i => {
                i.classList.remove('open');
                const a = i.querySelector('.faq-a');
                if (a) a.classList.remove('open');
            });

            if (!isOpen) {
                item.classList.add('open');
                if (answer) answer.classList.add('open');
            }
        });
    });

    // ─── Lotto Generator ──────────────────────────────
    const btnDraw = document.getElementById('btn-draw-lotto');
    const btnCopyLotto = document.getElementById('btn-copy-lotto');
    const lottoContainer = document.getElementById('lotto-results-container');
    let lastLotto = [];

    btnDraw?.addEventListener('click', () => {
        const count = Number(document.getElementById('lotto-game-count').value);
        const labels = ['A','B','C','D','E','F','G','H','I','J'];
        lastLotto = [];
        let html = '';

        for (let i = 0; i < count; i++) {
            const set = new Set();
            while (set.size < 6) set.add(Math.floor(Math.random() * 45) + 1);
            const nums = [...set].sort((a, b) => a - b);
            lastLotto.push({ label: labels[i] || String(i + 1), nums });

            html += `
                <div class="game-row">
                    <span class="game-label">${labels[i] || (i + 1)}</span>
                    <div class="game-balls">
                        ${nums.map(n => `<div class="lotto-ball-mini">${n}</div>`).join('')}
                    </div>
                </div>
            `;
        }

        if (lottoContainer) {
            lottoContainer.innerHTML = html;
        }

        showToast(`🎰 ${count}게임 행운의 번호가 추출되었습니다!`);
    });

    btnCopyLotto?.addEventListener('click', () => {
        if (!lastLotto.length) { showToast('먼저 번호를 추첨해주세요.'); return; }
        const txt = lastLotto.map(g => `[${g.label}] ${g.nums.join(', ')}`).join('\n');
        navigator.clipboard.writeText(txt)
            .then(() => showToast('📋 로또 번호가 복사되었습니다!'))
            .catch(() => showToast('복사를 지원하지 않는 환경입니다.'));
    });

    // ─── Formspree Form ───────────────────────────────
    const partnerForm = document.getElementById('partner-form');
    const submitBtn = document.getElementById('btn-submit-partner');

    partnerForm?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!submitBtn) return;

        const orig = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ 전송 중...';

        try {
            const res = await fetch(partnerForm.action, {
                method: 'POST',
                body: new FormData(partnerForm),
                headers: { Accept: 'application/json' }
            });

            if (res.ok) {
                showToast('✅ 제휴 문의가 성공적으로 전송되었습니다!');
                partnerForm.reset();
            } else {
                showToast('❌ 전송에 실패했습니다. 다시 시도해주세요.');
            }
        } catch {
            showToast('❌ 네트워크 오류가 발생했습니다.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = orig;
        }
    });

    // ─── Hamburger Mobile Menu ─────────────────────────
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    hamburger?.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
    });

    // Close mobile menu on nav link click
    document.querySelectorAll('.mobile-nav-item').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
        });
    });

    // ─── Smooth scroll for anchor links ───────────────
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const headerHeight = document.querySelector('.site-header')?.offsetHeight || 70;
                const targetPos = target.getBoundingClientRect().top + window.scrollY - headerHeight - 10;
                window.scrollTo({ top: targetPos, behavior: 'smooth' });
            }
        });
    });

    // Header contact button
    document.getElementById('btn-header-contact')?.addEventListener('click', e => {
        e.preventDefault();
        const target = document.getElementById('partner-section');
        if (target) {
            const headerHeight = document.querySelector('.site-header')?.offsetHeight || 70;
            const pos = target.getBoundingClientRect().top + window.scrollY - headerHeight - 10;
            window.scrollTo({ top: pos, behavior: 'smooth' });
        }
    });

    // ─── Back to Top + Active Nav ──────────────────────
    const backToTop = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        // Back to top visibility
        if (window.scrollY > 400) {
            backToTop?.classList.add('visible');
        } else {
            backToTop?.classList.remove('visible');
        }

        // Active nav highlight
        const sections = document.querySelectorAll('section[id], div[id^="section-"]');
        const headerH = document.querySelector('.site-header')?.offsetHeight || 70;
        let current = '';

        sections.forEach(sec => {
            if (sec.getBoundingClientRect().top <= headerH + 80) {
                current = sec.id;
            }
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    }, { passive: true });

    // ─── Toast Notification ────────────────────────────
    function showToast(msg) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
    }
});
