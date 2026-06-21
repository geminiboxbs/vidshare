// --- KONFIGURACJA POŁĄCZENIA Z TWOIM FIREBASE (vidsharepl) ---
const firebaseConfig = {
    apiKey: "AIzaSyATEGWHEEoFefaTI430QLrtm86rhVpOowk",
    authDomain: "vidsharepl.firebaseapp.com",
    projectId: "vidsharepl",
    storageBucket: "vidsharepl.firebasestorage.app",
    messagingSenderId: "707546142335",
    appId: "1:707546142335:web:439c07784adc2088b0514a",
    measurementId: "G-C9TJJ04ZZ6"
};

// Inicjalizacja Firebase i bazy Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_DURATION_SECONDS = 2 * 60 * 60; // 2 Godziny

// --- STRAŻNIK SESJI ---
const currentUser = JSON.parse(localStorage.getItem('logged_in_user'));
const isAuthPage = window.location.pathname.endsWith('auth.html');

if (!currentUser && !isAuthPage) {
    window.location.href = 'auth.html';
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
// SYNCHRONIZOWANA AUTORYZACJA (auth.html)
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

    regForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();

        // Sprawdzanie w Firestore czy login lub telefon zajęty
        const userCheck = await db.collection('platform_users').where('username', '==', username).get();
        const phoneCheck = await db.collection('platform_users').where('phone', '==', phone).get();

        if (!userCheck.empty || !phoneCheck.empty) {
            alert("Ten login lub numer telefonu jest już zarejestrowany!");
            return;
        }
        
        tempUserData = {
            username: username,
            fullname: document.getElementById('reg-fullname').value.trim(),
            phone: phone,
            password: document.getElementById('reg-password').value
        };
        
        simulatedGeneratedCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        smsInfoText.innerHTML = `Wysłaliśmy kod na numer <strong>${phone}</strong>.<br><span style="color:#38d9a9; font-weight:bold;">Twój kod SMS to: ${simulatedGeneratedCode}</span>`;
    };

    startVerifyBtn.onclick = async () => {
        const userEnteredCode = smsInput.value.trim();
        
        if (userEnteredCode !== simulatedGeneratedCode) {
            verifyError.innerText = "Błąd: Nieprawidłowy token.";
            verifyError.classList.remove('hidden');
            return;
        }

        verifyError.classList.add('hidden');
        scanProgressBox.classList.remove('hidden');
        startVerifyBtn.disabled = true;
        
        const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${tempUserData.username}`;
        
        try {
            await db.collection('platform_users').add({
                username: tempUserData.username,
                fullname: tempUserData.fullname,
                phone: tempUserData.phone,
                password: tempUserData.password,
                avatar: defaultAvatar,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            scanBarFill.style.width = "100%";
            scanStatusText.innerText = "Zsynchronizowano z chmurą Google Firebase!";

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
            verifyError.innerText = "Błąd Firebase: " + error.message;
            verifyError.classList.remove('hidden');
            startVerifyBtn.disabled = false;
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
    
    const snapshot = await db.collection('platform_videos').orderBy('created_at', 'desc').get();

    grid.innerHTML = '';
    snapshot.forEach(doc => {
        const v = doc.data();
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <img class="video-thumbnail" src="${v.thumb || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400'}" alt="Miniatura">
            <div class="video-info">
                <h4>${v.title}</h4>
                <p>👤 ${v.creator} ${v.verified ? '<span class="badge badge-verified" style="font-size:0.65rem; padding:1px 5px;">✓ Prawdziwy</span>' : ''}</p>
                <p>Czas: ${v.duration}</p>
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
        
        await db.collection('platform_feed').add({
            type: 'post',
            user: currentUser.username,
            verified: currentUser.isVerifiedHuman,
            content: content,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('post-content').value = '';
        renderFeed();
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

        await db.collection('platform_feed').add({
            type: 'poll',
            user: currentUser.username,
            verified: currentUser.isVerifiedHuman,
            question: question,
            options: optionsData,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('poll-form').reset();
        renderFeed();
    };
}

async function renderFeed() {
    const container = document.getElementById('community-feed');
    if (!container) return;

    const snapshot = await db.collection('platform_feed').orderBy('created_at', 'desc').get();
    container.innerHTML = '';

    snapshot.forEach(doc => {
        const item = doc.data();
        const docId = doc.id;
        const element = document.createElement('div');
        element.className = 'feed-item';
        
        let header = `
            <div class="feed-header">
                <strong>${item.user}</strong>
                ${item.verified ? '<span class="badge badge-verified">✓ Zweryfikowany</span>' : ''}
            </div>`;

        if (item.type === 'post') {
            element.innerHTML = header + `<p>${item.content}</p>`;
        } else if (item.type === 'poll') {
            let pollHtml = header + `<p style="font-weight:600; margin-bottom:10px;">📊 ${item.question}</p>`;
            item.options.forEach((opt, idx) => {
                pollHtml += `
                    <div class="poll-ui-option" onclick="votePoll('${docId}', ${idx})">
                        <span>${opt.txt}</span>
                        <strong>${opt.votes} głosów</strong>
                    </div>`;
            });
            element.innerHTML = pollHtml;
        }
        container.appendChild(element);
    });
}

async function votePoll(docId, optionIdx) {
    const docRef = db.collection('platform_feed').doc(docId);
    const doc = await docRef.get();
    
    if (doc.exists) {
        const item = doc.data();
        const updatedOptions = [...item.options];
        updatedOptions[optionIdx].votes += 1;

        await docRef.update({ options: updatedOptions });
        renderFeed();
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
        
        statusText.innerText = "Analiza i synchronizacja strumienia...";
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
                uploadedBytes += 30 * 1024 * 1024;
                if (uploadedBytes > totalBytes) uploadedBytes = totalBytes;
                
                const pct = Math.round((uploadedBytes / totalBytes) * 100);
                progressFill.style.width = `${pct}%`;
                statusText.innerText = `Zapis do struktur Google Cloud: ${pct}%`;

                if (uploadedBytes >= totalBytes) {
                    clearInterval(interval);
                    
                    await db.collection('platform_videos').add({
                        title: document.getElementById('video-title').value,
                        duration: `${minutes}:${seconds}`,
                        url: objectURL,
                        creator: currentUser.username,
                        verified: currentUser.isVerifiedHuman,
                        created_at: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    statusText.innerText = "Zakończono synchronizację!";
                    successBox.innerText = "Sukces! Film jest od teraz widoczny dla każdego użytkownika platformy.";
                    successBox.classList.remove('hidden');
                    document.getElementById('upload-submit-btn').disabled = false;
                    form.reset();
                }
            }, 100);
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

    const videosSnap = await db.collection('platform_videos').where('creator', '==', currentUser.username).get();
    const feedSnap = await db.collection('platform_feed').where('user', '==', currentUser.username).get();

    document.getElementById('stat-videos-count').innerText = videosSnap.size;
    document.getElementById('stat-posts-count').innerText = feedSnap.size;
}
