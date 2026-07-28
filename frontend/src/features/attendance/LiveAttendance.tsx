import React, { useEffect, useRef, useState } from 'react';
import { ScanFace, Clock, RefreshCw, Maximize, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as faceapi from 'face-api.js';
import Swal from 'sweetalert2';
import { loadFaceModels, extractFaceData } from '../../utils/faceApi';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  faceDescriptor: number[];
}

const cleanSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-2xl',
    confirmButton: 'px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium mx-2 transition-colors',
  },
  buttonsStyling: false
});

export const LiveAttendance: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const [isScanComplete, setIsScanComplete] = useState(false);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scanStatus, setScanStatus] = useState('Memuat sistem optik & AI...');
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const speakText = (text: string) => {
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      window.speechSynthesis.cancel();
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Gagal masuk mode layar penuh: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsReady(true);
      }
    } catch (err) {
      setScanStatus('Akses Kamera Ditolak. Harap izinkan akses kamera di browser.');
      throw err;
    }
  };

  const syncEmployeesData = async () => {
    try {
      const res = await axios.get('https://faceattend-tjuy.vercel.app/api/v1/employees');
      if (res.data.success) {
        const rawData = res.data.data;
        
        const parsedEmployees = rawData.map((emp: any) => {
          let descriptorArr: number[] = [];
          const descList = emp.faceDescriptors || emp.descriptors || [];

          if (descList && descList.length > 0) {
            const raw = descList[0].descriptor || descList[0].faceDescriptor;
            if (typeof raw === 'string') {
              try {
                const parsed = JSON.parse(raw);
                descriptorArr = Array.isArray(parsed) ? parsed : Object.values(parsed);
              } catch (e) {}
            } else if (Array.isArray(raw)) {
              descriptorArr = raw;
            } else if (typeof raw === 'object' && raw !== null) {
              descriptorArr = Object.values(raw);
            }
          }
          return { ...emp, faceDescriptor: descriptorArr };
        }).filter((emp: any) => emp.faceDescriptor && emp.faceDescriptor.length > 0);
        
        setEmployees(parsedEmployees);
        
        if (!isProcessingRef.current) {
          if (rawData.length > 0 && parsedEmployees.length === 0) {
             setScanStatus('ERROR: Pegawai ada, tapi Backend gagal mengirim Matriks Wajah!');
          } else if (parsedEmployees.length === 0) {
             setScanStatus('Database kosong. Menunggu sinkronisasi entitas baru...');
          } else {
             setScanStatus('Sistem Siap. Silakan arahkan wajah ke kamera.');
          }
        }
      }
    } catch (err: any) {
      if (!isProcessingRef.current) {
        setScanStatus('Kamera aktif, namun gagal menyinkronkan data dengan server.');
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initSystem = async () => {
      try {
        await loadFaceModels();
        await startCamera();
        await syncEmployeesData();
      } catch (err: any) {}
    };

    initSystem();

    const syncInterval = setInterval(() => {
      if (isMounted && !isProcessingRef.current) {
        syncEmployeesData();
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const recordAttendance = async (userId: string, firstName: string, lastName: string) => {
    try {
      await axios.post('https://faceattend-tjuy.vercel.app/api/v1/attendance', { userId, confidence: 0.1 });

      await speakText(`Absensi berhasil, selamat datang ${firstName} ${lastName}`);
      cleanSwal.fire({
        icon: 'success',
        title: 'Absensi Berhasil',
        text: `Identitas terverifikasi, ${firstName} ${lastName}!`,
        timer: 3000,
        showConfirmButton: false
      });

      setIsScanComplete(true);
    } catch (error: any) {
      speakText('Gagal, wajah tidak dikenali, silakan coba lagi.');
      const errMsg = error.response?.data?.message || error.message || 'Error tidak diketahui';
      cleanSwal.fire({
        icon: 'error',
        title: 'Gagal',
        text: errMsg,
        timer: 3000,
        showConfirmButton: false
      });
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
        setScanStatus('Sistem Siap. Silakan arahkan wajah ke kamera.');
      }, 4500); 
    }
  };

  const handleNextScan = () => {
    setIsScanComplete(false);
    isProcessingRef.current = false;
    setIsProcessing(false);
    setScanStatus('Sistem Siap. Silakan arahkan wajah ke kamera.');
  };

  useEffect(() => {
    if (!isReady || employees.length === 0) return;
    if (isScanComplete) return; // do not start detection when a scan has completed

    const interval = setInterval(async () => {
      if (isProcessingRef.current) return;
      if (isScanComplete) return;

      if (videoRef.current) {
        try {
          const detection = await extractFaceData(videoRef.current);
          const currentDescriptor = new Float32Array(detection.descriptor);
          
          let bestMatch = null;
          let minDistance = 0.45; 

          for (const emp of employees) {
            const savedDescriptor = new Float32Array(emp.faceDescriptor);
            const distance = faceapi.euclideanDistance(currentDescriptor, savedDescriptor);
            
            if (distance < minDistance) {
              minDistance = distance;
              bestMatch = emp;
            }
          }

          if (bestMatch) {
            isProcessingRef.current = true;
            setIsProcessing(true);
            setScanStatus(`Memproses data absensi untuk ${bestMatch.firstName}...`);
            recordAttendance(bestMatch.id, bestMatch.firstName, bestMatch.lastName);
          } else {
            isProcessingRef.current = true;
            setIsProcessing(true);
            setScanStatus('Wajah tidak dikenali. Coba lagi...');
            speakText('Gagal, wajah tidak dikenali, silakan coba lagi.');
            setTimeout(() => {
              isProcessingRef.current = false;
              setIsProcessing(false);
              setScanStatus('Sistem Siap. Silakan arahkan wajah ke kamera.');
            }, 3000);
          }
        } catch (error) {
          // Ignore detection errors while waiting for a valid face.
        } 
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isReady, employees, isScanComplete]);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans">
      <style>{`
        @keyframes laserMove {
          from { transform: translateY(-20%); }
          to { transform: translateY(120%); }
        }
      `}</style>
      <div className="w-full max-w-7xl mx-auto flex items-center justify-center p-6 gap-8">
        
        <div className="w-1/3 flex flex-col gap-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center relative">
                <ScanFace className="w-7 h-7 text-violet-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Kiosk Absensi</h1>
                <p className="text-sm text-slate-500">Live Log Absen</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-center border border-slate-100">
              <Clock className="w-6 h-6 text-violet-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-slate-900 tracking-tight">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 mt-0.5"><span className="text-sm font-bold">1</span></div>
                <p className="text-sm text-slate-600">Berdiri tepat di depan layar dan lepaskan masker/kacamata hitam.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 mt-0.5"><span className="text-sm font-bold">2</span></div>
                <p className="text-sm text-slate-600">Pastikan wajah Anda berada di dalam bingkai pindaian.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 mt-0.5"><span className="text-sm font-bold">3</span></div>
                <p className="text-sm text-slate-600">Tunggu hingga notifikasi hijau muncul di layar.</p>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2">
              {employees.length === 0 && !isProcessing && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
              <p className={`text-sm font-semibold text-center ${
                isProcessing ? 'text-violet-600' : 
                (isReady && employees.length > 0 ? 'text-emerald-600' : 'text-amber-500')
              }`}>
                {scanStatus}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={toggleFullScreen}
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-600 hover:text-violet-700 rounded-2xl text-sm font-bold transition-all shadow-sm"
            >
              <Maximize className="w-4 h-4" />
              Layar Penuh
            </button>
            <Link 
              to="/" 
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-2xl text-sm font-bold transition-all shadow-sm"
            >
              <Home className="w-4 h-4" />
              Halaman Utama
            </Link>
          </div>
        </div>

        <div className="flex-1 max-w-3xl">
          <div className="relative w-full aspect-[4/3] bg-slate-200 rounded-[2rem] overflow-hidden shadow-2xl shadow-violet-900/10 border-8 border-white">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover" 
              style={{ transform: 'scaleX(-1)' }} 
            />

            {isScanComplete && (
              <div className="absolute inset-0 bg-violet-800/40 flex items-center justify-center z-40">
                <div className="text-center px-6 py-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/20">
                  <h2 className="text-2xl font-bold text-white mb-4">Absensi Selesai</h2>
                  <button
                    onClick={handleNextScan}
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold"
                  >
                    Pindai Karyawan Berikutnya
                  </button>
                </div>
              </div>
            )}

            {!isProcessing && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0">
                  <div className="absolute left-[30%] top-0 h-full w-px bg-violet-400/70" style={{ animation: 'laserMove 3s ease-in-out infinite alternate' }} />
                  <div className="absolute left-[70%] top-0 h-full w-px bg-violet-400/70" style={{ animation: 'laserMove 3.6s ease-in-out infinite alternate', animationDelay: '0.8s' }} />
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center pointer-events-none">
                <div className="text-center px-6 py-4 rounded-3xl bg-slate-900/60 border border-white/20">
                  <p className="text-white text-lg font-semibold tracking-wide">Menganalisis Biometrik...</p>
                </div>
              </div>
            )}
            
            <div className="absolute inset-0 pointer-events-none p-12">
              <div className="w-full h-full border-2 border-dashed border-white/50 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-violet-500 rounded-tl-3xl -ml-[2px] -mt-[2px]"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-violet-500 rounded-tr-3xl -mr-[2px] -mt-[2px]"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-violet-500 rounded-bl-3xl -ml-[2px] -mb-[2px]"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-violet-500 rounded-br-3xl -mr-[2px] -mb-[2px]"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};