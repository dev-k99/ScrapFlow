/**
 * Utility for handling camera access and photo capture
 */
export async function getCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, // Prefer back camera for mobile/tablet
      audio: false
    });
  } catch (error) {
    console.error("Camera access denied:", error);
    throw error;
  }
}

export function capturePhoto(videoRef, canvasRef) {
  const video = videoRef.current;
  const canvas = canvasRef.current;
  
  if (!video || !canvas) return null;

  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Convert to Blob for upload
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.8);
  });
}
