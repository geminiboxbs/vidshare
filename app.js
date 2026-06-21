// --- KONFIGURACJA CHUNKU I LIMITÓW ---
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_DURATION_SECONDS = 2 * 60 * 60; // 2 Godziny

// --- STRAŻNIK SESJI (BEZPIECZEŃSTWO ANTY-FAKE) ---
const currentUser = JSON.parse(localStorage.getItem('logged_in_user'));
const isAuthPage = window.location.pathname.endsWith('auth.html');

if (!currentUser && !isAuthPage) {
    // Jeśli użytkownik nie jest zalogowany i próbuje wejść na główną stronę -> przekieruj do bramki
    window.location.href = 'auth.html';
}

// --- INICJALIZACJA DANYCH BAZY DANYCH W LOCALSTORAGE ---
if (!localStorage.getItem('platform_videos')) {
    localStorage.setItem('platform_videos', JSON.stringify([
        { id: 1, title: 'Wprowadzenie do Architektury Systemów', duration: '10:15', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', thumb: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400', creator: 'GecodeAdmin', verified: true },
        { id: 2, title: 'Test Wydajności Sieci Bazy Danych', duration: '1:45:20', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', thumb: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400', creator: 'SystemArch', verified: true }
    ]));
}
if (!localStorage.getItem('platform_feed')) {
    localStorage.setItem('platform_feed', JSON.stringify([
        { id: 1, type: 'post', user: 'JanKowalski', verified: true, content: 'Witajcie na nowej platformie! Zero fałszywych kont, pełna weryfikacja każdego profilu poprzez tokeny sieciowe.' },
        { id: 2, type: 'poll', user: 'Moderator AI', verified: true, question: 'Czy system autoryzacji numerów skutecznie blokuje boty farmowe?', options: [{txt: 'Tak, odcina 99% spamu', votes: 61}, {txt: 'Nie, boty znajdą sposób', votes: 4}] }
    ]));
}

// --- GLOBALNY EVENT LISTENER ---
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalAvatars();
    
    if (isAuthPage) {
        initAuthEngine();
    } else {
        if (document.getElementById('videos-grid')) renderMainPage();
        if (document.getElementById('upload-form')) initUploadEngine();
        if (document.getElementById('profile-avatar-preview')) initProfileEngine();
    }
});

function updateGlobalAvatars() {
    if (!currentUser) return;
    const navLink = document.getElementById('nav-profile-link');
    if (navLink) {
        navLink.innerHTML = `<img src="${currentUser.avatar}" style="width:25px; height:25px; border-radius:50%; vertical-align:middle; margin-right:5px; object-fit:cover;"> ${currentUser.username}`;
    }
}

// ==========================================
// SILNIK AUTORYZACJI I ANTY-BOTÓW (auth.html)
// ==========================================
function initAuthEngine() {
    const regForm = document.getElementById('register-form');
    const step1 = document.getElementById('auth-step-1');
    const step2 = document.getElementById('auth-step-2');
    const step3 = document.getElementById('auth-step-3');
    
    const smsInput = document.getElementById('sms-code-input');
    const smsInfoText = document.getElementById('sms-info-text');
    const startVerifyBtn = document.getElementById('start-verification-btn');
    const scanProgressBox = document.getElementById('scan-progress-box');
    const scanBarFill = document.getElementById('scan-bar-fill');
    const scanStatusText = document.getElementById('scan-status-text');
    const verifyError = document.getElementById('verification-error');

    let tempUserData = {};
    let simulatedGeneratedCode = "";

    // Krok 1: Wysłanie formularza bazowego
    regForm.onsubmit = (e) => {
        e.preventDefault();
        const phoneNumber = document.getElementById('reg-phone').value.trim();
        
        tempUserData = {
            username: document.getElementById('reg-username').value.trim(),
            fullname: document.getElementById('reg-fullname').value.trim(),
            phone: phoneNumber,
            password: document.getElementById('reg-password').value
        };
        
        // Generowanie losowego kodu bezpieczeństwa (symulacja bramki SMS)
        simulatedGeneratedCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Przejście do kroku tokena
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        smsInfoText.innerHTML = `Wysłaliśmy systemowy kod na numer <strong>${phoneNumber}</strong>.<br><span style="color:#38d9a9; font-weight:bold;">Twój symulowany kod SMS to: ${simulatedGeneratedCode}</span>`;
    };

    // Krok 2: Zatwierdzenie tokenu SMS i test czystości bazy danych
    startVerifyBtn.onclick = () => {
        const userEnteredCode = smsInput.value.trim();
        
        if (userEnteredCode !== simulatedGeneratedCode) {
            verifyError.innerText = "Błąd: Wprowadzony token SMS jest nieprawidłowy. Spróbuj ponownie.";
            verifyError.classList.remove('hidden');
            return;
        }

        verifyError.classList.add('hidden');
        scanProgressBox.classList.remove('hidden');
        startVerifyBtn.disabled = true;
        
        const verificationPhases = [
            { t: "Nawiązywanie bezpiecznego połączenia z serwerem telekomunikacyjnym...", p: 30 },
            { t: "Sprawdzanie unikalności numeru SIM (Wykrywanie duplikatów VoIP)...", p: 65 },
            { t: "Walidacja anty-spamowa i rejestracja rekordu użytkownika...", p: 90 },
            { t: "Autoryzacja zakończona sukcesem!", p: 100 }
        ];

        let currentPhase = 0;
        const interval = setInterval(() => {
            if (currentPhase < verificationPhases.length) {
                scanStatusText.innerText = verificationPhases[currentPhase].t;
                scanBarFill.style.width = `${verificationPhases[currentPhase].p}%`;
                currentPhase++;
            } else {
                clearInterval(interval);
                
                // Tworzenie oficjalnego, prawdziwego profilu bez zdjęcia twarzy
                const userData = {
                    username: tempUserData.username,
                    fullname: tempUserData.fullname,
                    phone: tempUserData.phone,
                    // Domyślny, ładny awatar generowany na podstawie nazwy użytkownika
                    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${tempUserData.username}`,
                    isVerifiedHuman: true
                };
                
                localStorage.setItem('logged_in_user', JSON.stringify(userData));
                
                step2.classList.add('hidden');
                step3.classList.remove('hidden');
            }
        }, 800);
    };

    document.getElementById('enter-platform-btn').onclick = () => {
        window.location.href = 'index.html';
    };
}

// ==========================================
// LOGIKA STRONY GŁÓWNEJ (index.html)
// ==========================================
function renderMainPage() {
    const videos = JSON.parse(localStorage.getItem('platform_videos'));
    const grid = document.getElementById('videos-grid');
    const player = document.getElementById('main-player');
    const currentTitle = document.getElementById('current-video-title');
    
    grid.innerHTML = '';
    videos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <img class="video-thumbnail" src="${v.thumb}" alt="Miniatura">
            <div class="video-info">
                <h4>${v.title}</h4>
                <p>👤 ${v.creator} ${v.verified ? '<span class="badge badge-verified" style="font-size:0.65rem; padding:1px 5px;">✓ Prawdziwy</span>' : ''}</p>
                <p>Czas trwania: ${v.duration}</p>
            </div>
        `;
        card.onclick = () => {
            player.src = v.url;
            player.play();
            currentTitle.innerHTML = `${v.title} <br> <small style="color:var(--text-muted); font-size:0.9rem;">Autor: ${v.creator}</small>`;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        grid.appendChild(card);
    });

    renderFeed();
    initFeedFormEvents();
}

function switchTab(type) {
    const postForm = document.getElementById('post-form');
    const pollForm = document.getElementById('poll-form');
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (type === 'post') {
        postForm.classList.remove('hidden');
        pollForm.classList.add('hidden');
        tabs[0].classList.add('active');
    } else {
        postForm.classList.add('hidden');
        pollForm.classList.remove('hidden');
        tabs[1].classList.add('active');
    }
}

function initFeedFormEvents() {
    const addOptionBtn = document.getElementById('add-option-btn');
    if (addOptionBtn) {
        addOptionBtn.onclick = () => {
            const form = document.getElementById('poll-form');
            const options = form.querySelectorAll('.poll-option');
            if (options.length < 5) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'poll-option';
                input.placeholder = `Opcja ${options.length + 1}`;
                input.required = true;
                form.insertBefore(input, addOptionBtn);
            } else {
                alert('Maksymalnie 5 opcji w ankiecie.');
            }
        };
    }

    document.getElementById('post-form').onsubmit = (e) => {
        e.preventDefault();
        const content = document.getElementById('post-content').value;
        const feed = JSON.parse(localStorage.getItem('platform_feed'));
        
        feed.unshift({ 
            id: Date.now(), 
            type: 'post', 
            user: currentUser.username, 
            verified: currentUser.isVerifiedHuman, 
            content: content 
        });
        localStorage.setItem('platform_feed', JSON.stringify(feed));
        document.getElementById('post-content').value = '';
        renderFeed();
    };

    document.getElementById('poll-form').onsubmit = (e) => {
        e.preventDefault();
        const question = document.getElementById('poll-question').value;
        const optionInputs = document.querySelectorAll('.poll-option');
        const optionsData = [];
        
        optionInputs.forEach(input => {
            if (input.value.trim() !== '') {
                optionsData.push({ txt: input.value, votes: 0 });
            }
        });

        const feed = JSON.parse(localStorage.getItem('platform_feed'));
        feed.unshift({ 
            id: Date.now(), 
            type: 'poll', 
            user: currentUser.username, 
            verified: currentUser.isVerifiedHuman, 
            question: question, 
            options: optionsData 
        });
        localStorage.setItem('platform_feed', JSON.stringify(feed));
        
        document.getElementById('poll-form').reset();
        renderFeed();
    };
}

function renderFeed() {
    const feed = JSON.parse(localStorage.getItem('platform_feed'));
    const container = document.getElementById('community-feed');
    container.innerHTML = '';

    feed.forEach(item => {
        const element = document.createElement('div');
        element.className = 'feed-item';
        
        let header = `
            <div class="feed-header">
                <img class="feed-avatar" src="${item.user === currentUser?.username ? currentUser.avatar : 'https://api.dicebear.com/7.x/bottts/svg?seed=' + item.user}">
                <strong>${item.user}</strong>
                ${item.verified ? '<span class="badge badge-verified">✓ Zweryfikowany</span>' : ''}
            </div>`;

        if (item.type === 'post') {
            element.innerHTML = header + `<p>${item.content}</p>`;
        } else if (item.type === 'poll') {
            let pollHtml = header + `<p style="font-weight:600; margin-bottom:10px;">📊 ${item.question}</p>`;
            item.options.forEach((opt, idx) => {
                pollHtml += `
                    <div class="poll-ui-option" onclick="votePoll(${item.id}, ${idx})">
                        <span>${opt.txt}</span>
                        <strong>${opt.votes} głosów</strong>
                    </div>`;
            });
            element.innerHTML = pollHtml;
        }
        container.appendChild(element);
    });
}

function votePoll(pollId, optionIdx) {
    const feed = JSON.parse(localStorage.getItem('platform_feed'));
    const poll = feed.find(p => p.id === pollId);
    if (poll) {
        poll.options[optionIdx].votes += 1;
        localStorage.setItem('platform_feed', JSON.stringify(feed));
        renderFeed();
    }
}

// ==========================================
// LOGIKA MODUŁU UPLOAD (upload.html)
// ==========================================
function initUploadEngine() {
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('video-file');
    const errorBox = document.getElementById('upload-error');
    const successBox = document.getElementById('upload-success');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-bar-fill');
    const statusText = document.getElementById('upload-status-text');
    const videoValidator = document.getElementById('hidden-video-validator');

    form.onsubmit = (e) => {
        e.preventDefault();
        errorBox.classList.add('hidden');
        successBox.classList.add('hidden');
        
        const file = fileInput.files[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE_BYTES) {
            errorBox.innerText = `Błąd: Plik przekracza limit 2 GB (Twój plik: ${(file.size / (1024*1024*1024)).toFixed(2)} GB).`;
            errorBox.classList.remove('hidden');
            return;
        }

        const objectURL = URL.createObjectURL(file);
        videoValidator.src = objectURL;
        
        statusText.innerText = "Skanowanie integralności i czasu trwania pliku...";
        progressContainer.classList.remove('hidden');
        document.getElementById('upload-submit-btn').disabled = true;

        videoValidator.onloadedmetadata = () => {
            const duration = videoValidator.duration;
            if (duration > MAX_DURATION_SECONDS) {
                errorBox.innerText = `Błąd: Czas trwania filmu przekracza 2 godziny (Twój plik: ${Math.floor(duration/60)} minut).`;
                errorBox.classList.remove('hidden');
                progressContainer.classList.add('hidden');
                document.getElementById('upload-submit-btn').disabled = false;
                return;
            }

            simulateChunkedUpload(file, duration);
        };
    };

    function simulateChunkedUpload(file, duration) {
        let uploadedBytes = 0;
        const totalBytes = file.size;
        const chunkSize = 15 * 1024 * 1024; 
        
        const interval = setInterval(() => {
            uploadedBytes += chunkSize;
            if (uploadedBytes > totalBytes) uploadedBytes = totalBytes;
            
            const percentage = Math.round((uploadedBytes / totalBytes) * 100);
            progressFill.style.width = `${percentage}%`;
            statusText.innerText = `Przesyłanie pakietów: ${percentage}% (${(uploadedBytes / (1024*1024)).toFixed(1)} MB / ${(totalBytes / (1024*1024)).toFixed(1)} MB)`;

            if (uploadedBytes >= totalBytes) {
                clearInterval(interval);
                
                const currentVideos = JSON.parse(localStorage.getItem('platform_videos'));
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
                
                currentVideos.push({
                    id: Date.now(),
                    title: document.getElementById('video-title').value,
                    duration: `${minutes}:${seconds}`,
                    url: URL.createObjectURL(file),
                    thumb: 'https://images.unsplash.com/photo-161152617213-7d7a39e9b1d7?w=400',
                    creator: currentUser.username,
                    verified: currentUser.isVerifiedHuman
                });
                
                localStorage.setItem('platform_videos', JSON.stringify(currentVideos));
                
                statusText.innerText = "Serwer scalanie bloków danych... Gotowe!";
                successBox.innerText = "Sukces! Film przeszedł poprawnie automatyczną walidację i został opublikowany.";
                successBox.classList.remove('hidden');
                document.getElementById('upload-submit-btn').disabled = false;
                form.reset();
            }
        }, 100);
    }
}

// ==========================================
// LOGIKA PROFILU (profile.html)
// ==========================================
function initProfileEngine() {
    const avatarPreview = document.getElementById('profile-avatar-preview');
    const avatarInput = document.getElementById('avatar-input');
    
    avatarPreview.src = currentUser.avatar;
    document.getElementById('profile-username-display').innerText = currentUser.username;

    const videos = JSON.parse(localStorage.getItem('platform_videos')) || [];
    const feed = JSON.parse(localStorage.getItem('platform_feed')) || [];
    
    const myVideosCount = videos.filter(v => v.creator === currentUser.username).length; 
    const myFeedCount = feed.filter(f => f.user === currentUser.username).length;

    document.getElementById('stat-videos-count').innerText = myVideosCount;
    document.getElementById('stat-posts-count').innerText = myFeedCount;

    // Możliwość manualnej zmiany awatara z pliku na telefonie/PC (już po rejestracji)
    avatarInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64Image = event.target.result;
                currentUser.avatar = base64Image;
                localStorage.setItem('logged_in_user', JSON.stringify(currentUser));
                avatarPreview.src = base64Image;
                updateGlobalAvatars();
            };
            reader.readAsDataURL(file);
        }
    };
}
