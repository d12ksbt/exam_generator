import React, { useState } from 'react';
import { fetchUsersFromSpreadsheet, AppUser, SPREADSHEET_ID, SHEET_NAME } from '../services/auth';
import { Eye, EyeOff, Lock, User, LogIn, Loader2, AlertCircle, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';

interface LoginModalProps {
  onSuccess: (user: AppUser) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, currentUser, onLogout }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPrivateAlert, setIsPrivateAlert] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Mohon isi Username dan Password.');
      return;
    }

    setError(null);
    setIsPrivateAlert(false);
    setLoading(true);
    setStatusMessage('Menghubungkan ke Google Spreadsheet...');

    try {
      await new Promise(resolve => setTimeout(resolve, 600)); // Smooth loading animation
      setStatusMessage('Mengambil data pengguna dari sheet "Users"...');
      
      const { users, error: fetchErr, isPrivate } = await fetchUsersFromSpreadsheet();

      if (isPrivate) {
        setIsPrivateAlert(true);
        setError("Spreadsheet masih dikunci (Private). Silakan ubah akses spreadsheet menjadi 'Siapa saja yang memiliki link' (Viewer).");
        setLoading(false);
        return;
      }

      if (fetchErr) {
        setError(fetchErr);
        setLoading(false);
        return;
      }

      setStatusMessage('Memverifikasi kredensial akun...');
      await new Promise(resolve => setTimeout(resolve, 400));

      const foundUser = users.find(
        (u: any) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password.trim()
      );

      if (!foundUser) {
        setError('Username atau Password salah. Pastikan data cocok dengan sheet Users.');
        setLoading(false);
        return;
      }

      // Success
      const loggedInUser: AppUser = {
        username: foundUser.username,
        namaGuru: foundUser.namaGuru || foundUser.username,
        nip: foundUser.nip || '-'
      };

      localStorage.setItem('smk_exam_user', JSON.stringify(loggedInUser));
      onSuccess(loggedInUser);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses login.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleBypassDemo = () => {
    const demoUser: AppUser = {
      username: username || 'guru.demo',
      namaGuru: 'Guru Pengampu SMK',
      nip: '198501012010011001'
    };
    localStorage.setItem('smk_exam_user', JSON.stringify(demoUser));
    onSuccess(demoUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-scale-up">
        
        {/* Header dengan Gradient */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 py-6 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 opacity-50 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-white/15 rounded-2xl backdrop-blur-md mb-2 shadow-inner">
              <LogIn className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Login Portal Guru SMK</h2>
            <p className="text-xs text-indigo-100 mt-1">Autentikasi terintegrasi Google Spreadsheet</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 leading-relaxed">
                <p className="font-semibold">{error}</p>
                {isPrivateAlert && (
                  <div className="mt-2.5 pt-2 border-t border-red-200 space-y-1.5 text-[11px] text-gray-700">
                    <p className="font-medium text-red-800">Cara Membuka Akses Spreadsheet:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-gray-600">
                      <li>Buka Google Spreadsheet data Users Anda</li>
                      <li>Klik tombol <strong>Bagikan (Share)</strong> di pojok kanan atas</li>
                      <li>Di bagian Akses Umum, ubah dari <em>Dibatasi</em> menjadi <strong>Siapa saja yang memiliki link</strong> (Pelihat)</li>
                    </ol>
                    <div className="pt-1 flex gap-2">
                      <a 
                        href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-1 rounded border border-indigo-200 shadow-sm"
                      >
                        Buka Spreadsheet <ExternalLink className="h-3 w-3" />
                      </a>
                      <button 
                        type="button" 
                        onClick={handleBypassDemo}
                        className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 px-2 py-1 rounded"
                      >
                        Masuk Mode Uji Coba &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-600" /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username guru..."
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-indigo-600" /> Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:bg-gray-100"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 focus:outline-none transition-colors"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3 animate-pulse">
                <Loader2 className="h-5 w-5 text-indigo-600 animate-spin shrink-0" />
                <span className="text-xs font-medium text-indigo-700">{statusMessage}</span>
              </div>
            )}

            {/* Tombol Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memeriksa Akun...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Masuk ke Aplikasi</span>
                </>
              )}
            </button>
          </form>

          {/* Database Info footer */}
          <div className="pt-3 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Basis Data: Google Sheets (<span className="font-mono text-gray-600 font-semibold">{SHEET_NAME}</span>)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
