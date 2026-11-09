import { ExamConfig, GeneratedExam } from "../types";

export const generateExamQuestions = async (config: ExamConfig): Promise<GeneratedExam> => {
  try {
    const response = await fetch('/api/generate-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // ignore parse error
      }
      throw new Error(errorMessage);
    }

    const data: GeneratedExam = await response.json();
    return data;
  } catch (error: any) {
    console.error("Gagal generate soal via server API:", error);
    throw new Error(error.message || "Gagal menghubungi server pembuat soal.");
  }
};
