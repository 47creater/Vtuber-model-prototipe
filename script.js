const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const characterImg = document.getElementById('character');
const characterContainer = document.querySelector('.character-container');

// State
let currentExpression = 'base'; // base, blink, talk, laugh, cry
let overrideExpression = null; // triggered by keys

function onResults(results) {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    // 1. Calculate Head Pose (Pitch, Yaw, Roll)
    // Simplified estimation using nose, and cheeks
    // Nose tip: 1
    // Left ear: 234, Right ear: 454
    // Chin: 152, Top of head: 10
    
    // Roll (Z-axis rotation): Angle between eyes or ears
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const roll = Math.atan2(dy, dx); // Radians

    // Yaw (Y-axis rotation): Ratio of nose dist to ears
    const nose = landmarks[1];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const midPointX = (leftCheek.x + rightCheek.x) / 2;
    const yaw = (nose.x - midPointX) * 3.0; // Scaled for effect

    // Pitch (X-axis rotation)
    // Compare nose Y to eye line Y
    const eyeMidY = (leftEye.y + rightEye.y) / 2;
    const pitch = (nose.y - eyeMidY) * 3.0;

    // Apply transformation
    // We invert some values to mirror movement intuitively
    const rotationZ = roll * (180 / Math.PI);
    const rotationY = yaw * (180 / Math.PI); // Not possible in 2D easily, but we can translate X
    const rotationX = pitch * (180 / Math.PI); 

    // Move character slightly
    const translateX = -yaw * 1000; // Screen pixels estimate
    const translateY = pitch * 1000;

    characterContainer.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotationZ}deg)`;

    // 2. Blink Detection (EAR - Eye Aspect Ratio)
    // Left eye: 159 (top), 145 (bottom)
    // Right eye: 386 (top), 374 (bottom)
    const leftEyeH = Math.abs(landmarks[159].y - landmarks[145].y);
    const rightEyeH = Math.abs(landmarks[386].y - landmarks[374].y);
    const blinkThreshold = 0.012; // Tuning needed
    const isBlinking = (leftEyeH < blinkThreshold) && (rightEyeH < blinkThreshold);

    // 3. Mouth Detection (MAR - Mouth Aspect Ratio)
    // Top lip: 13, Bottom lip: 14
    const mouthDist = Math.abs(landmarks[13].y - landmarks[14].y);
    const mouthThreshold = 0.05; // Tuning needed
    const isTalking = mouthDist > mouthThreshold;

    // Determine state
    let nextState = 'base';
    
    if (overrideExpression) {
        nextState = overrideExpression;
    } else {
        if (isTalking) {
            nextState = 'talk';
        } else if (isBlinking) {
            nextState = 'blink';
        } else {
            nextState = 'base';
        }
    }

    if (currentExpression !== nextState) {
        currentExpression = nextState;
        updateCharacter(currentExpression);
    }
  }
}

function updateCharacter(state) {
    // Map state to filename
    // base.png, blink.png, talk.png, laugh.png, cry.png
    let filename = 'base.png';
    switch (state) {
        case 'blink': filename = 'blink.png'; break;
        case 'talk': filename = 'talk.png'; break;
        case 'laugh': filename = 'laugh.png'; break;
        case 'cry': filename = 'cry.png'; break;
        default: filename = 'base.png';
    }
    characterImg.src = filename;
}

// MediaPipe Setup
const faceMesh = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({image: videoElement});
  },
  width: 640,
  height: 480
});
camera.start();

// Keyboard Controls
window.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'l': overrideExpression = 'laugh'; updateCharacter('laugh'); break;
        case 'c': overrideExpression = 'cry'; updateCharacter('cry'); break;
        case 'n': overrideExpression = null; updateCharacter('base'); break; // Normal / Reset
    }
});

function toggleDebug() {
    videoElement.classList.toggle('show');
}
