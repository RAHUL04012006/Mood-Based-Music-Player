# Mood-Based-Music-Player

## Overview

Mood-Based Music Player is a web application that detects the user's emotion through their webcam and plays a YouTube playlist corresponding to the detected mood. It uses facial emotion recognition powered by DeepFace and Flask for the backend server.



## Features

- Real-time webcam emotion detection via browser.
- Supports multiple emotions: happy, sad, angry, neutral, surprise, disgust.
- Each emotion is mapped to a curated YouTube playlist.
- Responsive web interface.
- Privacy-friendly: emotion analysis is performed in-session and not stored long-term.

## How it Works

1. The user accesses the main page.
2. The app starts an emotion analysis session and captures webcam images.
3. Images are sent to the backend (`app.py`), where DeepFace analyzes the emotion.
4. After a brief analysis (about 2.5 seconds), the app determines the dominant emotion.
5. The app selects and plays a random video from the corresponding YouTube playlist embedded on the page.

## Project Structure

```
.
├── README.md
├── app.py                 # Flask backend and emotion analysis logic
├── static/
│   ├── script.js          # Frontend JS for camera and API interaction
│   └── style.css          # Web UI styling
└── templates/
    └── index.html         # Main web interface
```

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/RAHUL04012006/Mood-Based-Music-Player.git
   cd Mood-Based-Music-Player
   ```

2. Install Python dependencies:
   ```sh
   pip install flask deepface opencv-python pillow numpy
   ```

3. Set any necessary environment variables (optional):
   - `SESSION_SECRET` for Flask session security.

4. Run the app:
   ```sh
   python app.py
   ```

5. Open your browser and go to `http://localhost:5000`

## Usage

- Grant camera access when prompted.
- Click to start analysis and let the app detect your mood.
- The application plays a playlist based on your detected emotion.

## Key Files

- [`app.py`](https://github.com/RAHUL04012006/Mood-Based-Music-Player/blob/main/app.py): Main Flask server, emotion logic, YouTube playlist mapping.
- [`static/script.js`](https://github.com/RAHUL04012006/Mood-Based-Music-Player/blob/main/static/script.js): Handles webcam capture and API requests.
- [`static/style.css`](https://github.com/RAHUL04012006/Mood-Based-Music-Player/blob/main/static/style.css): Styles the web interface.
- [`templates/index.html`](https://github.com/RAHUL04012006/Mood-Based-Music-Player/blob/main/templates/index.html): Main user interface.

## License

This project is for educational and personal use.

---
