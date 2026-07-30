import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Users, LayoutDashboard, LogOut, UserPlus, X, FileSpreadsheet, ClipboardList, Terminal, Activity, Fingerprint, Search, CheckCircle2, Trash2, Camera, Binary, Database, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { loadFaceModels, extractFaceData } from '../../utils/faceApi';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  snapshotUrl?: string;
}

interface AttendanceLog {
  id: string;
  timestamp: string;
  type: 'IN' | 'OUT';
  status: string;
  attendanceStatus?: 'ON_TIME' | 'LATE';
  lateMinutes?: number;
  confidence: number;
  user: { employeeId: string; firstName: string; lastName: string; };
}

const cleanSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-2xl',
    confirmButton: 'px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium mx-2 transition-colors',
    cancelButton: 'px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium mx-2 transition-colors'
  },
  buttonsStyling: false
});

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'attendance'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [todayAttendance, setTodayAttendance] = useState(0);
  
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState('Sistem Siap.');
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDossier, setSelectedDossier] = useState<Employee | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchEmployees();
    fetchLogsAndStats();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('https://faceattend-tjuy.vercel.app/api/v1/employees');
      if (response.data && response.data.success) {
        setEmployees(response.data.data || []);
      }
    } catch (err) {}
  };

  const fetchLogsAndStats = async () => {
    try {
      const response = await axios.get('https://faceattend-tjuy.vercel.app/api/v1/attendance/logs');
      if (response.data && response.data.success) {
        setAttendanceLogs(response.data.data.logs || []);
        setTodayAttendance(response.data.data.stats?.todayAttendance || 0);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (isModalOpen) {
      loadFaceModels().then(() => startCamera()).catch(() => setScanStatus('Error: Model AI Gagal.'));
    } else {
      stopCamera();
    }
  }, [isModalOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) { setScanStatus('Error: Akses Kamera Ditolak.'); }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleCaptureFace = async () => {
    if (!videoRef.current) return;
    setIsScanning(true); setScanStatus('Mengekstraksi Wajah...');
    try {
      const detection = await extractFaceData(videoRef.current);
      setFaceDescriptor(Array.from(detection.descriptor));

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setSnapshotUrl(canvas.toDataURL('image/jpeg', 0.8));
      }

      setScanStatus('Data Wajah Tersimpan.');
    } catch (err: any) { setScanStatus('Gagal mendeteksi wajah.'); } 
    finally { setIsScanning(false); }
  };

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceDescriptor || !snapshotUrl) {
      cleanSwal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Harap pindai wajah terlebih dahulu.' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await axios.post('https://faceattend-tjuy.vercel.app/api/v1/employees', { 
        name, employeeId, email, faceDescriptor, snapshotUrl 
      });
      if (res.data.success) {
        setIsModalOpen(false); setName(''); setEmployeeId(''); setEmail(''); setFaceDescriptor(null); setSnapshotUrl(null);
        fetchEmployees();
        cleanSwal.fire({ icon: 'success', title: 'Berhasil', text: 'Karyawan baru telah ditambahkan.' });
      }
    } catch (err: any) {
      cleanSwal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Gagal menyimpan data.' });
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteEmployee = async (id: string) => {
    const result = await cleanSwal.fire({
      title: 'Hapus Karyawan?',
      text: 'Semua data dan riwayat absensi akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const res = await axios.delete(`https://faceattend-tjuy.vercel.app/api/v1/employees/${id}`);
        if (res.data.success) {
          setSelectedDossier(null);
          fetchEmployees();
          cleanSwal.fire({ icon: 'success', title: 'Dihapus!', text: 'Data karyawan telah dihapus.' });
        }
      } catch (err: any) {
        cleanSwal.fire({ icon: 'error', title: 'Error', text: 'Gagal menghapus data.' });
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Waktu', 'ID Pegawai', 'Nama', 'Tipe', 'Akurasi Jarak (Euclidean)'];
    const csvRows = attendanceLogs.map(log => {
      const date = log.timestamp ? new Date(log.timestamp).toLocaleDateString('id-ID') : '-';
      const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID') : '-';
      const firstName = log.user?.firstName || '';
      const lastName = log.user?.lastName || '';
      return `"${date}","${time}","${log.user?.employeeId || '-'}","${firstName} ${lastName}","${log.type || '-'}","${log.confidence || '-'}"`;
    });
    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `AUDIT_ABSENSI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const safeFormatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try { return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return '-'; }
  };
  
  const safeFormatTime = (dateString?: string) => {
    if (!dateString) return '-';
    try { return new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); } catch { return '-'; }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const weeklyStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    attendanceLogs.forEach(log => {
      const date = new Date(log.timestamp);
      let day = date.getDay();
      day = day === 0 ? 6 : day - 1;
      counts[day]++;
    });
    const max = Math.max(...counts, 5); 
    return counts.map(count => ({
      count,
      percentage: (count / max) * 100
    }));
  }, [attendanceLogs]);

  const avgEuclideanScore = useMemo(() => {
    if (attendanceLogs.length === 0) return 0;
    const sum = attendanceLogs.reduce((acc, log) => acc + log.confidence, 0);
    return sum / attendanceLogs.length;
  }, [attendanceLogs]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 font-sans lg:flex">
      <div className={`fixed inset-0 z-30 bg-slate-900/40 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setIsSidebarOpen(false)} />
      
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Live Log Absen</h1>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'overview' ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <LayoutDashboard className="w-5 h-5" /> Overview
          </button>
          <button onClick={() => setActiveTab('employees')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'employees' ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Users className="w-5 h-5" /> Data Karyawan
          </button>
          <button onClick={() => { setActiveTab('attendance'); fetchLogsAndStats(); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'attendance' ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <ClipboardList className="w-5 h-5" /> Riwayat Absensi
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <Link to="/kiosk" className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
            <Camera className="w-5 h-5" /> Buka Kiosk Scanner
          </Link>
          <Link to="/login" className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" /> Keluar
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-20 border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-10 bg-white z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'employees' && 'Manajemen Karyawan'}
              {activeTab === 'attendance' && 'Riwayat Absensi Karyawan'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm text-slate-900">Administrator</p>
              <p className="text-xs text-slate-500">Super Admin</p>
            </div>
            <div className="w-10 h-10 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-bold">
              AD
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10 z-10">
          
          {activeTab === 'overview' && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Total Karyawan</p>
                    <h3 className="text-2xl font-bold text-slate-900">{employees.length}</h3>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Activity className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Absensi Hari Ini</p>
                    <h3 className="text-2xl font-bold text-slate-900">{todayAttendance}</h3>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                  <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Database className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Total Log Sistem</p>
                    <h3 className="text-2xl font-bold text-slate-900">{attendanceLogs.length}</h3>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                  <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                    <Binary className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-1">Avg Euclidean Score</p>
                    <h3 className="text-2xl font-bold text-slate-900">{avgEuclideanScore.toFixed(4)}</h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Grafik Log Mingguan (Real-time)</h3>
                  <div className="flex items-end gap-4 h-56 border-b border-slate-100 pb-2 mt-4">
                    {weeklyStats.map((stat, i) => (
                      <div key={i} className="flex-1 bg-violet-100 rounded-t-lg relative group hover:bg-violet-500 transition-colors cursor-pointer" style={{ height: `${Math.max(stat.percentage, 2)}%` }}>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                          {stat.count} Log
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-xs font-semibold text-slate-400">
                    <span>Senin</span><span>Selasa</span><span>Rabu</span><span>Kamis</span><span>Jumat</span><span>Sabtu</span><span>Minggu</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-8 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Aktivitas Terbaru</h3>
                    <Terminal className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 space-y-5 overflow-hidden">
                    {attendanceLogs.slice(0, 5).map(log => (
                      <div key={log.id} className="flex flex-col gap-1 border-b border-slate-50 pb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-slate-800">{log.user?.firstName}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${log.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {log.type}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{safeFormatTime(log.timestamp)}</span>
                      </div>
                    ))}
                    {attendanceLogs.length === 0 && <p className="text-sm text-slate-500 text-center mt-4">Belum ada data absensi.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
                <div className="relative w-full sm:w-96">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Cari nama atau ID karyawan..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600 transition-all"
                  />
                </div>
                <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2">
                  <UserPlus className="w-5 h-5" /> Tambah Karyawan
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Karyawan</th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status Biometrik</th>
                      <th className="py-4 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-slate-500">Tidak ada data karyawan.</td></tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6 text-sm font-medium text-slate-600">{emp.employeeId}</td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{emp.firstName} {emp.lastName}</span>
                              <span className="text-xs text-slate-500">{emp.email}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Matriks 128-D Terkunci
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button 
                              onClick={() => setSelectedDossier(emp)}
                              className="px-4 py-2 text-sm font-semibold text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            >
                              Lihat Profil
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Riwayat Absensi</h3>
                  <p className="text-sm text-slate-500 mt-1">Data log absensi karyawan berbasis pencocokan Euclidean Distance.</p>
                </div>
                <button onClick={handleExportCSV} className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" /> Export Laporan (CSV)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu & Tanggal</th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Karyawan</th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipe</th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Keterlambatan</th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Euclidean Distance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceLogs.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-slate-500">Belum ada riwayat absensi.</td></tr>
                    ) : (
                      attendanceLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="block text-sm font-semibold text-slate-900">{safeFormatTime(log.timestamp)}</span>
                            <span className="block text-xs text-slate-500">{safeFormatDate(log.timestamp)}</span>
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-slate-700">
                            {log.user?.firstName} {log.user?.lastName} <span className="text-slate-400">({log.user?.employeeId})</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${log.type === 'IN' ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-600'}`}>
                              {log.type === 'IN' ? 'Masuk' : 'Pulang'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${log.attendanceStatus === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-violet-50 text-violet-700'}`}>
                              {log.attendanceStatus === 'LATE' ? `Terlambat ${log.lateMinutes ?? 0} menit` : 'Tepat Waktu'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-500 font-mono">
                            {log.confidence ? log.confidence.toFixed(5) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedDossier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Profil Karyawan</h3>
              <button onClick={() => setSelectedDossier(null)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
              <div className="w-full max-w-[12rem] h-48 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 self-center md:self-start">
                <img 
                  src={selectedDossier.snapshotUrl || `https://ui-avatars.com/api/?name=${selectedDossier.firstName}+${selectedDossier.lastName}&background=f1f5f9&color=7c3aed&size=256`}
                  alt="Foto Profil"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-2">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">ID Karyawan</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedDossier.employeeId}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Nama Lengkap</p>
                      <p className="text-base font-semibold text-slate-800">{selectedDossier.firstName} {selectedDossier.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tanggal Bergabung</p>
                      <p className="text-sm font-medium text-slate-600">{safeFormatDate(selectedDossier.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-end">
                  <button onClick={() => handleDeleteEmployee(selectedDossier.id)} className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Hapus Entitas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden relative">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Registrasi Karyawan Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitEmployee} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Lengkap</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600" placeholder="Contoh: Budi Santoso" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">ID Karyawan</label>
                  <input type="text" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600" placeholder="EMP-001" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Alamat Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600" placeholder="budi@perusahaan.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Ekstraksi Matriks Wajah</label>
                <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                  {snapshotUrl && <div className="absolute inset-0 z-10"><img src={snapshotUrl} className="w-full h-full object-cover" /></div>}
                  {faceDescriptor && <div className="absolute inset-0 z-20 bg-violet-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white"><CheckCircle2 className="w-10 h-10 mb-2" /> <span className="font-semibold text-sm">Vektor 128-D Tersimpan</span></div>}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-slate-500 font-medium">Status: <span className="text-violet-600">{scanStatus}</span></p>
                  <button type="button" onClick={handleCaptureFace} disabled={isScanning} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors">Eksekusi Pindai</button>
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-violet-200">Injeksi ke Database</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};