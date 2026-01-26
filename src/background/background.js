chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'start-reading') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) return;

      const result = await chrome.storage.local.get(['wpm']);
      const wpm = parseInt(result.wpm) || 300;

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js']
      });

      await chrome.tabs.sendMessage(tab.id, {
        action: 'startReading',
        wpm: wpm
      });
    } catch (error) {
      console.error('Error starting reader:', error);
    }
  }
});