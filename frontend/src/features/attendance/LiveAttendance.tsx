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
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scanStatus, setScanStatus] = useState('Memuat sistem optik & AI...');
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      
      cleanSwal.fire({
        icon: 'success',
        title: 'Absensi Berhasil',
        text: `Identitas terverifikasi, ${firstName} ${lastName}!`,
        timer: 3000,
        showConfirmButton: false
      });
    } catch (error: any) {
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
        setScanStatus('Sistem Siap. Silakan arahkan wajah ke kamera.');
      }, 4500); 
    }
  };

  useEffect(() => {
    if (!isReady || employees.length === 0) return;

    const interval = setInterval(async () => {
      if (isProcessingRef.current) return;

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
            setScanStatus(`Memproses data absensi untuk ${bestMatch.firstName}...`);
            recordAttendance(bestMatch.id, bestMatch.firstName, bestMatch.lastName);
          }
        } catch (error) {} 
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isReady, employees]);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans">
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
              {employees.length === 0 && !isProcessingRef.current && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
              <p className={`text-sm font-semibold text-center ${
                isProcessingRef.current ? 'text-violet-600' : 
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