import { Question, QuizConfig } from "../types";

export async function generateQuizQuestions(config: QuizConfig): Promise<Question[]> {
  const { subject, difficulty, language, questionCount, topic, pattern } = config;

  const patternScope = pattern === '2012-2020' 
    ? 'Old Pattern (2012–2020): Direct factual questions, simple recall-based.' 
    : 'New Pattern (2021–Present): Statement-based, confusing options, analytical, modern exam style.';

  const prompt = `
    Persona: You are an expert RPSC (Rajasthan Public Service Commission) and competitive exam teacher.
    Subject: ${subject}
    ${topic ? `Focus Topic: ${topic}` : ''}
    Exam Level: ${difficulty}
    Pattern Goal: ${patternScope}
    Number of Questions: ${questionCount}
    Requested Language: ${language}
    
    CRITICAL INSTRUCTIONS:
    1. LATEST DATA: Use real concepts, syllabus details, and actual factual events from Rajasthan and India.
    2. TRICKY QUESTIONS: Keep them very concise. Use simple, direct, or concise statement-based questions that test understanding with confusing options without using bloated text.
    3. SPECIAL FOCUS:
       - If 'Rajasthan Current Affairs' or 'Rajasthan GK': Emphasize regional history, geography, sports, cabinet changes, schemes, and bills.
       - If 'National Current Affairs' or others: Emphasize awards, schemes, indexes, and key syllabus elements.
    4. TEACHER STYLE: Use a "Guruji" tone for insights—supportive yet strict about accuracy.
    5. STRICT BREVITY & CONCISENESS (KAM SE KAM SHABD): Write the questions using the absolute minimum words possible. They must be extremely short, direct, and straightforward. Avoid long, complicated, or wordy prompts.
    
    Structure: Return an array of objects with: question, options (A,B,C,D), correctAnswer (A|B|C|D), explanation, teacherInsight, wrongOptionsAnalysis (object with A,B,C,D), extraFacts (array), videoUrl, imageUrl, patternYear.
  `;

  try {
    const response = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, config }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to generate quiz");
    }

    const data = await response.json();
    const parsedQuestions = JSON.parse(data.text);
    
    const questions: Question[] = parsedQuestions.map((q: any, index: number) => ({
      id: `q-${index}-${Date.now()}`,
      question: q.question || "",
      options: q.options || { A: "", B: "", C: "", D: "" },
      correctAnswer: (q.correctAnswer && ["A", "B", "C", "D"].includes(q.correctAnswer)) ? q.correctAnswer : "A",
      explanation: q.explanation || "",
      teacherInsight: q.teacherInsight || "",
      wrongOptionsAnalysis: q.wrongOptionsAnalysis || { A: "", B: "", C: "", D: "" },
      extraFacts: Array.isArray(q.extraFacts) ? q.extraFacts : [],
      videoUrl: q.videoUrl || "",
      imageUrl: q.imageUrl || "",
      patternYear: q.patternYear || "RPSC Standard"
    }));

    return questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
}
