document.addEventListener('DOMContentLoaded', () => {
    // Teachable Machine Model URL
    const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/4IDAWlwtX/';

    let model = null;
    let webcam = null;
    let isModelLoading = false;
    let currentInputMode = 'file'; // 'file' or 'webcam'

    // UI Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const dropzonePrompt = document.getElementById('dropzone-prompt');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const scannerLine = document.getElementById('scanner-line');
    const webcamContainer = document.getElementById('webcam-container');
    const webcamWrapper = document.getElementById('webcam-wrapper');

    const tabFile = document.getElementById('tab-file');
    const tabWebcam = document.getElementById('tab-webcam');

    const btnWebcamCapture = document.getElementById('btn-webcam-capture');
    const btnReselect = document.getElementById('btn-reselect');

    const resultCard = document.getElementById('result-card');
    const resultTitle = document.getElementById('result-title');
    const resultDesc = document.getElementById('result-desc');
    const mainEmoji = document.getElementById('main-emoji');
    const mainPercentage = document.getElementById('main-percentage');

    const dogVal = document.getElementById('dog-val');
    const dogFill = document.getElementById('dog-fill');
    const catVal = document.getElementById('cat-val');
    const catFill = document.getElementById('cat-fill');

    const traitHeader = document.getElementById('trait-header');
    const traitList = document.getElementById('trait-list');

    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnRestart = document.getElementById('btn-restart');

    // Modals
    const privacyModal = document.getElementById('privacy-modal');
    const btnPrivacyPolicy = document.getElementById('btn-privacy-policy');
    const btnFooterPrivacy = document.getElementById('btn-footer-privacy');
    const btnFooterTerms = document.getElementById('btn-footer-terms');
    const btnClosePrivacy = document.getElementById('btn-close-privacy');

    // Privacy Modal Trigger
    [btnPrivacyPolicy, btnFooterPrivacy, btnFooterTerms].forEach(btn => {
        btn?.addEventListener('click', () => {
            privacyModal?.classList.remove('hidden');
        });
    });

    btnClosePrivacy?.addEventListener('click', () => {
        privacyModal?.classList.add('hidden');
    });

    privacyModal?.addEventListener('click', (e) => {
        if (e.target === privacyModal) {
            privacyModal.classList.add('hidden');
        }
    });

    // Load Teachable Machine Model
    async function loadModel() {
        if (model || isModelLoading) return;
        isModelLoading = true;
        try {
            const modelURL = MODEL_URL + 'model.json';
            const metadataURL = MODEL_URL + 'metadata.json';
            model = await tmImage.load(modelURL, metadataURL);
            console.log('Teachable Machine Model Loaded Successfully!');
        } catch (err) {
            console.error('Model load error:', err);
            showToast('AI 모델을 로드하는 중 오류가 발생했습니다.');
        } finally {
            isModelLoading = false;
        }
    }

    // Initialize Model early
    loadModel();

    // Mode Tab Switcher
    tabFile?.addEventListener('click', () => {
        currentInputMode = 'file';
        tabFile.classList.add('active');
        tabWebcam.classList.remove('active');

        stopWebcam();
        webcamContainer.classList.add('hidden');
        btnWebcamCapture.classList.add('hidden');

        if (imagePreview.src && imagePreview.src !== window.location.href) {
            previewContainer.classList.remove('hidden');
            dropzonePrompt.classList.add('hidden');
            btnReselect.classList.remove('hidden');
        } else {
            dropzonePrompt.classList.remove('hidden');
            previewContainer.classList.add('hidden');
            btnReselect.classList.add('hidden');
        }
    });

    tabWebcam?.addEventListener('click', async () => {
        currentInputMode = 'webcam';
        tabWebcam.classList.add('active');
        tabFile.classList.remove('active');

        dropzonePrompt.classList.add('hidden');
        previewContainer.classList.add('hidden');
        btnReselect.classList.add('hidden');

        await startWebcam();
    });

    // File Drop & Click Handling
    dropzone?.addEventListener('click', (e) => {
        if (currentInputMode === 'file' && previewContainer.classList.contains('hidden')) {
            fileInput.click();
        }
    });

    dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (currentInputMode === 'file') {
            dropzone.classList.add('dragover');
        }
    });

    dropzone?.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (currentInputMode === 'file' && e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            showToast('이미지 파일(JPG, PNG 등)만 업로드 가능합니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            dropzonePrompt.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            btnReselect.classList.remove('hidden');

            // Trigger AI Prediction
            runPrediction(imagePreview);
        };
        reader.readAsDataURL(file);
    }

    // Start Webcam
    async function startWebcam() {
        try {
            webcamContainer.classList.remove('hidden');
            webcamWrapper.innerHTML = '';
            const flip = true;
            webcam = new tmImage.Webcam(300, 300, flip);
            await webcam.setup();
            await webcam.play();
            webcamWrapper.appendChild(webcam.canvas);
            btnWebcamCapture.classList.remove('hidden');
            window.requestAnimationFrame(webcamLoop);
        } catch (err) {
            console.error('Webcam error:', err);
            showToast('웹캠을 켤 수 없습니다. 카메라 권한을 확인해주세요.');
            tabFile.click();
        }
    }

    function webcamLoop() {
        if (webcam && currentInputMode === 'webcam') {
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

    btnWebcamCapture?.addEventListener('click', () => {
        if (webcam && webcam.canvas) {
            imagePreview.src = webcam.canvas.toDataURL();
            stopWebcam();
            webcamContainer.classList.add('hidden');
            btnWebcamCapture.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            btnReselect.classList.remove('hidden');

            runPrediction(imagePreview);
        }
    });

    // Run AI Prediction
    async function runPrediction(imgElement) {
        if (!model) {
            showToast('AI 모델 로딩 중입니다. 잠시만 기다려주세요...');
            await loadModel();
        }

        // Show scanner animation
        scannerLine.classList.remove('hidden');
        resultCard.classList.add('hidden');

        setTimeout(async () => {
            try {
                const predictions = await model.predict(imgElement);

                let dogScore = 0;
                let catScore = 0;

                predictions.forEach(p => {
                    const name = p.className.toLowerCase();
                    if (name.includes('dog') || name.includes('강아지')) {
                        dogScore = p.probability;
                    } else if (name.includes('cat') || name.includes('고양이')) {
                        catScore = p.probability;
                    } else {
                        if (predictions.indexOf(p) === 0) dogScore = p.probability;
                        else catScore = p.probability;
                    }
                });

                const total = dogScore + catScore || 1;
                const dogPct = Math.round((dogScore / total) * 100);
                const catPct = 100 - dogPct;

                displayResult(dogPct, catPct);
            } catch (err) {
                console.error('Prediction error:', err);
                showToast('분석 중 오류가 발생했습니다.');
            } finally {
                scannerLine.classList.add('hidden');
            }
        }, 1200);
    }

    // Render Analysis Result
    function displayResult(dogPct, catPct) {
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth' });

        dogVal.textContent = `${dogPct}%`;
        catVal.textContent = `${catPct}%`;
        dogFill.style.width = `${dogPct}%`;
        catFill.style.width = `${catPct}%`;

        if (dogPct > catPct + 5) {
            mainEmoji.textContent = '🐶';
            mainPercentage.textContent = `${dogPct}%`;
            resultTitle.textContent = '댕댕미 폭발! 강아지상';
            resultDesc.textContent = '눈웃음이 매력적이고 보는 사람까지 기분 좋게 만드는 따뜻한 댕댕이 느낌!';
            traitHeader.textContent = '✨ 강아지상 대표 특징 & 매력';
            traitList.innerHTML = `
                <li>🐶 <strong>주변 사람을 매료시키는 친근함:</strong> 서글서글한 분위기로 어디서나 인기가 많습니다.</li>
                <li>😊 <strong>따뜻한 눈웃음과 호감형 인상:</strong> 처음 만난 사람도 금방 마음을 열게 만드는 마법!</li>
                <li>💖 <strong>애교 많고 해맑은 에너자이저:</strong> 함께 있으면 주변을 환하게 만드는 존재감입니다.</li>
            `;
        } else if (catPct > dogPct + 5) {
            mainEmoji.textContent = '🐱';
            mainPercentage.textContent = `${catPct}%`;
            resultTitle.textContent = '도도하고 세련된 고양이상';
            resultDesc.textContent = '오묘하고 신비로운 매력! 도도함 속에 숨겨진 츤데레 매력의 소유자!';
            traitHeader.textContent = '✨ 고양이상 대표 특징 & 매력';
            traitList.innerHTML = `
                <li>🐱 <strong>시선을 사로잡는 오묘한 이목구비:</strong> 또렷하고 세련된 쿨뷰티 스타일입니다.</li>
                <li>✨ <strong>지적이고 도도한 반전 매력:</strong> 겉은 차가워 보이지만 알수록 따뜻한 츤데레!</li>
                <li>🔮 <strong>자신만의 독보적인 아우라:</strong> 자신감 있고 당당한 스타일리시한 분위기를 뿜어냅니다.</li>
            `;
        } else {
            mainEmoji.textContent = '🐶🐱';
            mainPercentage.textContent = `${dogPct}% : ${catPct}%`;
            resultTitle.textContent = '반전 케미! 황금비율 개냥이상';
            resultDesc.textContent = '강아지의 친근함과 고양이의 도도함을 모두 갖춘 치명적인 매력의 소유자!';
            traitHeader.textContent = '✨ 개냥이상 대표 특징 & 매력';
            traitList.innerHTML = `
                <li>🌟 <strong>상황에 따라 자유자재 변신:</strong> 때로는 멍뭉이처럼 친근하게, 때로는 냥이처럼 세련되게!</li>
                <li>💫 <strong>질리지 않는 최고의 매력 조합:</strong> 귀여움과 세련됨이 조화롭게 섞인 얼굴입니다.</li>
                <li>🎯 <strong>누구에게나 호감을 주는 얼굴:</strong> 강아지파도, 고양이파도 모두 입덕시키는 비주얼!</li>
            `;
        }
    }

    // Retest & Reselect
    btnReselect?.addEventListener('click', resetAll);
    btnRestart?.addEventListener('click', resetAll);

    function resetAll() {
        dropzonePrompt.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        resultCard.classList.add('hidden');
        btnReselect.classList.add('hidden');
        imagePreview.src = '';
        fileInput.value = '';
        if (currentInputMode === 'file') {
            document.getElementById('upload-card')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    btnCopyLink?.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('테스트 사이트 링크가 클립보드에 복사되었습니다! 🔗');
        });
    });

    // Formspree Partnership Form Handler
    const partnerForm = document.getElementById('partner-form');
    if (partnerForm) {
        partnerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('btn-submit-partner');
            const originalBtnHTML = submitBtn.innerHTML;

            const endpoint = partnerForm.getAttribute('action');

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>⏳ 전송 중...</span>';

            const formData = new FormData(partnerForm);

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    showToast('제휴 문의가 성공적으로 전송되었습니다! ✉️');
                    partnerForm.reset();
                } else {
                    const data = await response.json();
                    showToast(data && data.errors ? `오류: ${data.errors.map(err => err.message).join(', ')}` : '전송 중 오류가 발생했습니다.');
                }
            } catch (err) {
                console.error(err);
                showToast('네트워크 오류가 발생했습니다.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHTML;
            }
        });
    }

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
