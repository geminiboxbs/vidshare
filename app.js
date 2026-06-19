// --- KONFIGURACJA CHUNKU I LIMITÓW ---
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_DURATION_SECONDS = 2 * 60 * 60; // 2 Godziny

// --- INICJALIZACJA DANYCH W LOCALSTORAGE ---
if (!localStorage.getItem('platform_videos')) {
    localStorage.setItem('platform_videos', JSON.stringify([
        { id: 1, title: 'Wprowadzenie do Architektury Systemów', duration: '10:15', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', thumb: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400' },
        { id: 2, title: 'Test Wydajności Sieci Bazy Danych', duration: '1:45:20', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', thumb: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400' }
    ]));
}
if (!localStorage.getItem('platform_feed')) {
    localStorage.setItem('platform_feed', JSON.stringify([
        { id: 1, type: 'post', user: 'JanKowalski', content: 'Witajcie na nowej, zdecentralizowanej platformie! Zero fałszywych kont, pełna weryfikacja plików.' },
        { id: 2, type: 'poll', user: 'Moderator AI', question: 'Jaki framework frontendowy preferujesz do dużych aplikacji?', options: [{txt: 'React', votes: 12}, {txt: 'Vue', votes: 5}, {txt: 'Svelte', votes: 8}] }
    ]));
}
if (!localStorage.getItem('platform_avatar')) {
    localStorage.setItem('platform_avatar', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200');
}

// --- GLOBALNY EVENT LISTENER PO ZAŁADOWANIU DOM ---
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalAvatars();
    
    // Obsługa logiki dla konkretnych podstron
    if (document.getElementById('videos-grid')) renderMainPage();
    if (document.getElementById('upload-form')) initUploadEngine();
    if (document.getElementById('profile-avatar-preview')) initProfileEngine();
});

function updateGlobalAvatars() {
    const cachedAvatar = localStorage.getItem('platform_avatar');
    const navLink = document.getElementById('nav-profile-link');
    if (navLink && cachedAvatar) {
        navLink.innerHTML = `<img src="${cachedAvatar}" style="width:25px; height:25px; border-radius:50%; vertical-align:middle; margin-right:5px; object-fit:cover;"> Profil`;
    }
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
                <p>Czas trwania: ${v.duration}</p>
            </div>
        `;
        card.onclick = () => {
            player.src = v.url;
            player.play();
            currentTitle.innerText = v.title;
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
    // Dynamiczne dodawanie opcji ankiety
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

    // Obsługa wysyłania zwykłego postu
    document.getElementById('post-form').onsubmit = (e) => {
        e.preventDefault();
        const content = document.getElementById('post-content').value;
        const feed = JSON.parse(localStorage.getItem('platform_feed'));
        
        feed.unshift({ id: Date.now(), type: 'post', user: 'Mój_Profil', content: content });
        localStorage.setItem('platform_feed', JSON.stringify(feed));
        document.getElementById('post-content').value = '';
        renderFeed();
    };

    // Obsługa wysyłania ankiety
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
        feed.unshift({ id: Date.now(), type: 'poll', user: 'Mój_Profil', question: question, options: optionsData });
        localStorage.setItem('platform_feed', JSON.stringify(feed));
        
        // Reset formularza ankiety
        document.getElementById('poll-form').reset();
        renderFeed();
    };
}

function renderFeed() {
    const feed = JSON.parse(localStorage.getItem('platform_feed'));
    const container = document.getElementById('community-feed');
    const avatar = localStorage.getItem('platform_avatar');
    container.innerHTML = '';

    feed.forEach(item => {
        const element = document.createElement('div');
        element.className = 'feed-item';
        
        let header = `
            <div class="feed-header">
                <img class="feed-avatar" src="${item.user === 'Mój_Profil' ? avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50'}">
                <strong>${item.user}</strong>
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

        // KROK 1: Walidacja binarna rozmiaru (2 GB Limit)
        if (file.size > MAX_FILE_SIZE_BYTES) {
            errorBox.innerText = `Błąd: Plik przekracza limit 2 GB (Twój plik: ${(file.size / (1024*1024*1024)).toFixed(2)} GB).`;
            errorBox.classList.remove('hidden');
            return;
        }

        // KROK 2: Odczyt metadanych wideo i weryfikacja czasu trwania (2h Limit)
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

            // KROK 3: Symulacja Chunked Upload (Wysyłanie porcjami po 10MB dla plików 2GB)
            simulateChunkedUpload(file, duration);
        };
    };

    function simulateChunkedUpload(file, duration) {
        let uploadedBytes = 0;
        const totalBytes = file.size;
        const chunkSize = 10 * 1024 * 1024; // Porcje po 10MB
        
        const interval = setInterval(() => {
            uploadedBytes += chunkSize;
            if (uploadedBytes > totalBytes) uploadedBytes = totalBytes;
            
            const percentage = Math.round((uploadedBytes / totalBytes) * 100);
            progressFill.style.width = `${percentage}%`;
            statusText.innerText = `Przesyłanie pakietów: ${percentage}% (${(uploadedBytes / (1024*1024)).toFixed(1)} MB / ${(totalBytes / (1024*1024)).toFixed(1)} MB)`;

            if (uploadedBytes >= totalBytes) {
                clearInterval(interval);
                
                // Zapisz nowo dodany film w tablicy symulującej serwer
                const currentVideos = JSON.parse(localStorage.getItem('platform_videos'));
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
                
                currentVideos.push({
                    id: Date.now(),
                    title: document.getElementById('video-title').value,
                    duration: `${minutes}:${seconds}`,
                    url: URL.createObjectURL(file), // Plik działa lokalnie jako blob URL
                    thumb: 'https://images.unsplash.com/photo-161152617213-7d7a39e9b1d7?w=400'
                });
                
                localStorage.setItem('platform_videos', JSON.stringify(currentVideos));
                
                statusText.innerText = "Serwer scalanie bloków danych... Gotowe!";
                successBox.innerText = "Sukces! Film przeszedł poprawnie weryfikację i został dodany na stronę główną.";
                successBox.classList.remove('hidden');
                document.getElementById('upload-submit-btn').disabled = false;
                form.reset();
                updateGlobalAvatars();
            }
        }, 150); // Szybkie interwały dla celów prezentacji frontendu
    }
}

// ==========================================
// LOGIKA PROFILU (profile.html)
// ==========================================
function initProfileEngine() {
    const avatarInput = document.getElementById('avatar-input');
    const avatarPreview = document.getElementById('profile-avatar-preview');
    
    // Załaduj zapisany avatar
    avatarPreview.src = localStorage.getItem('platform_avatar');

    // Liczniki statystyk
    const videos = JSON.parse(localStorage.getItem('platform_videos')) || [];
    const feed = JSON.parse(localStorage.getItem('platform_feed')) || [];
    
    // Filtrujemy tylko rzeczy dodane przez użytkownika
    const myVideosCount = videos.filter(v => v.id > 10).length; 
    const myFeedCount = feed.filter(f => f.user === 'Mój_Profil').length;

    document.getElementById('stat-videos-count').innerText = myVideosCount;
    document.getElementById('stat-posts-count').innerText = myFeedCount;

    // Obsługa wczytywania PRAWDZIWEGO pliku graficznego z komputera/telefonu
    avatarInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64Image = event.target.result;
                // Zapis binarnego Base64 do LocalStorage
                localStorage.setItem('platform_avatar', base64Image);
                // Aktualizacja w czasie rzeczywistym na komponencie
                avatarPreview.src = base64Image;
                updateGlobalAvatars();
            };
            reader.readAsDataURL(file);
        }
    };
}
