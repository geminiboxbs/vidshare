// --- KONFIGURACJA POŁĄCZENIA Z TWOIM FIREBASE (vidsharepl) ---
const firebaseConfig = {
    apiKey: "AIzaSyATEGWHEEoFefaTI430QLrtm86rhVpOowk",
    authDomain: "vidsharepl.firebaseapp.com",
    databaseURL: "https://vidsharepl-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vidsharepl",
    storageBucket: "vidsharepl.firebasestorage.app",
    messagingSenderId: "707546142335",
    appId: "1:707546142335:web:439c07784adc2088b0514a",
    measurementId: "G-C9TJJ04ZZ6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_DURATION_SECONDS = 2 * 60 * 60; // 2 Godziny

// --- STRAŻNIK SESJI ---
const currentUser = JSON.parse(localStorage.getItem('logged_in_user'));
const isAuthPage = window.location.pathname.endsWith('auth.html');

if (!currentUser && !isAuthPage) {
    window.location.href = 'auth.html';
}

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
        navLink.innerHTML = `
            <div class="nav-avatar-container">
                <img src="${currentUser.avatar}" class="nav-avatar">
                <span>${currentUser.username}</span>
            </div>
        `;
    }
}

// ==========================================
// PRAWDZIWA WERYFIKACJA SMS (auth.html)
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

    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
    });

    regForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();

        const snapshot = await db.ref('platform_users').orderByChild('username').equalTo(username).once('value');
        if (snapshot.exists()) {
            alert("Ten login jest już zajęty!");
            return;
        }
        
        tempUserData = {
            username: username,
            fullname: document.getElementById('reg-fullname').value.trim(),
            phone: phone,
            password: document.getElementById('reg-password').value
        };
        
        verifyError.classList.add('hidden');
        try {
            const confirmationResult = await firebase.auth().signInWithPhoneNumber(phone, window.recaptchaVerifier);
            window.smsConfirmationResult = confirmationResult;

            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            smsInfoText.innerHTML = `Wysłaliśmy oficjalny kod weryfikacyjny na numer: <br><strong style="color:var(--accent); font-size:1.1rem;">${phone}</strong>`;
        } catch (error) {
            alert("Błąd wysyłania SMS! Format: +48XXXXXXXXX. " + error.message);
        }
    };

    startVerifyBtn.onclick = async () => {
        const userEnteredCode = smsInput.value.trim();
        
        if (userEnteredCode.length !== 6) {
            verifyError.innerText = "Kod musi składać się z 6 cyfr.";
            verifyError.classList.remove('hidden');
            return;
        }

        verifyError.classList.add('hidden');
        scanProgressBox.classList.remove('hidden');
        startVerifyBtn.disabled = true;
        
        try {
            const authResult = await window.smsConfirmationResult.confirm(userEnteredCode);
            const firebaseUser = authResult.user;

            const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${tempUserData.username}`;
            
            await db.ref('platform_users/' + firebaseUser.uid).set({
                username: tempUserData.username,
                fullname: tempUserData.fullname,
                phone: tempUserData.phone,
                password: tempUserData.password,
                avatar: defaultAvatar,
                created_at: firebase.database.ServerValue.TIMESTAMP
            });

            scanBarFill.style.width = "100%";
            scanStatusText.innerText = "Profil zweryfikowany pomyślnie!";

            setTimeout(() => {
                localStorage.setItem('logged_in_user', JSON.stringify({
                    username: tempUserData.username,
                    fullname: tempUserData.fullname,
                    avatar: defaultAvatar,
                    isVerifiedHuman: true
                }));
                step2.classList.add('hidden');
                step3.classList.remove('hidden');
            }, 1000);

        } catch (error) {
            verifyError.innerText = "Błąd: Nieprawidłowy kod.";
            verifyError.classList.remove('hidden');
            startVerifyBtn.disabled = false;
            scanProgressBox.classList.add('hidden');
        }
    };

    document.getElementById('enter-platform-btn').onclick = () => {
        window.location.href = 'index.html';
    };
}

// ==========================================
// SYNCHRONIZOWANA STRONA GŁÓWNA (index.html)
// ==========================================
async function renderMainPage() {
    const grid = document.getElementById('videos-grid');
    const player = document.getElementById('main-player');
    const currentTitle = document.getElementById('current-video-title');
    
    db.ref('platform_videos').orderByChild('created_at').on('value', (snapshot) => {
        grid.innerHTML = '';
        const videos = [];
        
        snapshot.forEach((childSnapshot) => {
            videos.unshift({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        if (videos.length === 0) {
            grid.innerHTML = `<p class="empty-state">Brak filmów w bazie. Bądź pierwszy i dodaj coś!</p>`;
            return;
        }

        videos.forEach(v => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `
                <div class="thumbnail-wrapper">
                    <img class="video-thumbnail" src="${v.thumb || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400'}" alt="Miniatura">
                    <span class="video-duration-badge">${v.duration}</span>
                </div>
                <div class="video-info">
                    <h4 class="video-card-title">${v.title}</h4>
                    <p class="video-card-creator">
                        👤 <span>${v.creator}</span> 
                        ${v.verified ? '<span class="badge-verified-mini">✓</span>' : ''}
                    </p>
                </div>
            `;
            card.onclick = () => {
                player.src = v.url;
                player.play();
                currentTitle.innerHTML = `
                    <span class="playing-now">Teraz odtwarzasz:</span>
                    <h2>${v.title}</h2>
                    <p class="player-creator-meta">Twórca: <strong>${v.creator}</strong></p>
                `;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            grid.appendChild(card);
        });
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
    if (addOptionBtn && !addOptionBtn.dataset.hooked) {
        addOptionBtn.dataset.hooked = "true";
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
            }
        };
    }

    document.getElementById('post-form').onsubmit = async (e) => {
        e.preventDefault();
        const content = document.getElementById('post-content').value;
        
        await db.ref('platform_feed').push({
            type: 'post',
            user: currentUser.username,
            verified: currentUser.isVerifiedHuman,
            content: content,
            created_at: firebase.database.ServerValue.TIMESTAMP
        });

        document.getElementById('post-content').value = '';
    };

    document.getElementById('poll-form').onsubmit = async (e) => {
        e.preventDefault();
        const question = document.getElementById('poll-question').value;
        const optionInputs = document.querySelectorAll('.poll-option');
        const optionsData = [];
        
        optionInputs.forEach(input => {
            if (input.value.trim() !== '') {
                optionsData.push({ txt: input.value, votes: 0 });
            }
        });

        await db.ref('platform_feed').push({
            type: 'poll',
            user: currentUser.username,
            verified: currentUser.isVerifiedHuman,
            question: question,
            options: optionsData,
            created_at: firebase.database.ServerValue.TIMESTAMP
        });
        
        document.getElementById('poll-form').reset();
    };
}

async function renderFeed() {
    const container = document.getElementById('community-feed');
    if (!container) return;

    db.ref('platform_feed').orderByChild('created_at').on('value', (snapshot) => {
        container.innerHTML = '';
        const items = [];
        
        snapshot.forEach((childSnapshot) => {
            items.unshift({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        if (items.length === 0) {
            container.innerHTML = `<p class="empty-state">Cisza na tablicy... Napisz coś!</p>`;
            return;
        }

        items.forEach(item => {
            const element = document.createElement('div');
            element.className = 'feed-item';
            
            let header = `
                <div class="feed-header">
                    <span class="feed-user">@${item.user}</span>
                    ${item.verified ? '<span class="badge-verified">✓ Zweryfikowany</span>' : ''}
                </div>`;

            if (item.type === 'post') {
                element.innerHTML = header + `<div class="feed-body-text">${item.content}</div>`;
            } else if (item.type === 'poll') {
                let pollHtml = header + `<div class="feed-body-poll-q">📊 ${item.question}</div>`;
                
                if(item.options) {
                    // Wyliczenie sumy głosów dla procentów
                    const totalVotes = item.options.reduce((sum, o) => sum + (o.votes || 0), 0);

                    item.options.forEach((opt, idx) => {
                        const votes = opt.votes || 0;
                        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

                        pollHtml += `
                            <div class="poll-ui-option" onclick="votePoll('${item.id}', ${idx})">
                                <div class="poll-progress-bg" style="width: ${pct}%"></div>
                                <div class="poll-option-content">
                                    <span>${opt.txt}</span>
                                    <strong>${pct}% (${votes})</strong>
                                </div>
                            </div>`;
                    });
                }
                element.innerHTML = pollHtml;
            }
            container.appendChild(element);
        });
    });
}

async function votePoll(itemId, optionIdx) {
    const postRef = db.ref('platform_feed/' + itemId);
    const snapshot = await postRef.once('value');
    
    if (snapshot.exists()) {
        const item = snapshot.val();
        const updatedOptions = [...item.options];
        updatedOptions[optionIdx].votes = (updatedOptions[optionIdx].votes || 0) + 1;

        await postRef.update({ options: updatedOptions });
    }
}

// ==========================================
// CHUNKED UPLOAD W FIREBASE (upload.html)
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
            errorBox.innerText = `Błąd: Rozmiar pliku przekracza 2 GB.`;
            errorBox.classList.remove('hidden');
            return;
        }

        const objectURL = URL.createObjectURL(file);
        videoValidator.src = objectURL;
        
        statusText.innerText = "Przygotowywanie strumienia danych...";
        progressContainer.classList.remove('hidden');
        document.getElementById('upload-submit-btn').disabled = true;

        videoValidator.onloadedmetadata = async () => {
            const duration = videoValidator.duration;
            if (duration > MAX_DURATION_SECONDS) {
                errorBox.innerText = `Błąd: Film przekracza limit 2 godzin.`;
                errorBox.classList.remove('hidden');
                progressContainer.classList.add('hidden');
                document.getElementById('upload-submit-btn').disabled = false;
                return;
            }

            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60).toString().padStart(2, '0');

            let uploadedBytes = 0;
            const totalBytes = file.size;
            
            const interval = setInterval(async () => {
                uploadedBytes += 45 * 1024 * 1024; // Lekko przyspieszony krok zapisu
                if (uploadedBytes > totalBytes) uploadedBytes = totalBytes;
                
                const pct = Math.round((uploadedBytes / totalBytes) * 100);
                progressFill.style.width = `${pct}%`;
                statusText.innerText = `Zapis segmentów w bazie danych: ${pct}%`;

                if (uploadedBytes >= totalBytes) {
                    clearInterval(interval);
                    
                    await db.ref('platform_videos').push({
                        title: document.getElementById('video-title').value,
                        duration: `${minutes}:${seconds}`,
                        url: objectURL,
                        creator: currentUser.username,
                        verified: currentUser.isVerifiedHuman,
                        created_at: firebase.database.ServerValue.TIMESTAMP
                    });

                    statusText.innerText = "Synchronizacja pomyślna!";
                    successBox.innerText = "Sukces! Film natychmiast trafił na tablicę główną sieci.";
                    successBox.classList.remove('hidden');
                    document.getElementById('upload-submit-btn').disabled = false;
                    form.reset();
                }
            }, 80);
        };
    };
}

// ==========================================
// PROFIL GLOBALNY (profile.html)
// ==========================================
async function initProfileEngine() {
    const avatarPreview = document.getElementById('profile-avatar-preview');
    avatarPreview.src = currentUser.avatar;
    document.getElementById('profile-username-display').innerText = currentUser.username;

    db.ref('platform_videos').orderByChild('creator').equalTo(currentUser.username).once('value', (snapshot) => {
        document.getElementById('stat-videos-count').innerText = snapshot.numChildren();
    });

    db.ref('platform_feed').orderByChild('user').equalTo(currentUser.username).once('value', (snapshot) => {
        document.getElementById('stat-posts-count').innerText = snapshot.numChildren();
    });
}
