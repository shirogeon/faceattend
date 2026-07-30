import React from 'react';
import { Link } from 'react-router-dom';
import { ScanFace, Database, Cpu, LayoutDashboard, Camera, Binary } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-violet-200 overflow-x-hidden">
      
      <nav className="w-full absolute top-0 left-0 z-50 px-4 py-4 sm:px-6 sm:py-6 lg:px-12 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/20">
            <ScanFace className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Live Log Absen</span>
        </div>
        <div>
          <Link 
            to="/login" 
            className="px-6 py-2.5 text-sm font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-full transition-colors"
          >
            Masuk Admin
          </Link>
        </div>
      </nav>

      <main className="relative pt-28 pb-16 sm:pt-32 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10 sm:gap-16">
        
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-violet-400/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-blue-400/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="flex-1 text-center lg:text-left relative z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6 sm:mb-8">
            Sistem Presensi <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-600">Face Recognition</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Aplikasi absensi biometrik yang mengekstrak vektor wajah untuk validasi identitas. Memanfaatkan perhitungan Euclidean distance untuk mencocokkan matriks wajah secara real-time dan menyimpan log absensi langsung ke dalam database.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link 
              to="/kiosk" 
              className="w-full sm:w-auto px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-base font-semibold transition-all shadow-xl shadow-violet-600/20 flex items-center justify-center gap-2 group"
            >
              <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Buka Kiosk Scanner
            </Link>
            <Link 
              to="/dashboard" 
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-base font-semibold transition-all shadow-sm flex items-center justify-center gap-2 group"
            >
              <LayoutDashboard className="w-5 h-5 text-slate-400 group-hover:text-violet-600 transition-colors" />
              Panel Dashboard
            </Link>
          </div>
        </div>

        <div className="flex-1 w-full max-w-lg lg:max-w-none relative z-10">
          <div className="relative rounded-[2rem] bg-white border border-slate-100 shadow-2xl p-2">
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-[2rem]"></div>
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" 
              alt="Dashboard Preview" 
              className="w-full h-auto rounded-[1.5rem] object-cover border border-slate-100 shadow-inner"
            />
            
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <Binary className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">128-D Vector</p>
                <p className="text-xs text-slate-500">Pemetaan Matriks Wajah</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="bg-white border-t border-slate-100 py-16 sm:py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Spesifikasi Sistem</h2>
            <p className="text-slate-500">Arsitektur aplikasi yang dirancang khusus untuk efisiensi pemrosesan data biometrik.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-violet-200 transition-colors group">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Face Extraction & Matching</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Memindai topologi wajah pengguna, merubahnya menjadi array matriks, dan membandingkannya menggunakan algoritma pencocokan jarak dalam hitungan milidetik.
              </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-violet-200 transition-colors group">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Database className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Penyimpanan Vektor Numerik</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Sistem tidak menyimpan raw file gambar untuk validasi, melainkan menyimpan data Float32Array ke dalam tabel PostgreSQL, menjamin privasi dan keamanan data entitas.
              </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-violet-200 transition-colors group">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Manajemen Data Terpusat</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Dilengkapi dengan panel administrator untuk mengelola pendaftaran entitas baru, memantau log aktivitas server, serta mengekspor data absensi ke format CSV.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 py-12 border-t border-slate-800 text-center">
        <p className="text-slate-400 text-sm">
          &copy; 2026 Leon.
        </p>
      </footer>
    </div>
  );
};