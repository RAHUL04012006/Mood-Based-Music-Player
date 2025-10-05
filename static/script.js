// Mood-based Music Player JavaScript

class MoodMusicPlayer {
    constructor() {
        this.webcam = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.currentEmotion = null;
        this.currentVideoUrl = null;
        
        this.init();
    }
    
    init() {
        // Get DOM elements
        this.webcam = document.getElementById('webcam');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Bind event listeners
        this.bindEvents();
        
        // Initialize analysis state
        this.isAnalyzing = false;
        
        console.log('Mood Music Player initialized');
    }
    
    bindEvents() {
        // Camera controls
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('detectEmotion').addEventListener('click', () => this.startEmotionAnalysis());
        document.getElementById('newSong').addEventListener('click', () => this.playNewSong());
        
        // Error message close
        document.getElementById('closeError').addEventListener('click', () => this.hideError());
        
        // Auto-hide error after 5 seconds
        setTimeout(() => this.hideError(), 5000);
        
        // Make sure we clean up when leaving the page
        window.addEventListener('beforeunload', () => {
            if (this.stream) {
                this.stopCamera();
            }
        });
    }
    
    async startCamera() {
        try {
            console.log('Starting camera...');
            
            // Stop any existing camera stream
            if (this.stream) {
                this.stopCamera();
            }
            
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            // Set video stream
            this.webcam.srcObject = this.stream;
            this.webcam.classList.add('recording');
            
            // Enable detect emotion button
            const detectBtn = document.getElementById('detectEmotion');
            detectBtn.disabled = false;
            detectBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            
            const startBtn = document.getElementById('startCamera');
            startBtn.textContent = 'Camera Active';
            startBtn.disabled = true;
            startBtn.classList.add('bg-green-600');
            
            console.log('Camera started successfully');
            
            // Play a sound to indicate camera is ready
            this.playSound('camera_start.mp3');
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError('Failed to access camera. Please ensure you have granted camera permissions.');
        }
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.webcam.srcObject = null;
            this.webcam.classList.remove('recording');
            
            const startBtn = document.getElementById('startCamera');
            startBtn.textContent = 'Start Camera';
            startBtn.disabled = false;
            startBtn.classList.remove('bg-green-600');
            
            document.getElementById('detectEmotion').disabled = true;
        }
    }
    
    playSound(soundFile) {
        try {
            const audio = new Audio(`/static/sounds/${soundFile}`);
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {
            console.error('Error playing sound:', e);
        }
    }
    
    captureFrame() {
        try {
            // Set canvas dimensions to match video
            this.canvas.width = this.webcam.videoWidth;
            this.canvas.height = this.webcam.videoHeight;
            
            // Draw current video frame to canvas
            this.ctx.drawImage(this.webcam, 0, 0, this.canvas.width, this.canvas.height);
            
            // Convert canvas to base64 image
            const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
            
            return imageData;
            
        } catch (error) {
            console.error('Error capturing frame:', error);
            throw new Error('Failed to capture webcam frame');
        }
    }
    
    async startEmotionAnalysis() {
        try {
            console.log('Starting emotion analysis...');
            
            // Show loading indicator
            this.showLoading(true);
            
            // Hide previous results
            document.getElementById('emotionResults').classList.add('hidden');
            
            // Start a new analysis session
            const sessionResponse = await fetch('/start_emotion_analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const sessionData = await sessionResponse.json();
            
            if (!sessionData.success) {
                throw new Error(sessionData.error || 'Failed to start emotion analysis');
            }
            
            const sessionId = sessionData.session_id;
            console.log(`Started analysis session: ${sessionId}`);
            
            // Show analysis progress
            const progressEl = document.createElement('div');
            progressEl.id = 'analysisProgress';
            progressEl.className = 'text-center mt-4 text-white';
            progressEl.innerHTML = `
                <div class="inline-flex items-center">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span>Analyzing your emotion... <span id="analysisTime">0.0</span>s</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                    <div id="analysisProgressBar" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                </div>
            `;
            
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.innerHTML = '';
            loadingIndicator.appendChild(progressEl);
            loadingIndicator.classList.remove('hidden');
            
            // Start capturing and analyzing frames
            const startTime = Date.now();
            const analysisDuration = 2500; // 2.5 seconds
            let isComplete = false;
            
            const updateProgress = () => {
                if (isComplete) return;
                
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(100, (elapsed / (analysisDuration / 1000)) * 100);
                
                const timeEl = document.getElementById('analysisTime');
                const progressBar = document.getElementById('analysisProgressBar');
                
                if (timeEl) timeEl.textContent = elapsed.toFixed(1);
                if (progressBar) progressBar.style.width = `${progress}%`;
                
                if (progress < 100) {
                    requestAnimationFrame(updateProgress);
                }
            };
            
            // Start progress animation
            updateProgress();
            
            // Function to process frames
            const processFrame = async () => {
                if (isComplete) return;
                
                try {
                    const imageData = this.captureFrame();
                    
                    const response = await fetch('/detect_emotion', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            image: imageData,
                            session_id: sessionId
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        if (result.status === 'complete') {
                            // Analysis complete
                            isComplete = true;
                            console.log('Emotion analysis complete:', result);
                            
                            // Update UI with final result
                            this.displayEmotion(result.emotion, result.confidence, result.all_emotions);
                            this.playMusicForEmotion(result.emotion, result.video_url);
                            
                            // Store current emotion and video URL
                            this.currentEmotion = result.emotion;
                            this.currentVideoUrl = result.video_url;
                            
                            // Hide loading indicator
                            this.showLoading(false);
                            
                            // Show completion message briefly
                            if (progressEl) {
                                progressEl.innerHTML = `
                                    <div class="text-green-400">
                                        <i class="fas fa-check-circle mr-2"></i>
                                        Analysis complete!
                                    </div>
                                `;
                                setTimeout(() => {
                                    this.showLoading(false);
                                }, 1000);
                            }
                        } else {
                            // Continue analyzing
                            setTimeout(processFrame, 100); // Process next frame after a short delay
                        }
                    } else {
                        throw new Error(result.error || 'Emotion detection failed');
                    }
                } catch (error) {
                    console.error('Error in frame analysis:', error);
                    this.showError(`Analysis error: ${error.message}`);
                    this.showLoading(false);
                    isComplete = true;
                }
            };
            
            // Start processing frames
            processFrame();
            
        } catch (error) {
            console.error('Error in emotion analysis:', error);
            this.showError(`Failed to analyze emotion: ${error.message}`);
            this.showLoading(false);
        }
    }
    
    displayEmotion(emotion, confidence, allEmotions) {
        // Emotion emoji mapping
        const emotionEmojis = {
            'happy': '😊',
            'sad': '😢',
            'angry': '😠',
            'neutral': '😐',
            'surprise': '😲',
            'disgust': '🤢'
        };
        
        // Update emotion display
        document.getElementById('emotionEmoji').textContent = emotionEmojis[emotion] || '😐';
        document.getElementById('emotionName').textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
        document.getElementById('emotionConfidence').textContent = `${confidence}% confidence`;
        
        // Show emotion results
        document.getElementById('emotionResults').classList.remove('hidden');
        
        console.log('Emotion display updated:', emotion, confidence);
    }
    
    playMusicForEmotion(emotion, videoUrl) {
        console.log('Playing music for emotion:', emotion, videoUrl);
        
        // Hide "no music" state
        document.getElementById('noMusicState').classList.add('hidden');
        
        // Update YouTube iframe
        document.getElementById('youtubePlayer').src = videoUrl;
        
        // Show music container
        document.getElementById('musicContainer').classList.remove('hidden');
    }
    
    async playNewSong() {
        try {
            if (!this.currentEmotion) {
                this.showError('Please detect your emotion first');
                return;
            }
            
            console.log('Playing new song for emotion:', this.currentEmotion);
            
            // Request new song for the same emotion
            const response = await fetch('/detect_emotion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: this.captureFrame()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update with new video URL
                document.getElementById('youtubePlayer').src = result.video_url;
                this.currentVideoUrl = result.video_url;
                console.log('New song loaded:', result.video_url);
            } else {
                this.showError('Failed to load new song');
            }
            
        } catch (error) {
            console.error('Error loading new song:', error);
            this.showError('Failed to load new song. Please try again.');
        }
    }
    
    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const detectButton = document.getElementById('detectEmotion');
        
        if (show) {
            loadingIndicator.classList.remove('hidden');
            detectButton.disabled = true;
            detectButton.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Analyzing...';
        } else {
            loadingIndicator.classList.add('hidden');
            detectButton.disabled = false;
            detectButton.innerHTML = '<i class="fas fa-brain mr-2"></i>Detect Emotion';
        }
    }
    
    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        errorText.textContent = message;
        errorElement.classList.remove('hidden');
        
        console.error('Error shown to user:', message);
        
        // Auto-hide after 5 seconds
        setTimeout(() => this.hideError(), 5000);
    }
    
    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }
    
    // Cleanup method
    destroy() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Mood Music Player...');
    window.moodPlayer = new MoodMusicPlayer();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.moodPlayer) {
        window.moodPlayer.destroy();
    }
});

// Handle visibility changes (pause/resume when tab becomes invisible/visible)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden, pausing camera if active');
        // Could implement camera pause here if needed
    } else {
        console.log('Page visible again');
        // Could implement camera resume here if needed
    }
});
