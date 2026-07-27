// frontend/src/utils/faceApi.ts
import * as faceapi from 'face-api.js';

// Menggunakan jsdelivr agar koneksi stabil dan tidak dicegat CORS
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

export const loadFaceModels = async () => {
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    console.log('Model AI berhasil dimuat dari CDN jsdelivr');
  } catch (error) {
    console.error('Gagal memuat model:', error);
    throw new Error('Gagal mengunduh model AI. Periksa koneksi internet.');
  }
};

export const extractFaceData = async (videoElement: HTMLVideoElement) => {
  const detection = await faceapi.detectSingleFace(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  if (!detection) {
    throw new Error('Wajah tidak terdeteksi. Pastikan pencahayaan cukup dan wajah menghadap layar.');
  }
  return detection;
};