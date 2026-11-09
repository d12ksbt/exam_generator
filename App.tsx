
import React, { useState, useEffect, useRef } from 'react';
import { GRADES, MAJORS, SEMESTERS, ExamConfig, GeneratedExam } from './types';
import { generateExamQuestions } from './services/gemini';
import { downloadPDF, downloadDOCX, downloadKisiKisiPDF, downloadKisiKisiDOCX, cleanOptionText } from './services/exporter';
import { LoginModal } from './components/LoginModal';
import { AppUser } from './services/auth';
import { Trash2, Plus, Download, Loader2, BookOpen, GraduationCap, CheckCircle, AlertCircle, User, BookKey, Table as TableIcon, ListChecks, Info, Zap, UserCheck, ImagePlus, X, Building, Clock, Users, Calendar, MapPin, Signature, Layers, MessageSquareText, Eye, History, ArrowLeft, ChevronLeft, Save, ScrollText, LogOut, RotateCcw, Lock, KeyRound, Cpu } from 'lucide-react';

interface HistoryEntry {
  id: string;
  timestamp: string;
  data: GeneratedExam;
}

const loadSavedState = () => {
  try {
    const saved = localStorage.getItem('smk_exam_form_state');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const App: React.FC = () => {
  const savedState = loadSavedState();

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('smk_exam_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedExam | null>(null);
  const [activeTab, setActiveTab] = useState<'soal' | 'kisi'>('soal');
  const [quota, setQuota] = useState(50);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // Secret AI Model Settings State (Long-press on GraduationCap icon)
  const [customModel, setCustomModel] = useState<string>(() => {
    try {
      return localStorage.getItem('smk_exam_custom_model') || 'gemini-3.8-flash';
    } catch {
      return 'gemini-3.8-flash';
    }
  });
  const [showModelModal, setShowModelModal] = useState(false);
  const [modelUnlocked, setModelUnlocked] = useState(false);
  const [modelPasswordInput, setModelPasswordInput] = useState('');
  const [modelPasswordError, setModelPasswordError] = useState<string | null>(null);
  const [tempModelInput, setTempModelInput] = useState(customModel);
  const [isPressingCap, setIsPressingCap] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCapPressStart = () => {
    setIsPressingCap(true);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setIsPressingCap(false);
      setModelUnlocked(false);
      setModelPasswordInput('');
      setModelPasswordError(null);
      setTempModelInput(customModel);
      setShowModelModal(true);
    }, 800);
  };

  const handleCapPressEnd = () => {
    setIsPressingCap(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleUnlockModelCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (modelPasswordInput === 'Wul@nd4ri') {
      setModelUnlocked(true);
      setModelPasswordError(null);
    } else {
      setModelPasswordError('Password salah! Silakan coba lagi.');
    }
  };

  const handleSaveCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tempModelInput.trim() || 'gemini-3.8-flash';
    setCustomModel(cleaned);
    try {
      localStorage.setItem('smk_exam_custom_model', cleaned);
    } catch {}
    setShowModelModal(false);
  };

  // Form State
  const [schoolName, setSchoolName] = useState(savedState?.schoolName ?? 'SMK Negeri 1 Mondokan');
  const [grade, setGrade] = useState(savedState?.grade ?? GRADES[0]);
  const [major, setMajor] = useState(savedState?.major ?? MAJORS[0]);
  const [subject, setSubject] = useState(savedState?.subject ?? '');
  const [authors, setAuthors] = useState<string[]>(savedState?.authors ?? ['']);
  const [teacherNip, setTeacherNip] = useState(savedState?.teacherNip ?? '');
  const [semester, setSemester] = useState<'Gasal' | 'Genap'>(savedState?.semester ?? SEMESTERS[0]);
  const [academicYear, setAcademicYear] = useState(savedState?.academicYear ?? '2026/2027');
  const [assessmentType, setAssessmentType] = useState(savedState?.assessmentType ?? 'PENILAIAN SUMATIF AKHIR JENJANG');
  const [alokasiWaktu, setAlokasiWaktu] = useState(savedState?.alokasiWaktu ?? '120 menit');
  
  // STATE BARU: Elemen, CP & Topik
  const [elementCps, setElementCps] = useState<{elemen: string, cp: string, topik: string[]}[]>(
    savedState?.elementCps 
      ? savedState.elementCps.map((e: any) => ({ ...e, topik: Array.isArray(e.topik) ? e.topik : [e.topik || ''] }))
      : [{ elemen: '', cp: '', topik: savedState?.topics?.length > 0 ? savedState.topics : [''] }]
  );
  
  // Signature States
  const [kotaAsal, setKotaAsal] = useState(savedState?.kotaAsal ?? 'Sragen');
  const [tanggalDokumen, setTanggalDokumen] = useState(savedState?.tanggalDokumen ?? '20 Februari 2026');
  const [wksKurikulumName, setWksKurikulumName] = useState(savedState?.wksKurikulumName ?? 'ANTON BUDI RAHARJO, S.T.');
  const [wksKurikulumNip, setWksKurikulumNip] = useState(savedState?.wksKurikulumNip ?? '0000000000');
  const [koordinatorName, setKoordinatorName] = useState(savedState?.koordinatorName ?? 'DIDIK SUBROTO, S.Pd.');
  const [koordinatorNip, setKoordinatorNip] = useState(savedState?.koordinatorNip ?? '197406282009031003');
  const [koordinatorTitle, setKoordinatorTitle] = useState(savedState?.koordinatorTitle ?? 'Koordinator Mata Pelajaran Pendidikan Pancasila');
  const [kepalaSekolahJabatan, setKepalaSekolahJabatan] = useState(savedState?.kepalaSekolahJabatan ?? 'Kepala SMK Negeri 1 Mondokan');
  const [kepalaSekolahName, setKepalaSekolahName] = useState(savedState?.kepalaSekolahName ?? 'HINDUN KHOZANAH,S.Pd., M.Pd.');
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState(savedState?.kepalaSekolahNip ?? '198310122009032004');

  // Question Config
  const [includePg, setIncludePg] = useState(savedState?.includePg ?? true);
  const [includeEssay, setIncludeEssay] = useState(savedState?.includeEssay ?? true);
  const [pgCount, setPgCount] = useState(savedState?.pgCount ?? 40);
  const [pgHots, setPgHots] = useState(savedState?.pgHots ?? 10);
  const [pgLots, setPgLots] = useState(savedState?.pgLots ?? 30);
  const [essayCount, setEssayCount] = useState(savedState?.essayCount ?? 5);
  const [essayHots, setEssayHots] = useState(savedState?.essayHots ?? 3);
  const [essayLots, setEssayLots] = useState(savedState?.essayLots ?? 2);
  const [pgOptions, setPgOptions] = useState<4 | 5>(savedState?.pgOptions ?? 5);

  useEffect(() => { setPgLots(Math.max(0, pgCount - pgHots)); }, [pgCount, pgHots]);
  useEffect(() => { setEssayLots(Math.max(0, essayCount - essayHots)); }, [essayCount, essayHots]);

  // Save state to localStorage whenever form fields change
  useEffect(() => {
    const formState = {
      schoolName, grade, major, subject, authors, teacherNip, semester, academicYear, assessmentType, alokasiWaktu, elementCps, kotaAsal, tanggalDokumen, wksKurikulumName, wksKurikulumNip, koordinatorName, koordinatorNip, koordinatorTitle, kepalaSekolahJabatan, kepalaSekolahName, kepalaSekolahNip, includePg, includeEssay, pgCount, pgHots, pgLots, essayCount, essayHots, essayLots, pgOptions
    };
    localStorage.setItem('smk_exam_form_state', JSON.stringify(formState));
  }, [schoolName, grade, major, subject, authors, teacherNip, semester, academicYear, assessmentType, alokasiWaktu, elementCps, kotaAsal, tanggalDokumen, wksKurikulumName, wksKurikulumNip, koordinatorName, koordinatorNip, koordinatorTitle, kepalaSekolahJabatan, kepalaSekolahName, kepalaSekolahNip, includePg, includeEssay, pgCount, pgHots, pgLots, essayCount, essayHots, essayLots, pgOptions]);

  const [useImageVariation, setUseImageVariation] = useState(false);
  const [userImages, setUserImages] = useState<string[]>([]);
  const [imagePrompt, setImagePrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Quota and History on Mount
  useEffect(() => {
    try {
      // Quota
      const savedDate = localStorage.getItem('smk_exam_quota_date');
      const today = new Date().toDateString();
      if (savedDate !== today) {
        localStorage.setItem('smk_exam_quota_date', today);
        localStorage.setItem('smk_exam_quota_count', '50');
        setQuota(50);
      } else {
        const count = parseInt(localStorage.getItem('smk_exam_quota_count') || '50');
        setQuota(isNaN(count) ? 50 : count);
      }

      // History
      const savedHistory = localStorage.getItem('smk_exam_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) { 
      setQuota(50); 
    }
  }, []);

  const saveToHistory = (data: GeneratedExam) => {
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('id-ID'),
      data: data
    };
    const updatedHistory = [newEntry, ...history].slice(0, 15); // Simpan maks 15 riwayat
    setHistory(updatedHistory);
    localStorage.setItem('smk_exam_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('smk_exam_history', JSON.stringify(updatedHistory));
  };

  const updateQuota = () => {
    const newQuota = Math.max(0, quota - 1);
    setQuota(newQuota);
    try { localStorage.setItem('smk_exam_quota_count', newQuota.toString()); } catch (e) {}
  };

  const handleAuthorChange = (index: number, value: string) => {
    const newAuthors = [...authors];
    newAuthors[index] = value;
    setAuthors(newAuthors);
  };

  // HANDLER BARU: Elemen, CP, Topik
  const handleElementCpChange = (index: number, field: 'elemen' | 'cp', value: string) => {
    const newElementCps = [...elementCps];
    newElementCps[index] = { ...newElementCps[index], [field]: value };
    setElementCps(newElementCps);
  };

  const handleTopicChange = (elementIndex: number, topicIndex: number, value: string) => {
    const newElementCps = [...elementCps];
    newElementCps[elementIndex].topik[topicIndex] = value;
    setElementCps(newElementCps);
  };

  const addTopicToElement = (elementIndex: number) => {
    const newElementCps = [...elementCps];
    newElementCps[elementIndex].topik.push('');
    setElementCps(newElementCps);
  };

  const removeTopicFromElement = (elementIndex: number, topicIndex: number) => {
    const newElementCps = [...elementCps];
    newElementCps[elementIndex].topik.splice(topicIndex, 1);
    setElementCps(newElementCps);
  };

  const addElementCp = () => {
    setElementCps([...elementCps, { elemen: '', cp: '', topik: [''] }]);
  };

  const removeElementCp = (index: number) => {
    if (elementCps.length > 1) {
      setElementCps(elementCps.filter((_, i) => i !== index));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => { setUserImages(prev => [...prev, reader.result as string]); };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setUserImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    // Auto-fill Penyusun 1 dan NIP jika kosong atau belum diubah
    setAuthors(prev => {
      const next = [...prev];
      if (!next[0] || next[0].trim() === '') {
        next[0] = user.namaGuru;
      }
      return next;
    });
    if (user.nip && user.nip !== '-') {
      setTeacherNip(prev => (!prev || prev.trim() === '' ? user.nip : prev));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smk_exam_user');
    setCurrentUser(null);
  };

  const handleClearFormState = () => {
    localStorage.removeItem('smk_exam_form_state');
    setSchoolName('SMK Negeri 1 Mondokan');
    setGrade(GRADES[0]);
    setMajor(MAJORS[0]);
    setSubject('');
    setAuthors([currentUser?.namaGuru || '']);
    setTeacherNip(currentUser?.nip && currentUser.nip !== '-' ? currentUser.nip : '');
    setSemester(SEMESTERS[0]);
    setAcademicYear('2026/2027');
    setAssessmentType('PENILAIAN SUMATIF AKHIR JENJANG');
    setAlokasiWaktu('120 menit');
    setElementCps([{ elemen: '', cp: '', topik: [''] }]);
    setIncludePg(true);
    setIncludeEssay(true);
    setPgCount(40);
    setPgHots(10);
    setPgLots(30);
    setEssayCount(5);
    setEssayHots(3);
    setEssayLots(2);
    setPgOptions(5);
    setShowClearModal(false);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('smk_exam_history');
    setHistory([]);
    setShowClearModal(false);
  };

  const handleClearAllStorage = () => {
    localStorage.clear();
    setCurrentUser(null);
    setResult(null);
    setHistory([]);
    setShowClearModal(false);
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (quota <= 0) { setError("Kuota harian habis."); return; }
    if (!subject.trim() || authors[0].trim() === '') { setError("Mata Pelajaran dan Penyusun 1 wajib diisi."); return; }
    // Validasi Elemen, CP & Topik
    if (elementCps.some(e => !e.elemen.trim() || !e.cp.trim() || e.topik.some(t => !t.trim()))) {
      setError("Mohon lengkapi semua kolom Elemen, Capaian Pembelajaran, dan Materi Pokok.");
      return;
    }
    if (!includePg && !includeEssay) { setError("Pilih setidaknya satu jenis soal (PG atau Uraian)."); return; }

    setLoading(true);
    setProgressText("Memulai generate dengan Gemini AI...");
    
    try {
      const generatedData = await generateExamQuestions({
        schoolName: schoolName.trim() === "" ? " " : schoolName,
        grade, major, subject, 
        authors: authors.filter(a => a.trim() !== ''), 
        teacherNip, 
        semester, academicYear, assessmentType, alokasiWaktu,
        elementCps: elementCps, // Kirim Data CP dan Topik
        includePg, includeEssay, pgCount, pgLots, pgHots, pgOptions,
        essayCount, essayLots, essayHots,
        userImages: useImageVariation ? userImages : undefined,
        imageQuantity: useImageVariation ? userImages.length : 0,
        imagePrompt: useImageVariation ? imagePrompt : '',
        kotaAsal, tanggalDokumen, wksKurikulumName, wksKurikulumNip,
        koordinatorName, koordinatorNip, koordinatorTitle,
        kepalaSekolahJabatan, kepalaSekolahName, kepalaSekolahNip,
        customModel
      });
      setResult(generatedData);
      saveToHistory(generatedData);
      setActiveTab('soal');
      setLoading(false);
      updateQuota();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Gagal membuat soal.");
    }
  };

  const inputClass = "block w-full rounded border-gray-300 bg-white text-gray-900 border p-2 text-sm focus:ring-indigo-500 shadow-sm";
  const labelClass = "block text-xs font-bold text-gray-800 mb-1";

  // Login Gate: Harap login terlebih dahulu
  if (!currentUser) {
    return (
      <LoginModal 
        onSuccess={handleLoginSuccess} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl border border-indigo-100 text-center space-y-6 animate-scale-up">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping opacity-25"></div>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
            <div className="absolute inset-3 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shadow-inner">
              <GraduationCap className="h-8 w-8 animate-bounce" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-800 tracking-tight">AI Sedang Menyusun Soal</h3>
            <p className="text-xs text-indigo-600 font-semibold animate-pulse">{progressText}</p>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full animate-indeterminate"></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500 pt-3 border-t border-gray-100">
            <div className="flex flex-col items-center gap-1 font-medium text-indigo-700">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              Elemen & CP
            </div>
            <div className="flex flex-col items-center gap-1 font-medium text-purple-700">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
              PG & Uraian
            </div>
            <div className="flex flex-col items-center gap-1 font-medium text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Kisi-Kisi BSKAP
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-100 py-4 px-2">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-between items-center mb-4 bg-white p-3 rounded shadow-sm gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setResult(null)}
                className="p-2 rounded-lg border border-gray-300 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-400 text-gray-700 hover:text-indigo-700 transition-colors flex items-center justify-center cursor-pointer shadow-xs"
                title="Kembali"
                aria-label="Kembali"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-green-700">Hasil Berhasil</h1>
                {currentUser && (
                  <p className="text-xs text-gray-500">Penyusun: <span className="font-semibold text-gray-800">{currentUser.namaGuru}</span> {currentUser.nip !== '-' ? `(NIP. ${currentUser.nip})` : ''}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('soal')} className={`px-4 py-1.5 rounded text-sm font-bold border cursor-pointer ${activeTab === 'soal' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>Soal</button>
                <button onClick={() => setActiveTab('kisi')} className={`px-4 py-1.5 rounded text-sm font-bold border cursor-pointer ${activeTab === 'kisi' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>Kisi-kisi</button>
                <button onClick={() => setResult(null)} className="px-4 py-1.5 rounded text-sm font-bold text-red-600 border border-red-200 cursor-pointer">Ulangi</button>
            </div>
          </div>

          <div className="bg-white rounded shadow-sm p-8 overflow-hidden">
            {activeTab === 'kisi' ? (
              <div className="kisi-kisi-preview font-serif text-[#111]">
                <div className="text-center mb-8">
                  <h2 className="text-base font-bold uppercase tracking-wider">KISI-KISI PENULISAN SOAL</h2>
                  <h2 className="text-base font-bold uppercase tracking-wider">{result.metadata.assessmentType}</h2>
                  <h2 className="text-base font-bold uppercase tracking-wider">TAHUN PELAJARAN {result.metadata.academicYear}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[12px] mb-6 leading-relaxed">
                  <div className="space-y-1">
                    <div className="flex"><span className="w-32">Sekolah</span><span className="mr-2">:</span><span>{result.metadata.schoolName}</span></div>
                    <div className="flex"><span className="w-32">Mata Pelajaran</span><span className="mr-2">:</span><span>{result.metadata.subject}</span></div>
                    <div className="flex"><span className="w-32">Kelas/Semester</span><span className="mr-2">:</span><span>{result.metadata.grade} / {result.metadata.semester}</span></div>
                    <div className="flex"><span className="w-32">Alokasi Waktu</span><span className="mr-2">:</span><span>{result.metadata.alokasiWaktu}</span></div>
                    <div className="flex">
                      <span className="w-32">Jumlah Soal</span>
                      <div className="flex flex-col">
                        <div className="flex"><span className="mr-2">:</span><span>- Pilihan Ganda : {result.metadata.includePg ? result.metadata.pgCount : 0} Soal</span></div>
                        <div className="flex ml-[6px]"><span className="mr-2">-</span><span>Uraian : {result.metadata.includeEssay ? result.metadata.essayCount : 0} Soal</span></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex">
                      <span className="w-32">Penyusun Soal</span>
                      <div className="flex flex-col">
                        {result.metadata.authors.map((author, idx) => (
                           <div key={idx} className="flex"><span className="mr-2">{idx === 0 ? ':' : ' '}</span><span>{idx + 1}. {author}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-black mb-10">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-black font-bold uppercase">
                        <th className="p-2 border-r border-black text-center w-[40px]">No.</th>
                        <th className="p-2 border-r border-black text-center w-[15%]">Elemen</th>
                        <th className="p-2 border-r border-black text-center">Capaian Pembelajaran</th>
                        <th className="p-2 border-r border-black text-center w-[15%]">Materi Pokok</th>
                        <th className="p-2 border-r border-black text-center w-[20%]">Indikator Soal</th>
                        <th className="p-2 border-r border-black text-center w-[60px]">Level</th>
                        <th className="p-2 border-r border-black text-center w-[80px]">Bentuk</th>
                        <th className="p-2 text-center w-[60px]">No Soal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.kisiKisi.map((item, i) => (
                        <tr key={i} className="border-b border-black last:border-0">
                          <td className="p-2 border-r border-black text-center align-top">{i + 1}</td>
                          <td className="p-2 border-r border-black align-top">{item.elemen}</td>
                          <td className="p-2 border-r border-black align-top italic">{item.capaianPembelajaran}</td>
                          <td className="p-2 border-r border-black align-top">{item.materiPokok}</td>
                          <td className="p-2 border-r border-black align-top">{item.indikatorSoal}</td>
                          <td className="p-2 border-r border-black text-center align-top font-bold">{item.levelKognitif}</td>
                          <td className="p-2 border-r border-black text-center align-top">{item.bentukSoal}</td>
                          <td className="p-2 text-center align-top font-bold">{item.nomorSoal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* TANDA TANGAN (SESUAI GAMBAR REFERENSI & A4 LANDSCAPE) */}
                <div className="grid grid-cols-2 text-[12px] mb-12">
                  <div className="flex flex-col">
                    <p className="mb-1">Wks. Kurikulum</p>
                    <div className="h-20"></div>
                    <div>
                      <p className="font-bold underline uppercase">{result.metadata.wksKurikulumName}</p>
                      <p>NIP. {result.metadata.wksKurikulumNip}</p>
                    </div>
                  </div>
                  <div className="flex flex-col text-right">
                    <p className="mb-0">{result.metadata.kotaAsal}, {result.metadata.tanggalDokumen}</p>
                    <p className="mb-1">{result.metadata.koordinatorTitle}</p>
                    <div className="h-16"></div>
                    <div>
                      <p className="font-bold underline uppercase">{result.metadata.koordinatorName}</p>
                      <p>NIP. {result.metadata.koordinatorNip}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center text-center text-[12px]">
                   <div className="flex flex-col">
                    <div className="mb-1">
                      <p>Mengetahui,</p>
                      <p>{result.metadata.kepalaSekolahJabatan}</p>
                    </div>
                    <div className="h-20"></div>
                    <div>
                      <p className="font-bold underline uppercase">{result.metadata.kepalaSekolahName}</p>
                      <p>NIP. {result.metadata.kepalaSekolahNip}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-12 no-print">
                  <button onClick={() => downloadKisiKisiPDF(result)} className="bg-indigo-600 text-white px-5 py-2.5 rounded text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow"><Download className="h-4 w-4" /> Download PDF</button>
                  <button onClick={() => downloadKisiKisiDOCX(result)} className="bg-blue-600 text-white px-5 py-2.5 rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow"><Download className="h-4 w-4" /> Download Word</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 border p-4 mb-6 rounded text-center">
                    <h2 className="text-lg font-bold uppercase">{result.metadata.assessmentType}</h2>
                    <p className="text-md font-bold">{result.metadata.schoolName}</p>
                    <p className="text-sm">Mapel: {result.metadata.subject} | {result.metadata.grade} {result.metadata.major}</p>
                    <p className="text-xs italic mt-1 text-gray-500">Semester {result.metadata.semester} TA {result.metadata.academicYear}</p>
                </div>

                <div className="space-y-8 text-sm font-serif">
                    {result.metadata.includePg && result.pgQuestions.length > 0 && (
                        <div>
                            <h3 className="font-bold text-base border-b mb-4 pb-1">A. PILIHAN GANDA</h3>
                            <div className="space-y-6">
                                {result.pgQuestions.map((q, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex gap-2">
                                            <span className="font-bold">{idx + 1}.</span>
                                            <div>
                                                <p className="leading-relaxed">{q.question}</p>
                                                {q.imageUrl && <img src={q.imageUrl} alt="" className="max-w-xs my-2 rounded border" />}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 ml-6">
                                            {q.options.map((opt, optIdx) => (
                                                <div key={optIdx} className="flex gap-2">
                                                    <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                                    <span>{cleanOptionText(opt)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.metadata.includeEssay && result.essayQuestions.length > 0 && (
                        <div>
                            <h3 className="font-bold text-base border-b mb-4 pb-1">B. URAIAN</h3>
                            <div className="space-y-6">
                                {result.essayQuestions.map((q, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex gap-2">
                                            <span className="font-bold">{idx + 1}.</span>
                                            <div>
                                                <p className="leading-relaxed">{q.question}</p>
                                                {q.imageUrl && <img src={q.imageUrl} alt="" className="max-w-xs my-2 rounded border" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-12 pt-8 border-t bg-gray-50 p-6 rounded-lg font-serif">
                   <h2 className="text-center font-bold text-xl mb-6 underline">KUNCI JAWABAN</h2>
                   {result.metadata.includePg && (
                     <div className="mb-6">
                        <h3 className="font-bold mb-3">I. Pilihan Ganda:</h3>
                        <div className="space-y-2">
                           {Array.from({ length: Math.ceil(result.pgQuestions.length / 10) }).map((_, rIdx) => (
                             <div key={rIdx} className="flex flex-wrap gap-x-4">
                                {result.pgQuestions.slice(rIdx * 10, (rIdx * 10) + 10).map((q, iIdx) => (
                                  <span key={iIdx} className="text-sm font-medium">
                                    {(rIdx * 10) + iIdx + 1}.{q.answerKey}
                                  </span>
                                ))}
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                   {result.metadata.includeEssay && (
                     <div>
                        <h3 className="font-bold mb-3">II. Uraian:</h3>
                        <div className="space-y-4">
                           {result.essayQuestions.map((q, idx) => (
                             <div key={idx}>
                                <p className="font-bold text-sm">Uraian {idx + 1}:</p>
                                <p className="text-sm italic">{q.answerKey}</p>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>

                <div className="flex flex-wrap justify-center gap-4 mt-12 py-6 border-t no-print">
                   <div className="flex gap-2">
                      <button onClick={() => downloadPDF(result, false)} className="bg-gray-700 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-1"><Download className="h-3 w-3" /> PDF Siswa</button>
                      <button onClick={() => downloadPDF(result, true)} className="bg-amber-600 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-1"><Download className="h-3 w-3" /> PDF Guru (Kunci)</button>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => downloadDOCX(result, false)} className="bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-1"><Download className="h-3 w-3" /> Word Siswa</button>
                      <button onClick={() => downloadDOCX(result, true)} className="bg-indigo-800 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-1"><Download className="h-3 w-3" /> Word Guru (Kunci)</button>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-2 flex flex-col items-center">
      {/* HEADER BAR */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden relative">
        <div className="bg-indigo-800 p-4 text-white flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2 select-none">
                <span
                  onMouseDown={handleCapPressStart}
                  onMouseUp={handleCapPressEnd}
                  onMouseLeave={handleCapPressEnd}
                  onTouchStart={handleCapPressStart}
                  onTouchEnd={handleCapPressEnd}
                  onTouchCancel={handleCapPressEnd}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`inline-flex items-center justify-center p-1 rounded-lg transition-transform cursor-pointer select-none ${isPressingCap ? 'scale-90 bg-indigo-700/80 ring-2 ring-amber-300/70' : 'hover:bg-indigo-700/50'}`}
                  title="Exam Generator"
                >
                  <GraduationCap className="h-6 w-6" />
                </span>
                <span>Exam Generator</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs opacity-90">
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Kuota: {quota}</span>
                <span>|</span>
                <span>Riwayat: {history.length}</span>
                {currentUser && (
                  <>
                    <span>|</span>
                    <span className="bg-indigo-950/70 border border-indigo-600/50 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                      <User className="h-3 w-3" /> {currentUser.namaGuru}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setShowClearModal(true)}
                className="p-2 bg-indigo-700/80 hover:bg-amber-600 rounded-full text-white transition-colors cursor-pointer"
                title="Kelola & Bersihkan Penyimpanan Lokal"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 bg-indigo-700 rounded-full hover:bg-indigo-600 transition-colors cursor-pointer"
                title="Lihat Riwayat"
              >
                <History className="h-5 w-5" />
              </button>
              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Keluar dari akun"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              )}
            </div>
        </div>

        {/* DRAWER RIWAYAT */}
        {showHistory && (
          <div className="absolute top-[72px] left-0 w-full h-[calc(100%-72px)] bg-white z-20 overflow-y-auto border-t">
            <div className="p-4 flex justify-between items-center border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-sm flex items-center gap-2"><History className="h-4 w-4" /> Riwayat Generate ({history.length})</h3>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button 
                    onClick={handleClearHistory}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Hapus Semua
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="divide-y">
              {history.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Belum ada riwayat generate.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => { setResult(item.data); setShowHistory(false); }}
                    className="p-4 hover:bg-indigo-50 cursor-pointer flex justify-between items-start transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-sm text-indigo-900">{item.data.metadata.subject}</p>
                      <p className="text-[10px] text-gray-500 mb-1">{item.timestamp}</p>
                      <div className="flex gap-2 text-[10px]">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{item.data.metadata.grade}</span>
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{item.data.pgQuestions.length} PG</span>
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{item.data.essayQuestions.length} Uraian</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="p-1 text-red-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nama Sekolah</label>
                <div className="relative">
                  <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className={`${inputClass} pl-8`} />
                  <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Mata Pelajaran</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Contoh: Dasar-dasar TJKT" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                    <label className={labelClass}>Jenis Asesmen</label>
                    <input type="text" value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Semester</label>
                    <select value={semester} onChange={(e) => setSemester(e.target.value as any)} className={inputClass}>
                      <option value="Gasal">Gasal</option>
                      <option value="Genap">Genap</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Tahun Pelajaran</label>
                    <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={inputClass} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className={labelClass}>Alokasi Waktu</label>
                    <div className="relative">
                      <input type="text" value={alokasiWaktu} onChange={(e) => setAlokasiWaktu(e.target.value)} className={`${inputClass} pl-8`} />
                      <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Kelas</label>
                    <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass}>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                  <label className={labelClass}>Jurusan</label>
                  <select value={major} onChange={(e) => setMajor(e.target.value)} className={inputClass}>
                      {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded border border-indigo-100">
              <label className="block text-xs font-bold text-indigo-700 mb-3 flex items-center gap-2 uppercase tracking-wider"><Users className="h-3 w-3" /> Daftar Penyusun Soal</label>
              <div className="space-y-2">
                {authors.map((author, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-[10px] font-bold text-gray-400 w-4">{index + 1}.</span>
                    <input type="text" value={author} onChange={(e) => handleAuthorChange(index, e.target.value)} placeholder={`Nama Penyusun ${index + 1}...`} className={inputClass} />
                    {authors.length > 1 && <button type="button" onClick={() => setAuthors(authors.filter((_, i) => i !== index))} className="text-red-500 p-1"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                ))}
                <button type="button" onClick={() => setAuthors([...authors, ''])} className="text-[10px] font-bold text-indigo-700 uppercase flex items-center gap-1 mt-1"><Plus className="h-3 w-3" /> Tambah Penyusun</button>
              </div>
              <div className="mt-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase">NIP (Hanya untuk Penyusun Utama)</label>
                <input type="text" value={teacherNip} onChange={(e) => setTeacherNip(e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* SECTION BARU: ELEMEN & CP */}
            <div className="bg-green-50/50 p-4 rounded border border-green-100">
               <label className="block text-xs font-bold text-green-700 mb-3 flex items-center gap-2 uppercase tracking-wider">
                 <ScrollText className="h-3 w-3" /> Elemen, Capaian Pembelajaran & Topik Pokok
               </label>
               <div className="space-y-4">
                 {elementCps.map((item, index) => (
                   <div key={index} className="p-3 bg-white rounded border border-green-100 relative shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Data {index + 1}</span>
                         {elementCps.length > 1 && (
                           <button type="button" onClick={() => removeElementCp(index)} className="text-red-400 hover:text-red-600">
                             <Trash2 className="h-4 w-4" />
                           </button>
                         )}
                      </div>
                      <div className="space-y-2">
                         <div>
                            <label className="text-[10px] font-bold text-gray-500">Elemen</label>
                            <input 
                              type="text" 
                              value={item.elemen} 
                              onChange={(e) => handleElementCpChange(index, 'elemen', e.target.value)}
                              placeholder="Contoh: Proses Bisnis Menyeluruh..."
                              className={inputClass} 
                            />
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-gray-500">Capaian Pembelajaran (CP) Lengkap</label>
                            <textarea 
                              value={item.cp} 
                              onChange={(e) => handleElementCpChange(index, 'cp', e.target.value)}
                              placeholder="Tempel (Paste) teks CP lengkap dari SK BSKAP di sini..."
                              className={`${inputClass} min-h-[80px]`}
                            />
                         </div>
                         <div>
                            <label className="text-[10px] font-bold text-gray-500 mb-1 block">Materi / Topik Pokok</label>
                            <div className="space-y-2">
                                {item.topik.map((t, tIndex) => (
                                    <div key={tIndex} className="flex gap-2">
                                        <input 
                                          type="text" 
                                          value={t} 
                                          onChange={(e) => handleTopicChange(index, tIndex, e.target.value)}
                                          placeholder={`Materi Pokok ${tIndex + 1}`}
                                          className={inputClass} 
                                        />
                                        {item.topik.length > 1 && (
                                          <button type="button" onClick={() => removeTopicFromElement(index, tIndex)} className="text-red-400 hover:text-red-600 p-2 rounded shrink-0">
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => addTopicToElement(index)} className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1 mt-1 hover:bg-indigo-50 px-2 py-1 rounded transition-colors w-max">
                                  <Plus className="h-3 w-3" /> Tambah Topik Pokok
                                </button>
                            </div>
                         </div>
                      </div>
                   </div>
                 ))}
                 <button type="button" onClick={addElementCp} className="text-[10px] font-bold text-green-700 uppercase flex items-center gap-1 mt-1 hover:bg-green-100 px-3 py-1.5 rounded transition-colors w-full justify-center border border-green-200 border-dashed">
                   <Plus className="h-3 w-3" /> Tambah Elemen, CP & Topik Lainnya
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-3 bg-gray-50 rounded border transition-all ${includePg ? 'border-indigo-300 ring-1 ring-indigo-100' : 'opacity-50 border-gray-200'}`}>
                    <label className="flex items-center gap-2 font-bold text-xs mb-3 cursor-pointer">
                        <input type="checkbox" checked={includePg} onChange={(e) => setIncludePg(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" /> Pilihan Ganda (PG)
                    </label>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Jumlah Soal</span> <span>{pgCount}</span></div>
                        <input type="range" min="1" max="50" value={pgCount} onChange={(e) => setPgCount(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" disabled={!includePg} />
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-[9px] font-bold text-gray-500 uppercase">HOTS</label><input type="number" value={pgHots} min="0" max={pgCount} onChange={(e) => setPgHots(Math.min(pgCount, parseInt(e.target.value) || 0))} className={inputClass} disabled={!includePg} /></div>
                            <div><label className="text-[9px] font-bold text-gray-500 uppercase">LOTS</label><input type="number" value={pgLots} readOnly className={`${inputClass} bg-gray-100`} disabled={!includePg} /></div>
                        </div>
                    </div>
                </div>
                <div className={`p-3 bg-gray-50 rounded border transition-all ${includeEssay ? 'border-purple-300 ring-1 ring-purple-100' : 'opacity-50 border-gray-200'}`}>
                    <label className="flex items-center gap-2 font-bold text-xs mb-3 cursor-pointer">
                        <input type="checkbox" checked={includeEssay} onChange={(e) => setIncludeEssay(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500" /> Uraian / Essay
                    </label>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Jumlah Soal</span> <span>{essayCount}</span></div>
                        <input type="range" min="1" max="10" value={essayCount} onChange={(e) => setEssayCount(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" disabled={!includeEssay} />
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-[9px] font-bold text-gray-500 uppercase">HOTS</label><input type="number" value={essayHots} min="0" max={essayCount} onChange={(e) => setEssayHots(Math.min(essayCount, parseInt(e.target.value) || 0))} className={inputClass} disabled={!includeEssay} /></div>
                            <div><label className="text-[9px] font-bold text-gray-500 uppercase">LOTS</label><input type="number" value={essayLots} readOnly className={`${inputClass} bg-gray-100`} disabled={!includeEssay} /></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3 bg-amber-50 rounded border border-amber-200">
                <label className="flex items-center gap-2 font-bold text-[11px] mb-2 cursor-pointer text-amber-800 uppercase tracking-wide">
                    <input type="checkbox" checked={useImageVariation} onChange={(e) => setUseImageVariation(e.target.checked)} className="rounded" />
                    <ImagePlus className="h-3.5 w-3.5" /> Sisipkan Gambar (Multimodal)
                </label>
                {useImageVariation && (
                  <div className="space-y-4 mt-2">
                    <p className="text-[10px] text-amber-700 italic">Unggah gambar untuk dianalisis oleh AI.</p>
                    <div className="bg-white p-3 rounded border border-amber-100 shadow-inner">
                      <label className="text-[10px] font-bold text-amber-600 uppercase mb-1 flex items-center gap-1">
                        <MessageSquareText className="h-3 w-3" /> Instruksi Gambar
                      </label>
                      <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Contoh: Buat soal berdasarkan gambar." className="w-full border-0 focus:ring-0 text-sm p-0 min-h-[60px] resize-none text-gray-800" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {userImages.map((img, idx) => (
                        <div key={idx} className="relative h-14 w-14 group">
                          <img src={img} className="h-full w-full object-cover rounded border border-amber-300" />
                          <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="h-14 w-14 border-2 border-dashed border-amber-300 rounded text-amber-500 flex items-center justify-center">
                        <Plus className="h-5 w-5" />
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
                    </div>
                  </div>
                )}
            </div>

            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <label className="block text-xs font-bold text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wider"><Signature className="h-3 w-3" /> Identitas Penandatangan</label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="relative">
                   <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                   <input type="text" value={kotaAsal} onChange={(e) => setKotaAsal(e.target.value)} placeholder="Kota" className={`${inputClass} pl-8`} />
                </div>
                <div className="relative">
                   <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                   <input type="text" value={tanggalDokumen} onChange={(e) => setTanggalDokumen(e.target.value)} placeholder="Tanggal" className={`${inputClass} pl-8`} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-2 bg-white rounded border border-gray-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Wks. Kurikulum</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input type="text" value={wksKurikulumName} onChange={(e) => setWksKurikulumName(e.target.value)} placeholder="Nama" className={inputClass} />
                    <input type="text" value={wksKurikulumNip} onChange={(e) => setWksKurikulumNip(e.target.value)} placeholder="NIP" className={inputClass} />
                  </div>
                </div>
                <div className="p-2 bg-white rounded border border-gray-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Koordinator Mata Pelajaran</span>
                  <input type="text" value={koordinatorTitle} onChange={(e) => setKoordinatorTitle(e.target.value)} placeholder="Jabatan" className={`${inputClass} mb-2`} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input type="text" value={koordinatorName} onChange={(e) => setKoordinatorName(e.target.value)} placeholder="Nama" className={inputClass} />
                    <input type="text" value={koordinatorNip} onChange={(e) => setKoordinatorNip(e.target.value)} placeholder="NIP" className={inputClass} />
                  </div>
                </div>
                <div className="p-2 bg-white rounded border border-gray-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Kepala Sekolah</span>
                  <input type="text" value={kepalaSekolahJabatan} onChange={(e) => setKepalaSekolahJabatan(e.target.value)} placeholder="Jabatan" className={`${inputClass} mb-2`} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input type="text" value={kepalaSekolahName} onChange={(e) => setKepalaSekolahName(e.target.value)} placeholder="Nama" className={inputClass} />
                    <input type="text" value={kepalaSekolahNip} onChange={(e) => setKepalaSekolahNip(e.target.value)} placeholder="NIP" className={inputClass} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setShowClearModal(true)}
                className="px-4 py-3.5 bg-gray-100 hover:bg-amber-50 text-gray-700 hover:text-amber-800 border border-gray-300 hover:border-amber-300 font-bold rounded text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                title="Kelola & Bersihkan Penyimpanan Lokal"
              >
                <RotateCcw className="h-4 w-4" /> Reset Form
              </button>
              <button type="submit" disabled={loading || quota <= 0} className="flex-1 bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-3.5 rounded shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer">
                  <BookOpen className="h-5 w-5" /> {loading ? 'Sabar, AI Sedang Menyusun...' : 'Generate'}
              </button>
            </div>
        </form>
      </div>

      {/* MODAL KELOLA & BERSIHKAN PENYIMPANAN LOKAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-slate-800 to-indigo-900 px-6 py-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <RotateCcw className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Kelola Penyimpanan Lokal</h3>
                  <p className="text-[11px] text-gray-300">Pembersihan memori browser (LocalStorage)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowClearModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Draf Formulir Soal:</span>
                  <span className="font-semibold text-emerald-600">Tersimpan otomatis</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Arsip Riwayat Soal:</span>
                  <span className="font-semibold text-indigo-600">{history.length} paket soal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Akun Aktif:</span>
                  <span className="font-semibold text-gray-800">{currentUser?.namaGuru || '-'}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleClearFormState}
                  className="w-full p-3.5 text-left rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <RotateCcw className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 group-hover:rotate-[-45deg] transition-transform" />
                  <div>
                    <p className="font-bold text-xs text-amber-900">Bersihkan Draf Isian Formulir</p>
                    <p className="text-[11px] text-amber-700/90 mt-0.5">Mengosongkan form (Mata Pelajaran, Elemen & CP) kembali ke setelan awal tanpa menghapus riwayat atau akun.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="w-full p-3.5 text-left rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <Trash2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-indigo-900">Hapus Seluruh Riwayat Soal</p>
                    <p className="text-[11px] text-indigo-700/90 mt-0.5">Mengosongkan seluruh arsip paket soal ({history.length} paket) yang tersimpan di memori browser.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllStorage}
                  className="w-full p-3.5 text-left rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <Trash2 className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-rose-900">Reset Total Semua Penyimpanan (Factory Reset)</p>
                    <p className="text-[11px] text-rose-700/90 mt-0.5">Menghapus draf form, riwayat, kuota, serta sesi login, lalu me-refresh aplikasi seperti baru.</p>
                  </div>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal / Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGATURAN MODEL AI (LONG PRESS IKON TOPI) */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-indigo-900 via-slate-800 to-indigo-950 px-6 py-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  {modelUnlocked ? (
                    <Cpu className="h-5 w-5 text-emerald-300" />
                  ) : (
                    <Lock className="h-5 w-5 text-amber-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {modelUnlocked ? 'Pengaturan Model AI' : 'Akses Pengaturan Model AI'}
                  </h3>
                  <p className="text-[11px] text-gray-300">
                    {modelUnlocked ? 'Konfigurasi model Gemini AI aktif' : 'Masukkan password administrator untuk membuka'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModelModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!modelUnlocked ? (
              <form onSubmit={handleUnlockModelCard} className="p-6 space-y-4">
                {modelPasswordError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{modelPasswordError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Password Keamanan</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="password"
                      value={modelPasswordInput}
                      onChange={(e) => setModelPasswordInput(e.target.value)}
                      placeholder="Masukkan password..."
                      autoFocus
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModelModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    Buka Kartu
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveCustomModel} className="p-6 space-y-4">
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Model Aktif Saat Ini: <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">{customModel}</span>
                  </p>
                  <p className="text-[11px] text-indigo-700 mt-1">
                    Anda dapat memilih daftar model di bawah atau mengetikkan langsung nama model Gemini terbaru jika suatu saat ada pembaruan dari Google.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Pilih Cepat Model Rekomendasi</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash (Rekomendasi Utama)' },
                      { id: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (Cepat & Ringan)' },
                      { id: 'gemini-flash-latest', label: 'gemini-flash-latest (Otomatis Versi Terbaru)' },
                      { id: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview (Penalaran Lanjut)' },
                      { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setTempModelInput(m.id)}
                        className={`text-left px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                          tempModelInput === m.id
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                            : 'bg-gray-50 hover:bg-indigo-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        <span className="font-mono">{m.label}</span>
                        {tempModelInput === m.id && <CheckCircle className="h-4 w-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Atau Ketik Nama Model AI Manual
                  </label>
                  <input
                    type="text"
                    value={tempModelInput}
                    onChange={(e) => setTempModelInput(e.target.value)}
                    placeholder="Contoh: gemini-3.8-flash"
                    className={`${inputClass} font-mono`}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Pengaturan ini tersimpan di perangkat (APK/Browser) dan langsung digunakan saat membuat soal.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModelModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Save className="h-4 w-4" /> Simpan Model AI
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
