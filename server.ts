import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
interface ExamConfig {
  schoolName?: string;
  grade?: string;
  major?: string;
  subject?: string;
  authors?: string[];
  teacherNip?: string;
  semester?: string;
  academicYear?: string;
  assessmentType?: string;
  alokasiWaktu?: string;
  elementCps?: { elemen: string; cp: string; topik: string[] }[];
  includePg?: boolean;
  includeEssay?: boolean;
  pgCount?: number;
  pgLots?: number;
  pgHots?: number;
  pgOptions?: number;
  essayCount?: number;
  essayLots?: number;
  essayHots?: number;
  userImages?: string[];
  imagePrompt?: string;
  [key: string]: any;
}

interface GeneratedExam {
  metadata: ExamConfig;
  pgQuestions: any[];
  essayQuestions: any[];
  kisiKisi: any[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Support JSON payloads including base64 stimulus images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper to initialize Gemini SDK on the server
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!apiKey) {
      console.warn("Peringatan: GEMINI_API_KEY atau API_KEY tidak terdeteksi pada environment.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Endpoint: API Generate Exam
  app.post('/api/generate-exam', async (req, res) => {
    try {
      const config: ExamConfig = req.body;

      if (!config) {
        return res.status(400).json({ error: "Konfigurasi ujian tidak ditemukan." });
      }

      const ai = getGeminiClient();
      const requestedModel = typeof config.customModel === 'string' && config.customModel.trim() !== ''
        ? config.customModel.trim()
        : (process.env.GEMINI_MODEL || "gemini-3.8-flash");
      const primaryModel = requestedModel;
      const fallbackModel = primaryModel === "gemini-3.8-flash" ? "gemini-3.1-flash-lite" : "gemini-3.8-flash";

      const actualPgCount = config.includePg ? (config.pgCount ?? 40) : 0;
      const actualEssayCount = config.includeEssay ? (config.essayCount ?? 5) : 0;
      const optionCount = config.pgOptions ?? 5;
      const optionLetters = optionCount === 4 ? "A, B, C, D" : "A, B, C, D, E";

      // Format Elemen, CP & Topik agar dipahami AI
      const cpList = (config.elementCps || []).map((item, i) => {
        const topikStr = Array.isArray(item.topik) ? item.topik.join(', ') : (item.topik || '');
        return `DATA ${i + 1}:\n   - Elemen: ${item.elemen}\n   - Capaian Pembelajaran (CP): ${item.cp}\n   - Materi/Topik Pokok: ${topikStr}`;
      }).join('\n\n');

      const prompt = `
        Bertindaklah sebagai Guru SMK profesional dan pengembang kurikulum. Buatlah soal ujian DAN Kisi-kisi penulisan soal (Kurikulum Merdeka).
        
        HEADER UJIAN:
        - Nama Sekolah: ${config.schoolName || 'SMK'}
        - Jenis Asesmen: ${config.assessmentType || 'ASESMEN'}
        - Mata Pelajaran: ${config.subject}
        - Semester: ${config.semester}
        - Kelas/Jurusan: ${config.grade} / ${config.major}
        - Penyusun: ${(config.authors || []).join(", ")}
        - Tahun Pelajaran: ${config.academicYear}
        
        PERHATIAN KHUSUS (REGULASI BSKAP):
        Berikut adalah DATA ELEMEN, CAPAIAN PEMBELAJARAN (CP), dan TOPIK RESMI yang diberikan pengguna.
        ANDA WAJIB MENGGUNAKAN TEKS INI untuk mengisi kolom "Elemen", "Capaian Pembelajaran", dan "Materi Pokok" pada tabel Kisi-kisi.
        JANGAN MENGARANG CP SENDIRI. Salin persis dari data di bawah ini dan distribusikan soal secara merata.

        === DATA CP USER MULAI ===
        ${cpList}
        === DATA CP USER SELESAI ===

        INSTRUKSI PEMBUATAN SOAL:
        1. Buat ${actualPgCount} soal Pilihan Ganda (PG) dengan ${optionCount} opsi jawaban (${optionLetters}) dan ${actualEssayCount} soal Uraian.
        2. PENTING UNTUK OPSI PILIHAN GANDA: Pada array "options", tuliskan ISI TEKS JAWABANNYA SAJA tanpa awalan huruf "A.", "B.", "C.", "D.", atau "E." (contoh benar: ["Perangkat keras jaringan", "Perangkat lunak sistem"], contoh SALAH: ["A. Perangkat keras jaringan", "B. Perangkat lunak sistem"]). Pada "answerKey", isi dengan hurufnya saja (misal: "A", "B", "C", "D", atau "E").
        3. Soal harus relevan dengan CP dan Topik Pokok yang diberikan di atas.
        4. DISTRIBUSI KOGNITIF: 
           - PG: ${config.pgHots ?? 10} HOTS, ${config.pgLots ?? 30} LOTS.
           - Uraian: ${config.essayHots ?? 3} HOTS, ${config.essayLots ?? 2} LOTS.
        
        ${config.userImages && config.userImages.length > 0 ? `
        5. INSTRUKSI STIMULUS GAMBAR:
           - Gunakan gambar yang dilampirkan sebagai stimulus soal.
           - PANDUAN PENGGUNA: "${config.imagePrompt || 'Gunakan gambar sebagai stimulus soal yang relevan.'}"
        ` : ''}

        6. Sinkronkan indikator soal di Kisi-kisi dengan nomor soal.
        7. Hasil harus dalam format JSON sesuai schema. Bahasa: Indonesia Formal.
      `;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          pgQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER },
                question: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                answerKey: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["number", "question", "options", "answerKey", "category"]
            }
          },
          essayQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER },
                question: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                answerKey: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["number", "question", "answerKey", "category"]
            }
          },
          kisiKisi: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                elemen: { type: Type.STRING },
                capaianPembelajaran: { type: Type.STRING },
                materiPokok: { type: Type.STRING },
                levelKognitif: { type: Type.STRING },
                indikatorSoal: { type: Type.STRING },
                bentukSoal: { type: Type.STRING },
                nomorSoal: { type: Type.INTEGER }
              },
              required: ["elemen", "capaianPembelajaran", "materiPokok", "levelKognitif", "indikatorSoal", "bentukSoal", "nomorSoal"]
            }
          }
        },
        required: ["pgQuestions", "essayQuestions", "kisiKisi"]
      };

      const parts: any[] = [{ text: prompt }];
      if (config.userImages && config.userImages.length > 0) {
        config.userImages.forEach(img => {
          if (img && img.includes(',')) {
            parts.unshift({
              inlineData: {
                data: img.split(',')[1],
                mimeType: img.split(';')[0].split(':')[1] || 'image/jpeg'
              }
            });
          }
        });
      }

      let response;
      try {
        response = await ai.models.generateContent({
          model: primaryModel,
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });
      } catch (primaryErr: any) {
        console.warn(`Primary model (${primaryModel}) failed, falling back to ${fallbackModel}:`, primaryErr.message);
        response = await ai.models.generateContent({
          model: fallbackModel,
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });
      }

      const jsonStr = response.text?.trim() || "{}";
      let data;
      try {
        const cleanJsonStr = jsonStr.replace(/^```json/i, '').replace(/```$/i, '').trim();
        data = JSON.parse(cleanJsonStr);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", jsonStr);
        return res.status(502).json({ error: "Gagal mengurai format JSON dari Gemini AI. Silakan coba kembali." });
      }

      const cleanOptionPrefix = (opt: string): string => {
        if (typeof opt !== 'string') return '';
        return opt.replace(/^(\s*[A-Ea-e][\.\)\-\:]\s*)+/, '').trim();
      };

      const cleanedPgQuestions = (data.pgQuestions || []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options.map(cleanOptionPrefix) : [],
        answerKey: typeof q.answerKey === 'string'
          ? q.answerKey.replace(/^(\s*[A-Ea-e])[\.\)\-\:].*$/, '$1').trim().toUpperCase()
          : q.answerKey,
      }));

      const result: GeneratedExam = {
        metadata: config,
        pgQuestions: cleanedPgQuestions,
        essayQuestions: data.essayQuestions || [],
        kisiKisi: data.kisiKisi || []
      };

      return res.json(result);
    } catch (error: any) {
      console.error("Server Gemini API Error:", error);
      return res.status(500).json({ error: error.message || "Gagal memproses pembuatan soal di server." });
    }
  });

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Serve static in production or attach Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.promises.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SMK Exam Generator berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Gagal memulai server:", err);
  process.exit(1);
});
