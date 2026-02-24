import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { getCameraStream, capturePhoto } from '../../utils/camera';

export const CameraModal = ({ isOpen, onClose, onCapture, title = "Capture Photo" }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCamerReady, setIsCameraReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const newStream = await getCameraStream();
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        setIsCameraReady(true);
      }
    } catch (err) {
      console.error("Failed to start camera", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraReady(false);
    setCapturedImage(null);
  };

  const handleCapture = async () => {
    const blob = await capturePhoto(videoRef, canvasRef);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setCapturedImage({ blob, url });
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage.blob);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-2xl bg-white overflow-hidden p-0">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!isCamerReady && <RefreshCw className="animate-spin text-white" size={48} />}
            </>
          ) : (
            <img src={capturedImage.url} className="w-full h-full object-contain" alt="Captured" />
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-6 flex justify-center space-x-4 bg-gray-50">
          {!capturedImage ? (
            <Button 
              onClick={handleCapture} 
              disabled={!isCamerReady}
              className="rounded-full w-16 h-16 p-0 flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full border-4 border-white/30 flex items-center justify-center">
                <div className="w-8 h-8 bg-white rounded-full"></div>
              </div>
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setCapturedImage(null)} className="flex items-center space-x-2">
                <RefreshCw size={18} />
                <span>Retake</span>
              </Button>
              <Button onClick={handleConfirm} className="flex items-center space-x-2">
                <Check size={18} />
                <span>Use Photo</span>
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
