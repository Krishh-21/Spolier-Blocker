// Onboarding flow for first-time users
let currentStep = 1;
let selectedTitles = [];

const POPULAR_TITLES = [
  { title: 'Breaking Bad', icon: '🧪', id: 1396, type: 'tv' },
  { title: 'Game of Thrones', icon: '🐉', id: 1399, type: 'tv' },
  { title: 'Stranger Things', icon: '👾', id: 66732, type: 'tv' },
  { title: 'The Last of Us', icon: '🍄', id: 100088, type: 'tv' },
  { title: 'Avengers: Endgame', icon: '🦸', id: 299534, type: 'movie' },
  { title: 'Inception', icon: '🌀', id: 27205, type: 'movie' },
  { title: 'The Matrix', icon: '💊', id: 603, type: 'movie' },
  { title: 'Star Wars', icon: '⭐', id: 11, type: 'movie' }
];

// Initialize popular titles
function initPopularTitles() {
  const container = document.getElementById('popularTitles');
  container.innerHTML = '';
  
  POPULAR_TITLES.forEach(title => {
    const card = document.createElement('div');
    card.className = 'title-card';
    card.innerHTML = `
      <div class="title-card-icon">${title.icon}</div>
      <div class="title-card-name">${title.title}</div>
    `;
    
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      if (card.classList.contains('selected')) {
        selectedTitles.push(title);
      } else {
        selectedTitles = selectedTitles.filter(t => t.title !== title.title);
      }
    });
    
    container.appendChild(card);
  });
}

// Initialize demo blur effects
function initDemoBlurs() {
  const blurred = document.querySelectorAll('.demo-blurred');
  blurred.forEach(el => {
    el.addEventListener('click', () => {
      el.style.filter = 'blur(0)';
      const label = el.nextElementSibling;
      if (label && label.classList.contains('demo-label')) {
        label.textContent = 'Revealed';
        label.style.background = '#10b981';
      }
    });
  });
}

// Step navigation
function showStep(step) {
  document.querySelectorAll('.onboarding-step').forEach(el => {
    el.classList.remove('active');
  });
  document.getElementById(`step${step}`).classList.add('active');
  currentStep = step;
}

// Save selections and complete onboarding
async function completeOnboarding() {
  if (selectedTitles.length > 0) {
    const finishBtn = document.getElementById('step3Finish');
    if (finishBtn) {
      finishBtn.disabled = true;
      finishBtn.textContent = 'Building profiles…';
    }

    const store = await new Promise(resolve =>
      chrome.storage.sync.get(['selectedMedia', 'settings', 'tmdbKey', 'tmdbProxy'], resolve)
    );

    const existing = store.selectedMedia || [];
    const aggressiveness = store.settings?.aggressiveness ?? 2;
    const proxyUrl = (store.tmdbProxy || TMDB_DEFAULT_PROXY).replace(/\/$/, '');
    const apiKey = store.tmdbKey || '';
    const merged = [...existing];

    for (const titleItem of selectedTitles) {
      if (merged.find(t => t.title.toLowerCase() === titleItem.title.toLowerCase())) continue;

      const item = { id: titleItem.id, title: titleItem.title, media_type: titleItem.type };
      let profile;
      try {
        profile = await TmdbKnowledgeBuilder.buildForItem(item, { proxyUrl, apiKey, aggressiveness });
      } catch (e) {
        profile = {
          phrases: [titleItem.title.toLowerCase()],
          knowledge: null,
          mediaType: titleItem.type,
          tmdbId: titleItem.id
        };
      }

      merged.push({
        title: titleItem.title,
        phrases: profile.phrases?.length ? profile.phrases : [titleItem.title.toLowerCase()],
        type: titleItem.type,
        tmdbId: titleItem.id,
        knowledge: profile.knowledge || null
      });
    }

    await new Promise(resolve =>
      chrome.storage.sync.set({ selectedMedia: merged }, resolve)
    );
  }
  
  // Mark onboarding as complete
  await new Promise(resolve => 
    chrome.storage.sync.set({ onboardingComplete: true }, resolve)
  );
  
  // Close onboarding and open popup
  window.close();
}

// Event listeners
document.getElementById('step1Next').addEventListener('click', () => {
  if (selectedTitles.length === 0) {
    alert('Please select at least one title to continue, or click "Skip onboarding"');
    return;
  }
  showStep(2);
});

document.getElementById('step2Prev').addEventListener('click', () => showStep(1));
document.getElementById('step2Next').addEventListener('click', () => showStep(3));

document.getElementById('step3Prev').addEventListener('click', () => showStep(2));
document.getElementById('step3Finish').addEventListener('click', completeOnboarding);

document.getElementById('skipOnboarding').addEventListener('click', async () => {
  await new Promise(resolve => 
    chrome.storage.sync.set({ onboardingComplete: true }, resolve)
  );
  window.close();
});

// Search functionality (simplified for onboarding)
document.getElementById('onboardingSearchBtn').addEventListener('click', () => {
  const query = document.getElementById('onboardingSearch').value.trim();
  if (!query) return;
  
  document.getElementById('onboardingResults').innerHTML = `
    <div style="color: #98a2c8; padding: 10px; text-align: center;">
      Search feature available after onboarding. Click Continue to finish setup!
    </div>
  `;
});

document.getElementById('onboardingSearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('onboardingSearchBtn').click();
  }
});

// Initialize
initPopularTitles();
initDemoBlurs();
