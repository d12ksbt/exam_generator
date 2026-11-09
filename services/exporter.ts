
import { GeneratedExam } from "../types";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, PageOrientation, VerticalAlign, BorderStyle } from "docx";

const triggerDownload = (dataUri: string, filename: string) => {
  const link = document.createElement("a");
  link.href = dataUri;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const cleanOptionText = (opt: string): string => {
  if (!opt) return "";
  return opt.replace(/^(\s*[A-Ea-e][\.\)\-\:]\s*)+/, "").trim();
};

const formatFilePart = (value: string | undefined, fallback: string): string => {
  const raw = (value || fallback).trim();
  return raw.replace(/[\\/:*?"<>|]+/g, "-");
};

const buildExamFilename = (prefix: "Soal" | "Kisi-kisi", metadata: GeneratedExam["metadata"], ext: "pdf" | "docx"): string => {
  const mapel = formatFilePart(metadata.subject, "Mapel");
  const kelas = formatFilePart(metadata.grade, "X");
  const semester = formatFilePart(metadata.semester, "Gasal");
  return `${prefix}_${mapel}_${kelas}_${semester}.${ext}`;
};

export const downloadPDF = (exam: GeneratedExam, includeKey: boolean) => {
  const doc = new jsPDF();
  const { metadata, pgQuestions, essayQuestions } = exam;
  let y = 20;
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);

  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, y);
    y += (lines.length * (fontSize * 0.5)) + 2;
    if (y > 280) { doc.addPage(); y = 20; }
  };

  addText(`${metadata.schoolName.toUpperCase()}`, 14, true);
  addText(`${metadata.assessmentType}`, 12, true);
  addText(`Mata Pelajaran: ${metadata.subject} | Semester: ${metadata.semester}`, 11);
  addText(`Kelas/Jurusan: ${metadata.grade} / ${metadata.major}`, 11);
  addText(`Waktu: ${metadata.alokasiWaktu} | Tahun: ${metadata.academicYear}`, 11);
  y += 5;

  if (metadata.includePg && pgQuestions.length > 0) {
    addText("A. PILIHAN GANDA", 13, true);
    pgQuestions.forEach((q, idx) => {
      addText(`${idx + 1}. ${q.question}`, 10.5);
      q.options.forEach((opt, optIdx) => {
        addText(`    ${String.fromCharCode(65 + optIdx)}. ${cleanOptionText(opt)}`, 10);
      });
      y += 2;
    });
  }

  if (metadata.includeEssay && essayQuestions.length > 0) {
    y += 5;
    addText("B. URAIAN", 13, true);
    essayQuestions.forEach((q, idx) => {
      addText(`${idx + 1}. ${q.question}`, 10.5);
      y += 4;
    });
  }

  if (includeKey) {
    doc.addPage(); y = 20;
    addText("KUNCI JAWABAN", 16, true);
    if (metadata.includePg) {
      addText("I. Pilihan Ganda:", 12, true);
      const rows = Math.ceil(pgQuestions.length / 10);
      for (let r = 0; r < rows; r++) {
        let line = "";
        for (let i = 0; i < 10; i++) {
          const index = (r * 10) + i;
          if (index < pgQuestions.length) {
            line += `${index + 1}.${pgQuestions[index].answerKey}  `;
          }
        }
        addText(line.trim(), 10);
      }
      y += 5;
    }
    if (metadata.includeEssay) {
      addText("II. Uraian:", 12, true);
      essayQuestions.forEach((q, i) => {
        addText(`Uraian ${i+1}:`, 10, true);
        addText(q.answerKey, 10);
        y += 2;
      });
    }
  }

  triggerDownload(doc.output('datauristring'), buildExamFilename("Soal", metadata, "pdf"));
};

export const downloadDOCX = async (exam: GeneratedExam, includeKey: boolean) => {
  const { metadata, pgQuestions, essayQuestions } = exam;
  
  const children: any[] = [
    new Paragraph({
      text: metadata.schoolName.toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: metadata.assessmentType,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `Mata Pelajaran: ${metadata.subject} | Semester: ${metadata.semester}`,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `__________________________________________________________________________`, bold: true })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: "" }),
  ];

  if (metadata.includePg) {
    children.push(new Paragraph({ text: "A. PILIHAN GANDA", heading: HeadingLevel.HEADING_2 }));
    pgQuestions.forEach((q, i) => {
      children.push(new Paragraph({ text: `${i + 1}. ${q.question}`, spacing: { before: 200 } }));
      q.options.forEach((opt, optIdx) => {
        children.push(new Paragraph({ text: `${String.fromCharCode(65 + optIdx)}. ${cleanOptionText(opt)}`, indent: { left: 720 } }));
      });
    });
  }

  if (metadata.includeEssay) {
    children.push(new Paragraph({ text: "B. URAIAN", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }));
    essayQuestions.forEach((q, i) => {
      children.push(new Paragraph({ text: `${i + 1}. ${q.question}`, spacing: { before: 200 } }));
    });
  }

  if (includeKey) {
    children.push(new Paragraph({ text: "KUNCI JAWABAN", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 800 } }));
    if (metadata.includePg) {
      children.push(new Paragraph({ children: [new TextRun({ text: "I. Pilihan Ganda:", bold: true })] }));
      const rows = Math.ceil(pgQuestions.length / 10);
      for (let r = 0; r < rows; r++) {
        let line = "";
        for (let i = 0; i < 10; i++) {
          const index = (r * 10) + i;
          if (index < pgQuestions.length) {
            line += `${index + 1}.${pgQuestions[index].answerKey}  `;
          }
        }
        children.push(new Paragraph({ text: line.trim() }));
      }
    }
    if (metadata.includeEssay) {
      children.push(new Paragraph({ children: [new TextRun({ text: "II. Uraian:", bold: true })], spacing: { before: 400 } }));
      essayQuestions.forEach((q, i) => {
        children.push(new Paragraph({ children: [new TextRun({ text: `Uraian ${i+1}:`, bold: true })], spacing: { before: 200 } }));
        children.push(new Paragraph({ text: q.answerKey }));
      });
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const base64 = await Packer.toBase64String(doc);
  triggerDownload(`data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`, buildExamFilename("Soal", metadata, "docx"));
};

export const downloadKisiKisiPDF = (exam: GeneratedExam) => {
  // PENTING: Set ke A4 Landscape (297mm x 210mm)
  const doc = new jsPDF({ 
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  const { metadata, kisiKisi } = exam;
  const centerPos = 148.5; // Titik tengah A4 Landscape (297 / 2)

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("KISI-KISI PENULISAN SOAL", centerPos, 15, { align: 'center' });
  doc.text(metadata.assessmentType.toUpperCase(), centerPos, 22, { align: 'center' });
  doc.text(`TAHUN PELAJARAN ${metadata.academicYear}`, centerPos, 29, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const leftX = 15;
  const rightX = 180;
  
  doc.text(`Sekolah`, leftX, 42); doc.text(`: ${metadata.schoolName}`, leftX + 40, 42);
  doc.text(`Mata Pelajaran`, leftX, 47); doc.text(`: ${metadata.subject}`, leftX + 40, 47);
  doc.text(`Kelas/Semester`, leftX, 52); doc.text(`: ${metadata.grade} / ${metadata.semester}`, leftX + 40, 52);
  doc.text(`Alokasi Waktu`, leftX, 57); doc.text(`: ${metadata.alokasiWaktu}`, leftX + 40, 57);
  doc.text(`Jumlah Soal`, leftX, 62); 
  doc.text(`: - Pilihan Ganda : ${metadata.includePg ? metadata.pgCount : 0} Soal`, leftX + 40, 62);
  doc.text(`  - Uraian : ${metadata.includeEssay ? metadata.essayCount : 0} Soal`, leftX + 40, 67);

  doc.text(`Penyusun Soal`, rightX, 42); 
  metadata.authors.forEach((author, idx) => {
    doc.text(`${idx === 0 ? ':' : ' '} ${idx + 1}. ${author}`, rightX + 35, 42 + (idx * 5));
  });

  const headers = ["No.", "Elemen", "Capaian Pembelajaran", "Materi Pokok", "Indikator Soal", "Level", "Bentuk", "No Soal"];
  const colWidths = [10, 35, 85, 40, 60, 16, 18, 13];
  let x = 10;
  let y = 80;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  headers.forEach((h, i) => {
    doc.rect(x, y, colWidths[i], 12);
    const splitH = doc.splitTextToSize(h, colWidths[i] - 2);
    doc.text(splitH, x + (colWidths[i]/2), y + 7, { align: 'center' });
    x += colWidths[i];
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  y += 12;
  kisiKisi.forEach((item, index) => {
    x = 10;
    // Ubah "Peserta didik" menjadi "Murid"
    const cpText = item.capaianPembelajaran.replace(/Peserta didik/g, "Murid").replace(/peserta didik/g, "murid");
    const indikatorText = item.indikatorSoal.replace(/Peserta didik/g, "Murid").replace(/peserta didik/g, "murid");

    const splitCP = doc.splitTextToSize(cpText, colWidths[2] - 4);
    const splitIndikator = doc.splitTextToSize(indikatorText, colWidths[4] - 4);
    const rowHeight = Math.max(14, splitCP.length * 4, splitIndikator.length * 4);
    
    if (y + rowHeight > 185) { 
      doc.addPage('a4', 'landscape'); 
      y = 20; x = 10; doc.setFont("helvetica", "bold");
      headers.forEach((h, i) => {
        doc.rect(x, y, colWidths[i], 12);
        const splitH = doc.splitTextToSize(h, colWidths[i] - 2);
        doc.text(splitH, x + (colWidths[i]/2), y + 7, { align: 'center' });
        x += colWidths[i];
      });
      y += 12; x = 10; doc.setFont("helvetica", "normal");
    }
    
    const rowData = [(index+1).toString(), item.elemen, cpText, item.materiPokok, indikatorText, item.levelKognitif, item.bentukSoal, item.nomorSoal.toString()];
    rowData.forEach((val, i) => {
      doc.rect(x, y, colWidths[i], rowHeight);
      const splitVal = doc.splitTextToSize(val, colWidths[i] - 4);
      doc.text(splitVal, x + 2, y + 5);
      x += colWidths[i];
    });
    y += rowHeight;
  });

  // --- TANDA TANGAN (SESUAI GAMBAR REFERENSI & A4 LANDSCAPE) ---
  y += 15;
  const leftSigX = 35;
  const rightSigX = 210;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  // Baris 1: Wks Kurikulum & Tanggal
  doc.text("Wks. Kurikulum", leftSigX, y);
  doc.text(`${metadata.kotaAsal}, ${metadata.tanggalDokumen}`, rightSigX, y);
  
  // Baris 2: Koordinator
  y += 5;
  doc.text(metadata.koordinatorTitle, rightSigX, y);

  // Spasi Tanda Tangan
  y += 22;
  doc.setFont("helvetica", "bold");
  // Baris Nama (Bold + Underline disimulasikan)
  doc.text(metadata.wksKurikulumName, leftSigX, y);
  doc.text(metadata.koordinatorName, rightSigX, y);
  
  // Baris NIP
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`NIP. ${metadata.wksKurikulumNip}`, leftSigX, y);
  doc.text(`NIP. ${metadata.koordinatorNip}`, rightSigX, y);

  // Bagian Mengetahui
  y += 15;
  doc.text("Mengetahui,", centerPos, y, { align: 'center' });
  y += 5;
  doc.text(metadata.kepalaSekolahJabatan, centerPos, y, { align: 'center' });
  
  // Spasi Tanda Tangan Kepala Sekolah
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.text(metadata.kepalaSekolahName, centerPos, y, { align: 'center' });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`NIP. ${metadata.kepalaSekolahNip}`, centerPos, y, { align: 'center' });

  triggerDownload(doc.output('datauristring'), buildExamFilename("Kisi-kisi", metadata, "pdf"));
};

export const downloadKisiKisiDOCX = async (exam: GeneratedExam) => {
  const { metadata, kisiKisi } = exam;
  
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { 
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, 
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, 
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } 
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ text: `Sekolah : ${metadata.schoolName}` }),
              new Paragraph({ text: `Mata Pelajaran : ${metadata.subject}` }),
              new Paragraph({ text: `Kelas/Semester : ${metadata.grade} / ${metadata.semester}` }),
              new Paragraph({ text: `Alokasi Waktu : ${metadata.alokasiWaktu}` }),
              new Paragraph({ text: `Jumlah Soal : PG: ${metadata.includePg ? metadata.pgCount : 0}, Uraian: ${metadata.includeEssay ? metadata.essayCount : 0}` }),
            ]
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ text: `Penyusun Soal :` }),
              ...metadata.authors.map((a, i) => new Paragraph({ text: `${i+1}. ${a}` }))
            ]
          })
        ]
      })
    ]
  });

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ["No.", "Elemen", "Capaian Pembelajaran", "Materi Pokok", "Indikator Soal", "Level", "Bentuk", "No Soal"].map(h => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })],
          shading: { fill: "F0F0F0" }
        }))
      }),
      ...kisiKisi.map((item, index) => new TableRow({
        children: [
          (index + 1).toString(), 
          item.elemen, 
          // Ubah "Peserta didik" menjadi "Murid"
          item.capaianPembelajaran.replace(/Peserta didik/g, "Murid").replace(/peserta didik/g, "murid"), 
          item.materiPokok, 
          item.indikatorSoal.replace(/Peserta didik/g, "Murid").replace(/peserta didik/g, "murid"), 
          item.levelKognitif, 
          item.bentukSoal, 
          item.nomorSoal.toString()
        ].map(val => new TableCell({ children: [new Paragraph({ text: val })] }))
      }))
    ]
  });

  const doc = new Document({
    sections: [{
      properties: { 
        page: { 
          size: { 
            orientation: PageOrientation.LANDSCAPE, 
            width: 16838, 
            height: 11906 
          } // A4 Landscape (twips)
        } 
      },
      children: [
        new Paragraph({ text: "KISI-KISI PENULISAN SOAL", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: metadata.assessmentType.toUpperCase(), alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        headerTable,
        new Paragraph({ text: "" }),
        mainTable,
        new Paragraph({ text: "", spacing: { before: 400 } }),
        
        // Tanda Tangan Section (DOCX)
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { 
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, 
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, 
            insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } 
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Wks. Kurikulum" })] }),
                new TableCell({ children: [new Paragraph({ text: `${metadata.kotaAsal}, ${metadata.tanggalDokumen}`, alignment: AlignmentType.RIGHT }), new Paragraph({ text: metadata.koordinatorTitle, alignment: AlignmentType.RIGHT })] })
              ]
            }),
            new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "", spacing: { before: 800 } })] }), new TableCell({ children: [new Paragraph({ text: "" })] })] }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: metadata.wksKurikulumName, bold: true, underline: {} })] }), new Paragraph({ text: `NIP. ${metadata.wksKurikulumNip}` })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: metadata.koordinatorName, bold: true, underline: {} })], alignment: AlignmentType.RIGHT }), new Paragraph({ text: `NIP. ${metadata.koordinatorNip}`, alignment: AlignmentType.RIGHT })] })
              ]
            })
          ]
        }),
        new Paragraph({ text: "", spacing: { before: 400 } }),
        new Paragraph({ text: "Mengetahui,", alignment: AlignmentType.CENTER }),
        new Paragraph({ text: metadata.kepalaSekolahJabatan, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "", spacing: { before: 800 } }),
        new Paragraph({ children: [new TextRun({ text: metadata.kepalaSekolahName, bold: true, underline: {} })], alignment: AlignmentType.CENTER }),
        new Paragraph({ text: `NIP. ${metadata.kepalaSekolahNip}`, alignment: AlignmentType.CENTER }),
      ]
    }]
  });

  const base64 = await Packer.toBase64String(doc);
  triggerDownload(`data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`, buildExamFilename("Kisi-kisi", metadata, "docx"));
};
