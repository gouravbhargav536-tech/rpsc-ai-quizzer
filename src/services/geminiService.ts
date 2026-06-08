// सबसे ऊपर axios इम्पोर्ट करें ताकि fetch का नाम न आए
// @ts-ignore
import axios from 'axios';
import { Question, QuizConfig } from "../types";
import { db, auth, functions } from './firebase';
import { doc, getDoc, setDoc, query, collection, where, limit, getDocs, serverTimestamp, increment } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export async function generateQuizQuestions(config: QuizConfig): Promise<Question[]> {
  const { subject, difficulty, language, questionCount, topic, pattern } = config;

  // Safely resolve the API key across potential Vite/process environments
  const apiKey = 
    ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || 
    ((import.meta as any).env?.GEMINI_API_KEY as string) || 
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) ||
    "";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please configure your API key in Settings > Secrets.");
  }

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
    
    Each JSON object must follow this structure exactly:
    - 'question': Extremely short, concise, and direct question (minimum words / kam se kam shabdon mein).
    - 'options': A, B, C, D option values (keep these concise too).
    - 'correctAnswer': String "A" | "B" | "C" | "D".
    - 'explanation': Clear factual explanation.
    - 'teacherInsight': "Guruji" style insight in Hinglish (Hindi+English Mixed) or the selected language with logic/mnemonics.
    - 'wrongOptionsAnalysis': A JSON object mapping A, B, C, D keys to short explanations of why that option is wrong (or why it's a trap).
    - 'extraFacts': Array of 2-3 related facts.
    - 'videoUrl': Relevant YouTube video ID or search string for concept.
    - 'imageUrl': Descriptive image search query.
    - 'patternYear': Specific exam style (e.g. "RPSC 2024 Mixed").
  `;

  // URL Setup
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  try {
    // 💡 FETCH की जगह AXIOS का उपयोग किया गया है ताकि Google AI Studio प्रीव्यू एरर न दे
    const response = await axios.post(url, {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              question: { type: "STRING" },
              options: {
                type: "OBJECT",
                properties: {
                  A: { type: "STRING" },
                  B: { type: "STRING" },
                  C: { type: "STRING" },
                  D: { type: "STRING" },
                },
                required: ["A", "B", "C", "D"],
              },
              correctAnswer: { type: "STRING", enum: ["A", "B", "C", "D"] },
              explanation: { type: "STRING" },
              teacherInsight: { type: "STRING" },
              wrongOptionsAnalysis: {
                type: "OBJECT",
                properties: {
                  A: { type: "STRING" },
                  B: { type: "STRING" },
                  C: { type: "STRING" },
                  D: { type: "STRING" },
                },
                required: ["A", "B", "C", "D"],
              },
              extraFacts: {
                type: "ARRAY",
                items: { type: "STRING" }
              },
              videoUrl: { type: "STRING" },
              imageUrl: { type: "STRING" },
              patternYear: { type: "STRING" },
            },
            required: ["question", "options", "correctAnswer", "explanation", "teacherInsight", "wrongOptionsAnalysis", "extraFacts"],
          }
        }
      }
    }, {
      headers: {
        "Content-Type": "application/json",
      }
    });

    const data = response.data;
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOutput) {
      console.error("Incompatible or empty response from Gemini API:", data);
      throw new Error("No response content generated by Gemini.");
    }

    const parsedQuestions = JSON.parse(textOutput);
    
    if (!Array.isArray(parsedQuestions)) {
      throw new Error("Gemini did not return an array of questions.");
    }

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
    throw new Error("Failed to generate quiz questions. Please check your API key configuration and network connectivity and try again.");
  }
}

export function mapBackendQuestions(rawQuestions: any[]): Question[] {
  return rawQuestions.map((q: any, i: number) => {
    let options: any = { A: '', B: '', C: '', D: '' };
    let correctAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
    
    if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
      // It's already our object format { A, B, C, D }
      options = {
        A: q.options.A || '',
        B: q.options.B || '',
        C: q.options.C || '',
        D: q.options.D || ''
      };
      correctAnswer = q.correctAnswer || q.answer || 'A';
      if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
        correctAnswer = 'A';
      }
    } else if (Array.isArray(q.options)) {
      // It's the array format ["", "", "", ""]
      options = {
        A: q.options[0] || '',
        B: q.options[1] || '',
        C: q.options[2] || '',
        D: q.options[3] || ''
      };
      
      const ansVal = q.answer || q.correctAnswer || '';
      if (['A', 'B', 'C', 'D'].includes(ansVal)) {
        correctAnswer = ansVal as any;
      } else {
        // Find which option matches the answer value
        const idx = q.options.indexOf(ansVal);
        if (idx === 0) correctAnswer = 'A';
        else if (idx === 1) correctAnswer = 'B';
        else if (idx === 2) correctAnswer = 'C';
        else if (idx === 3) correctAnswer = 'D';
        else correctAnswer = 'A';
      }
    }
    
    return {
      id: q.id || `q-${i}-${Date.now()}`,
      question: q.question || '',
      options,
      correctAnswer,
      explanation: q.explanation || q.insight || 'RPSC Pattern and Concept details.',
      teacherInsight: q.teacherInsight || q.explanation || 'ध्यान रखें और सही विकल्प चुनें!',
      wrongOptionsAnalysis: q.wrongOptionsAnalysis || {
        A: 'यह विकल्प सही नहीं है।',
        B: 'यह विकल्प सही नहीं है।',
        C: 'यह विकल्प सही नहीं है।',
        D: 'यह विकल्प सही नहीं है।'
      },
      extraFacts: Array.isArray(q.extraFacts) ? q.extraFacts : []
    };
  });
}

export async function getOrCreateQuizService(
  config: QuizConfig,
  userId: string,
  onQuizCountUpdated?: (newCount: number) => void
): Promise<{ source: 'api_generated' | 'firebase_storage'; questions: Question[] }> {
  
  if (!userId) {
    // If not signed in, fall back directly to online generation
    const questions = await generateQuizQuestions(config);
    return { source: 'api_generated', questions };
  }

  // 1. Try to invoke the deployed Cloud Function getOrCreateQuiz
  try {
    const getOrCreateQuizCall = httpsCallable<{ subject: string; topic: string }, { source: string; quiz: any }>(
      functions,
      'getOrCreateQuiz'
    );
    const result = await getOrCreateQuizCall({
      subject: config.subject,
      topic: config.topic || ''
    });
    
    if (result && result.data && result.data.quiz) {
      const source = result.data.source as any;
      const rawQuiz = result.data.quiz;
      
      const parsedQuestions = Array.isArray(rawQuiz.questions) 
        ? rawQuiz.questions 
        : (typeof rawQuiz === 'string' ? JSON.parse(rawQuiz).questions : []);
        
      const questions = mapBackendQuestions(parsedQuestions);
      
      // Update local storage gamification stats if counter incremented
      if (source === 'api_generated') {
        const statsStr = localStorage.getItem('rpsc-gamification');
        if (statsStr) {
          const stats = JSON.parse(statsStr);
          stats.quizCount = (stats.quizCount || 0) + 1;
          localStorage.setItem('rpsc-gamification', JSON.stringify(stats));
          if (onQuizCountUpdated) onQuizCountUpdated(stats.quizCount);
        }
      }
      
      return { source, questions };
    }
  } catch (callableError: any) {
    console.warn("Cloud function call failed or not deployed, falling back to local simulation:", callableError);
  }

  // 2. Client-side database simulation (exact logic matching the CF)
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  let userData = userDoc.exists() ? userDoc.data() : { quizCount: 0 };
  const currentCount = userData.quizCount || 0;
  
  if (currentCount < 60) {
    try {
      // Create quiz using Gemini AI via axios proxy
      // The Cloud Function prompt is a 5-question multiple choice quiz
      const adaptedConfig = {
        ...config,
        questionCount: 5 // Cloud Function specified exactly 5 questions
      };
      
      const questions = await generateQuizQuestions(adaptedConfig);
      
      // Save newly generated quiz rules-compliant template to global quizzes pool
      const quizRef = doc(collection(db, 'quizzes'));
      
      const templateData = {
        questions: questions.map(q => ({
          question: q.question,
          options: [q.options.A, q.options.B, q.options.C, q.options.D],
          answer: q.correctAnswer,
          teacherInsight: q.teacherInsight || '',
          explanation: q.explanation || '',
          wrongOptionsAnalysis: q.wrongOptionsAnalysis || { A: '', B: '', C: '', D: '' },
          extraFacts: q.extraFacts || []
        })),
        subject: config.subject.toLowerCase(),
        topic: (config.topic || '').toLowerCase(),
        generatedBy: userId,
        createdAt: serverTimestamp()
      };
      
      await setDoc(quizRef, templateData);
      
      // Increment user's quizCount and sync to database
      await setDoc(userRef, { quizCount: increment(1) }, { merge: true });
      
      // Update local stats
      const statsStr = localStorage.getItem('rpsc-gamification');
      if (statsStr) {
        const stats = JSON.parse(statsStr);
        stats.quizCount = currentCount + 1;
        localStorage.setItem('rpsc-gamification', JSON.stringify(stats));
        if (onQuizCountUpdated) onQuizCountUpdated(stats.quizCount);
      }
      
      return { source: 'api_generated', questions };
    } catch (apiError) {
      console.error("Gemini local generator failed during fallback simulation:", apiError);
      throw new Error("क्विज़ जनरेट करने में समस्या आई।");
    }
  } else {
    // 3. Fallback: load up to 5 previously generated templates from firebase pool
    const quizCol = collection(db, 'quizzes');
    const qTemp = query(
      quizCol, 
      where('subject', '==', config.subject.toLowerCase()), 
      limit(5)
    );
    const quizSnapshot = await getDocs(qTemp);
    
    // If no templates exist for that topic/subject, fall back to generating one anyway
    // (We don't want the user to be locked out of play if they have high quizCount but pool is light!)
    if (quizSnapshot.empty) {
      try {
        const questions = await generateQuizQuestions(config);
        return { source: 'api_generated', questions };
      } catch (e) {
        throw new Error("इस विषय पर अभी कोई पुराना क्विज़ मौजूद नहीं है।");
      }
    }
    
    // Filter out docs that represent completed quiz sessions instead of templates
    // (A template is defined by having a 'generatedBy' field instead of 'userId' field)
    const templates = quizSnapshot.docs.filter(doc => doc.data().generatedBy !== undefined);
    
    if (templates.length === 0) {
      // Handle case where all found docs are completed results instead of template formats
      try {
        const questions = await generateQuizQuestions(config);
        return { source: 'api_generated', questions };
      } catch (e) {
        throw new Error("इस विषय पर अभी कोई पुराना क्विज़ मौजूद नहीं है।");
      }
    }
    
    const randomIndex = Math.floor(Math.random() * templates.length);
    const backupQuizData = templates[randomIndex].data();
    
    const parsedQuestions = Array.isArray(backupQuizData.questions) ? backupQuizData.questions : [];
    const questions = mapBackendQuestions(parsedQuestions);
    
    return { source: 'firebase_storage', questions };
  }
}
