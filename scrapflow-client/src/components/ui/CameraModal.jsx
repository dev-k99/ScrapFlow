import { useRef, useState, useEffect } from 'react'
import { Camera, X, Check, RefreshCw } from 'lucide-react'

async function getCameraStream() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  })
}

async function capturePhoto(videoRef, canvasRef) {
  const video = videoRef.current
  const canvas = canvasRef.current
  if (!video || !canvas) return null
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
}

export const CameraModal = ({ isOpen, onClose, onCapture, title = 'Capture Photo' }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [isOpen])

  const startCamera = async () => {
    setError(null)
    try {
      const newStream = await getCameraStream()
      setStream(newStream)
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        videoRef.current.onloadedmetadata = () => setIsCameraReady(true)
      }
    } catch (err) {
      setError('Camera access denied or unavailable.')
    }
  }

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    setIsCameraReady(false)
    setCapturedImage(null)
  }

  const handleCapture = async () => {
    const blob = await capturePhoto(videoRef, canvasRef)
    if (blob) setCapturedImage({ blob, url: URL.createObjectURL(blob) })
  }

  const handleConfirm = () => {
    if (capturedImage) { onCapture(capturedImage.blob); onClose() }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-card w-full max-w-2xl overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-[var(--color-text)]">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {error ? (
            <p className="text-white/70 text-sm px-8 text-center">{error}</p>
          ) : !capturedImage ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {!isCameraReady && <RefreshCw className="absolute animate-spin text-white" size={36} />}
            </>
          ) : (
            <img src={capturedImage.url} className="w-full h-full object-contain" alt="Captured" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex justify-center gap-4 p-5 bg-[var(--color-surface-2)]">
          {!capturedImage ? (
            <button onClick={handleCapture} disabled={!isCameraReady || !!error}
              className="w-16 h-16 rounded-full bg-white border-4 border-emerald-500 flex items-center justify-center shadow-lg disabled:opacity-40 hover:scale-105 transition-transform active:scale-95">
              <Camera size={24} className="text-emerald-600" />
            </button>
          ) : (
            <>
              <button onClick={() => setCapturedImage(null)} className="btn-ghost flex items-center gap-2">
                <RefreshCw size={16} /> Retake
              </button>
              <button onClick={handleConfirm} className="btn-brand flex items-center gap-2">
                <Check size={16} /> Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
