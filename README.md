![Speedy - Speed Reader](assets/graphics/splash.png)

# Speedy

A Chrome extension that transforms any webpage into an RSVP (Rapid Serial Visual Presentation) speed reader. Read web content faster by displaying one word at a time with an optimized focal point.

## Features

- **Adjustable Speed**: Set your reading pace from 100 to 1000 words per minute
- **RSVP Technology**: Words displayed one at a time with an Optimal Recognition Point (ORP) highlighted for faster processing
- **Smart Content Extraction**: Automatically extracts article content while filtering out navigation, ads, and other clutter
- **Keyboard Controls**: Use Spacebar to pause/resume and Escape to close
- **Progress Tracking**: See your current position and total word count as you read
- **Full-screen Reader**: Immersive reading experience with a distraction-free overlay

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The Speedy icon will appear in your browser toolbar

## Usage

1. Navigate to any webpage you want to read
2. Click the Speedy extension icon in your toolbar
3. Adjust the reading speed using the slider (default: 300 WPM)
4. Click "Read Page" to start the speed reader
5. Use the controls or keyboard shortcuts to manage your reading session

### Controls

| Control | Action |
|---------|--------|
| Spacebar | Pause / Resume |
| Escape | Close reader |
| Pause button | Pause reading |
| Close button | Exit reader |

## How It Works

Speedy uses RSVP (Rapid Serial Visual Presentation) to display text one word at a time at your chosen speed. Each word is positioned so that the Optimal Recognition Point (ORP) - highlighted in orange - stays fixed in the center of your vision. This eliminates eye movement and allows for significantly faster reading speeds.

The ORP position is calculated based on word length:
- 1 character: 1st letter
- 2-5 characters: 2nd letter
- 6-9 characters: 3rd letter
- 10+ characters: 4th letter

## Project Structure

```
speedy/
├── manifest.json
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── content/
│       └── content.js
└── assets/
    ├── icons/
    └── graphics/
```

## Author

Created by [Gareth Heyes](https://garethheyes.co.uk)

## License

MIT License
