
export interface ExamConfig {
  schoolName: string;
  grade: string;
  major: string;
  subject: string;
  authors: string[]; // Daftar penyusun yang fleksibel
  teacherNip: string; // NIP penyusun utama untuk tanda tangan
  semester: 'Gasal' | 'Genap';
  academicYear: string;
  assessmentType: string;
  alokasiWaktu: string;
  
  // Update Baru: Elemen, CP & Topik Manual
  elementCps: { elemen: string; cp: string; topik: string[] }[];

  includePg: boolean;
  includeEssay: boolean;
  pgCount: number;
  pgLots: number;
  pgHots: number;
  pgOptions: 4 | 5;
  essayCount: number;
  essayLots: number;
  essayHots: number;
  userImages?: string[];
  imageTarget?: 'PG' | 'Uraian' | 'Keduanya';
  imageQuantity: number;
  imagePrompt?: string;
  // Field Tanda Tangan
  kotaAsal: string;
  tanggalDokumen: string;
  wksKurikulumName: string;
  wksKurikulumNip: string;
  koordinatorName: string;
  koordinatorNip: string;
  koordinatorTitle: string;
  kepalaSekolahJabatan: string;
  kepalaSekolahName: string;
  kepalaSekolahNip: string;
  customModel?: string;
}

export interface QuestionPG {
  number: number;
  question: string;
  imageUrl?: string;
  options: string[];
  answerKey: string;
  category: 'LOTS' | 'HOTS';
}

export interface QuestionEssay {
  number: number;
  question: string;
  imageUrl?: string;
  answerKey: string;
  category: 'LOTS' | 'HOTS';
}

export interface KisiKisiItem {
  elemen: string;
  capaianPembelajaran: string;
  materiPokok: string;
  levelKognitif: string;
  indikatorSoal: string;
  bentukSoal: string;
  nomorSoal: number;
}

export interface GeneratedExam {
  metadata: ExamConfig;
  pgQuestions: QuestionPG[];
  essayQuestions: QuestionEssay[];
  kisiKisi: KisiKisiItem[];
}

export const MAJORS = [
  "Semua Jurusan",
  "Teknik Jaringan Komputer dan Telekomunikasi",
  "Teknik Pengelasan dan Fabrikasi Logam",
  "Teknik Kendaraan Ringan",
  "Teknik Sepeda Motor",
  "Busana",
  "Desain Pemodelan dan Informasi Bangunan (DPIB)",
  "Teknik Pemesinan (TPM)",
  "Teknik Instalasi Tenaga Listrik (TITL)"
];

export const GRADES = ["X", "XI", "XII"];
export const SEMESTERS = ["Gasal", "Genap"] as const;
