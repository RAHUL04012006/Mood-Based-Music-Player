import os
import cv2
import base64
import numpy as np
import logging
import time
from collections import defaultdict
from PIL import Image
from io import BytesIO
from flask import Flask, render_template, request, jsonify
from deepface import DeepFace
import random

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key_for_development")

# Emotion to YouTube playlist mapping
EMOTION_PLAYLISTS = {
    #"happy": "PLxQpegrlImYt1j0PXBEl1-BO3n57kbTDC",
    "happy":"PLPDcFitil0KybETGScwmqpRhUeq9G2CMw",
    "sad": "PL3-sRm8xAzY-w9GS19pLXMyFRTuJcuUjy",
    "angry": "PLdoCkXlMMIyKZ0AvlxqaJg6QAjBSCtgtE",
    "neutral": "TXeBJteuQxE",

    "surprise": "PLdoCkXlMMIyIjSAp7rr7hgC28T-3uZeus",
    "disgust": "PLSfuhbfqZSRG_OoZ2NFwMBrzrMwxNHuiD"
}

def get_random_video_from_playlist(playlist_id):
    """
    Generate a random video URL from a YouTube playlist.
    This uses a simple approach by generating random video indices.
    """
    try:
        # Generate a random index (YouTube playlists can have varying lengths)
        # We'll use a reasonable range and let YouTube handle invalid indices
        random_index = random.randint(0, 50)
        
        # Construct the YouTube embed URL with playlist and random start index
        embed_url = f"https://www.youtube.com/embed/videoseries?list={playlist_id}&index={random_index}&autoplay=1"
        
        return embed_url
    except Exception as e:
        logging.error(f"Error generating random video URL: {str(e)}")
        # Fallback to playlist without specific index
        return f"https://www.youtube.com/embed/videoseries?list={playlist_id}&autoplay=1"

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

# Global variable to store emotion analysis history
emotion_history = {}

@app.route('/start_emotion_analysis', methods=['POST'])
def start_emotion_analysis():
    """
    Start a new emotion analysis session
    Returns a session ID for tracking
    """
    try:
        session_id = str(int(time.time() * 1000))  # Use timestamp as session ID
        emotion_history[session_id] = {
            'start_time': time.time(),
            'emotions': [],
            'frames_processed': 0
        }
        return jsonify({
            'success': True,
            'session_id': session_id
        })
    except Exception as e:
        logging.error(f"Error starting emotion analysis: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to start emotion analysis: {str(e)}'
        }), 500

@app.route('/detect_emotion', methods=['POST'])
def detect_emotion():
    """
    API endpoint to detect emotion from webcam image
    Expects base64 encoded image in JSON payload and session_id
    """
    try:
        # Get the image data and session ID from request
        data = request.get_json()
        
        if not data or 'image' not in data or 'session_id' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: image or session_id'
            }), 400
        
        session_id = data['session_id']
        
        # Check if session exists
        if session_id not in emotion_history:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired session'
            }), 400
            
        session_data = emotion_history[session_id]
        
        # Decode base64 image
        image_data = data['image']
        
        # Remove data URL prefix if present
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(image_data)
        
        # Convert to PIL Image
        pil_image = Image.open(BytesIO(image_bytes))
        
        # Convert PIL to OpenCV format
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Analyze emotion using DeepFace
        logging.info("Analyzing frame for emotion...")
        
        try:
            result = DeepFace.analyze(
                img_path=opencv_image,
                actions=['emotion'],
                enforce_detection=False,  # Continue even if face detection is uncertain
                silent=True  # Disable unnecessary logging
            )
            
            # Extract the dominant emotion
            if isinstance(result, list) and len(result) > 0:
                emotions = result[0]['emotion']
            else:
                emotions = result['emotion']
                
            # Store the emotion data
            session_data['emotions'].append(emotions)
            session_data['frames_processed'] += 1
            
            # Calculate time elapsed
            elapsed_time = time.time() - session_data['start_time']
            
            # Check if we've analyzed enough frames or time has passed (2-3 seconds)
            if elapsed_time >= 2.5:  # 2.5 seconds of analysis
                return get_final_emotion_result(session_id, session_data)
                
            return jsonify({
                'success': True,
                'status': 'analyzing',
                'frames_processed': session_data['frames_processed'],
                'time_elapsed': round(elapsed_time, 2)
            })
            
        except Exception as e:
            logging.error(f"Error in frame analysis: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Failed to analyze frame: {str(e)}',
                'status': 'error'
            }), 500
        
    except Exception as e:
        logging.error(f"Error in emotion detection: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to analyze emotion: {str(e)}',
            'status': 'error'
        }), 500

def get_final_emotion_result(session_id, session_data):
    """Calculate the final emotion result from all analyzed frames"""
    try:
        if not session_data['emotions']:
            raise ValueError("No emotion data collected")
            
        # Calculate average emotion scores across all frames
        emotion_sums = defaultdict(float)
        emotion_counts = defaultdict(int)
        
        for frame_emotions in session_data['emotions']:
            for emotion, score in frame_emotions.items():
                emotion_sums[emotion] += score
                emotion_counts[emotion] += 1
        
        # Calculate average scores
        avg_emotions = {
            emotion: emotion_sums[emotion] / emotion_counts[emotion]
            for emotion in emotion_sums
        }
        
        # Get the dominant emotion
        dominant_emotion = max(avg_emotions, key=avg_emotions.get)
        confidence = avg_emotions[dominant_emotion]
        
        logging.info(f"Final emotion analysis complete. Dominant: {dominant_emotion} (confidence: {confidence:.2f})")
        
        # Map emotion to our categories
        emotion_mapping = {
            'happy': 'happy',
            'sad': 'sad',
            'angry': 'angry',
            'neutral': 'neutral',
            'surprise': 'surprise',
            'disgust': 'disgust',
            'fear': 'neutral'  # Map fear to neutral as fallback
        }
        
        mapped_emotion = emotion_mapping.get(dominant_emotion.lower(), 'neutral')
        
        # Get random video URL for the detected emotion
        video_url = get_random_video_from_playlist(EMOTION_PLAYLISTS[mapped_emotion])
        
        # Clean up session data
        if session_id in emotion_history:
            del emotion_history[session_id]
        
        return jsonify({
            'success': True,
            'emotion': mapped_emotion,
            'confidence': round(confidence, 2),
            'video_url': video_url,
            'all_emotions': {k: round(v, 2) for k, v in avg_emotions.items()},
            'frames_analyzed': session_data['frames_processed'],
            'status': 'complete'
        })
        
    except Exception as e:
        logging.error(f"Error calculating final emotion: {str(e)}")
        # Clean up session data on error
        if session_id in emotion_history:
            del emotion_history[session_id]
            
        return jsonify({
            'success': False,
            'error': f'Failed to calculate final emotion: {str(e)}',
            'status': 'error'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
