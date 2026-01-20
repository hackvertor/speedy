const wpmSlider = document.getElementById('wpm');
const wpmValue = document.getElementById('wpm-value');
const readBtn = document.getElementById('read-btn');

// Load saved WPM
chrome.storage?.local.get(['wpm'], (result) => {
  if (result.wpm) {
    wpmSlider.value = result.wpm;
    wpmValue.textContent = result.wpm;
  }
});

// Update WPM display and save
wpmSlider.addEventListener('input', () => {
  wpmValue.textContent = wpmSlider.value;
  chrome.storage?.local.set({ wpm: wpmSlider.value });
});

// Start reading
readBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['src/content/content.js']
  });

  await chrome.tabs.sendMessage(tab.id, {
    action: 'startReading',
    wpm: parseInt(wpmSlider.value)
  });

  window.close();
});
