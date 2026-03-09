// View Elements
const viewChapterSelect = document.getElementById('view-chapter-select');
const viewSettings = document.getElementById('view-settings');
const viewFlashcards = document.getElementById('view-flashcards');

// Sub-elements
const surahList = document.getElementById('surah-list');
const loadingSurahs = document.getElementById('loading-surahs');
const homeBtn = document.getElementById('home-btn');
const selectedSurahNameSpan = document.getElementById('selected-surah-name');
const startReadingBtn = document.getElementById('start-reading-btn');
const loadingAyahs = document.getElementById('loading-ayahs');
const flashcardContainer = document.getElementById('flashcard-container');
const flashcardText = document.getElementById('flashcard-text');
const currentVerseIndicator = document.getElementById('current-verse-indicator');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevCardBtn = document.getElementById('prev-card-btn');
const nextCardBtn = document.getElementById('next-card-btn');
const progressFill = document.getElementById('progress-bar-fill');
const timingBtns = document.querySelectorAll('.timing-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// State
let allSurahs = [];
let currentSurahId = null;
let currentSurahData = null;
let currentTimingS = 3;
let currentReadingMode = 'syllable';

// Flashcard State
let isPlaying = false;
let currentAyahIndex = 0;
let currentWordIndex = 0;
let currentSyllableIndex = 0;
let flashcardTimer = null;
let progressStartTime = 0;
let progressInterval = null;

// Initialize
async function init() {
    homeBtn.addEventListener('click', goHome);
    startReadingBtn.addEventListener('click', startFlashcards);

    timingBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            timingBtns.forEach(b => b.classList.remove('active'));
            const target = e.target;
            target.classList.add('active');
            currentTimingS = parseFloat(target.dataset.time);
        });
    });

    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => b.classList.remove('active'));
            const target = e.target;
            target.classList.add('active');
            currentReadingMode = target.dataset.mode;
        });
    });

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const icon = themeToggleBtn.querySelector('i');
            if (document.body.classList.contains('light-mode')) {
                icon.setAttribute('data-lucide', 'moon');
            } else {
                icon.setAttribute('data-lucide', 'sun');
            }
            lucide.createIcons();
        });
    }

    playPauseBtn.addEventListener('click', togglePlayPause);
    nextCardBtn.addEventListener('click', forceNextCard);
    prevCardBtn.addEventListener('click', forcePrevCard);

    await fetchSurahs();
}

// Navigation
function switchView(viewElement) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

    viewElement.classList.remove('hidden');
    viewElement.classList.add('active');

    if (viewElement === viewChapterSelect) {
        homeBtn.classList.add('hidden');
    } else {
        homeBtn.classList.remove('hidden');
    }
}

function goHome() {
    stopFlashcardTimer();
    switchView(viewChapterSelect);
}

// Fetching
async function fetchSurahs() {
    try {
        const res = await fetch('/api/surahs');
        const json = await res.json();

        if (json.success) {
            allSurahs = json.data;
            renderSurahList();
        } else {
            console.error('Failed to fetch surahs', json.error);
        }
    } catch (e) {
        console.error(e);
    } finally {
        loadingSurahs.classList.add('hidden');
    }
}

function renderSurahList() {
    surahList.innerHTML = '';
    allSurahs.forEach(surah => {
        const card = document.createElement('div');
        card.className = 'surah-card';
        card.innerHTML = `
            <span class="number">${surah.number}</span>
            <span class="name">${surah.name}</span>
            <span class="english-name">${surah.englishName}</span>
        `;
        card.addEventListener('click', () => openSettings(surah));
        surahList.appendChild(card);
    });
}

function openSettings(surah) {
    currentSurahId = surah.number;
    selectedSurahNameSpan.textContent = surah.englishName;
    switchView(viewSettings);
}

// Flashcards Logic
async function startFlashcards() {
    switchView(viewFlashcards);
    flashcardContainer.classList.add('hidden');
    loadingAyahs.classList.remove('hidden');

    // Stop any existing timers
    stopFlashcardTimer();

    try {
        const res = await fetch(`/api/surah/${currentSurahId}`);
        const json = await res.json();

        if (json.success) {
            currentSurahData = json.data;
            currentAyahIndex = 0;
            currentWordIndex = 0;
            currentSyllableIndex = 0;

            loadingAyahs.classList.add('hidden');
            flashcardContainer.classList.remove('hidden');

            updateFlashcardDisplay();
            play();
        }
    } catch (e) {
        console.error(e);
    }
}

function updateFlashcardDisplay() {
    if (!currentSurahData) return;

    const ayah = currentSurahData.ayahs[currentAyahIndex];
    if (!ayah) return;

    currentVerseIndicator.textContent = `Ayah ${ayah.number}`;

    // Animate change
    flashcardText.style.animation = 'none';
    flashcardText.offsetHeight; // trigger reflow
    flashcardText.style.animation = null;

    if (currentReadingMode === 'verse') {
        flashcardText.textContent = ayah.text;
    } else if (currentReadingMode === 'word') {
        const word = ayah.words[currentWordIndex];
        if (!word) return;
        flashcardText.textContent = word.word;
    } else { // syllable
        const word = ayah.words[currentWordIndex];
        if (!word) return;
        const syllable = word.syllables[currentSyllableIndex];
        flashcardText.textContent = syllable;
    }
}

function moveToNextCard() {
    if (!currentSurahData) return false;

    const ayah = currentSurahData.ayahs[currentAyahIndex];

    if (currentReadingMode === 'verse') {
        if (currentAyahIndex < currentSurahData.ayahs.length - 1) {
            currentAyahIndex++;
            currentWordIndex = 0;
            currentSyllableIndex = 0;
            return true;
        }
        return false;
    } else if (currentReadingMode === 'word') {
        if (currentWordIndex < ayah.words.length - 1) {
            currentWordIndex++;
            currentSyllableIndex = 0;
            return true;
        }
        if (currentAyahIndex < currentSurahData.ayahs.length - 1) {
            currentAyahIndex++;
            currentWordIndex = 0;
            currentSyllableIndex = 0;
            return true;
        }
        return false;
    } else {
        const word = ayah.words[currentWordIndex];
        if (currentSyllableIndex < word.syllables.length - 1) {
            currentSyllableIndex++;
            return true;
        }

        if (currentWordIndex < ayah.words.length - 1) {
            currentWordIndex++;
            currentSyllableIndex = 0;
            return true;
        }

        if (currentAyahIndex < currentSurahData.ayahs.length - 1) {
            currentAyahIndex++;
            currentWordIndex = 0;
            currentSyllableIndex = 0;
            return true;
        }

        return false; // Reached the end
    }
}

function moveToPrevCard() {
    if (!currentSurahData) return false;

    if (currentReadingMode === 'verse') {
        if (currentAyahIndex > 0) {
            currentAyahIndex--;
            currentWordIndex = 0;
            currentSyllableIndex = 0;
            return true;
        }
        return false;
    } else if (currentReadingMode === 'word') {
        if (currentWordIndex > 0) {
            currentWordIndex--;
            currentSyllableIndex = 0;
            return true;
        }
        if (currentAyahIndex > 0) {
            currentAyahIndex--;
            const prevAyah = currentSurahData.ayahs[currentAyahIndex];
            currentWordIndex = prevAyah.words.length - 1;
            currentSyllableIndex = 0;
            return true;
        }
        return false;
    } else {
        if (currentSyllableIndex > 0) {
            currentSyllableIndex--;
            return true;
        }

        if (currentWordIndex > 0) {
            currentWordIndex--;
            const prevWord = currentSurahData.ayahs[currentAyahIndex].words[currentWordIndex];
            currentSyllableIndex = prevWord.syllables.length - 1;
            return true;
        }

        if (currentAyahIndex > 0) {
            currentAyahIndex--;
            const prevAyah = currentSurahData.ayahs[currentAyahIndex];
            currentWordIndex = prevAyah.words.length - 1;
            const prevWord = prevAyah.words[currentWordIndex];
            currentSyllableIndex = prevWord.syllables.length - 1;
            return true;
        }

        return false; // Reached the beginning
    }
}

function performNextFlashcardTick() {
    if (moveToNextCard()) {
        updateFlashcardDisplay();
        resetProgressTimer();
    } else {
        // Finished the Surah
        pause();
        flashcardText.textContent = "End of Surah";
    }
}

function play() {
    isPlaying = true;
    const icon = playPauseBtn.querySelector('i');
    if (icon) {
        icon.setAttribute('data-lucide', 'pause');
        lucide.createIcons();
    }

    resetProgressTimer();
}

function pause() {
    isPlaying = false;
    const icon = playPauseBtn.querySelector('i');
    if (icon) {
        icon.setAttribute('data-lucide', 'play');
        lucide.createIcons();
    }

    stopFlashcardTimer();
    progressFill.style.width = '0%';
}

function togglePlayPause() {
    if (isPlaying) {
        pause();
    } else {
        play();
    }
}

function forceNextCard() {
    if (moveToNextCard()) {
        updateFlashcardDisplay();
        if (isPlaying) resetProgressTimer();
    }
}

function forcePrevCard() {
    if (moveToPrevCard()) {
        updateFlashcardDisplay();
        if (isPlaying) resetProgressTimer();
    }
}

function stopFlashcardTimer() {
    if (flashcardTimer) clearTimeout(flashcardTimer);
    if (progressInterval) clearInterval(progressInterval);
}

function resetProgressTimer() {
    stopFlashcardTimer();

    const durationMs = currentTimingS * 1000;
    progressStartTime = Date.now();

    progressFill.style.width = '0%';

    // Start interval
    progressInterval = setInterval(() => {
        const elapsed = Date.now() - progressStartTime;
        const percentage = Math.min(100, (elapsed / durationMs) * 100);
        progressFill.style.width = percentage + '%';

        if (elapsed >= durationMs) {
            performNextFlashcardTick();
        }
    }, 16); // ~60fps smooth progress
}

// Start app
document.addEventListener('DOMContentLoaded', init);
