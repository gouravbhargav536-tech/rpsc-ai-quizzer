/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  Timer, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Award, 
  BrainCircuit,
  ArrowLeft,
  Loader2,
  History,
  Calculator,
  FlaskConical,
  Languages,
  Zap,
  Activity,
  LayoutGrid,
  Info,
  ShieldCheck,
  ChevronLeft,
  LogOut,
  Palette,
  Castle,
  Sun,
  Trophy,
  Star,
  Map as MapIcon,
  Compass,
  User as UserIcon,
  Menu,
  X
} from 'lucide-react';
import { generateQuizQuestions } from './services/geminiService';
import { Question, QuizConfig, Subject, Difficulty, Language, ThemeType, User, ExamPattern } from './types';
import { authService } from './services/authService';
import { saveQuiz, getUserQuizzes, SavedQuiz } from './lib/quizService';
import IntroScreen from './components/IntroScreen';
import AuthScreen from './components/AuthScreen';
import RiverMap from './components/RiverMap';
import SystemStatusBar from './components/SystemStatusBar';
import { useFeedback } from './hooks/useFeedback';

export default function App() {
  const [screen, setScreen] = useState<'LANDING' | 'INTRO' | 'AUTH' | 'HOME' | 'SETUP' | 'RULES' | 'QUIZ' | 'RESULTS'>('LANDING');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [oldQuizzes, setOldQuizzes] = useState<SavedQuiz[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSystemBar, setShowSystemBar] = useState(false);
  const [systemClicks, setSystemClicks] = useState(0);
  const [theme, setTheme] = useState<ThemeType>('geometric');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [hasSavedQuiz, setHasSavedQuiz] = useState(false);
  
  // Selection state
  const [config, setConfig] = useState<QuizConfig>({
    subject: 'Rajasthan GK',
    difficulty: 'Medium',
    language: 'English',
    questionCount: 10,
    pattern: '2021-Present',
    topic: ''
  });

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [mistakes, setMistakes] = useState<Question[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [quizTimer, setQuizTimer] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Gamification state
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [dailyDone, setDailyDone] = useState(false);
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const { feedback } = useFeedback();

  // Check for saved quiz on mount
  useEffect(() => {
    const saved = localStorage.getItem('rpsc_current_quiz');
    if (saved) setHasSavedQuiz(true);
  }, [screen]);

  // Persist user and progress
  useEffect(() => {
    const unsubscribe = authService.onAuthChange((u) => {
      setUser(u);
      if (u) {
        setScreen('HOME');
        getUserQuizzes().then(setOldQuizzes);
      } else {
        setScreen('INTRO');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    feedback('click');
    authService.logout();
    setScreen('INTRO');
  };

  const handleLogoClick = () => {
    setSystemClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setShowSystemBar(true);
        return 0;
      }
      return next;
    });
  };

  const toggleTheme = () => {
    feedback('royal');
    setTheme(prev => prev === 'geometric' ? 'rajasthan' : 'geometric');
  };

  useEffect(() => {
    if (screen === 'QUIZ' && !loading) {
      timerRef.current = setInterval(() => {
        setQuizTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, loading]);

  const startSetup = (subject: Subject) => {
    feedback('click');
    setConfig(prev => ({ ...prev, subject }));
    setIsReviewMode(false);
    setIsDailyChallenge(false);
    setScreen('SETUP');
  };

  const startMistakeReview = () => {
    if (mistakes.length === 0) return;
    setQuestions(mistakes);
    setUserAnswers(new Array(mistakes.length).fill(null));
    setCurrentIndex(0);
    setIsReviewMode(true);
    setIsDailyChallenge(false);
    setScreen('QUIZ');
  };

  useEffect(() => {
    const savedStats = localStorage.getItem('rpsc-gamification');
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setStreak(stats.streak || 0);
      setBadges(stats.badges || []);
      
      const today = new Date().toDateString();
      if (stats.lastDailyDate === today) {
        setDailyDone(true);
      }
    }
  }, []);

  const updateGamification = (newScore: number, total: number) => {
    const statsStr = localStorage.getItem('rpsc-gamification');
    let stats = statsStr ? JSON.parse(statsStr) : { streak: 0, badges: [], lastDailyDate: '', quizCount: 0 };
    
    // Update Streak
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (stats.lastQuizDate === yesterday.toDateString()) {
      stats.streak += 1;
    } else if (stats.lastQuizDate !== today) {
      stats.streak = 1;
    }
    stats.lastQuizDate = today;

    // Daily Challenge update
    if (isDailyChallenge && newScore >= 8) {
      stats.lastDailyDate = today;
      setDailyDone(true);
      if (!stats.badges.includes('Daily Warrior')) stats.badges.push('Daily Warrior');
    }

    // Badge logic
    stats.quizCount = (stats.quizCount || 0) + 1;
    if (stats.quizCount >= 10 && !stats.badges.includes('Exam Ninja')) stats.badges.push('Exam Ninja');
    if (newScore === total && total >= 10 && !stats.badges.includes('Perfectionist')) stats.badges.push('Perfectionist');
    if (newScore === total && !isDailyChallenge && !stats.badges.includes('Topic Master')) stats.badges.push('Topic Master');
    if (streak >= 7 && !stats.badges.includes('Consistency King')) stats.badges.push('Consistency King');

    localStorage.setItem('rpsc-gamification', JSON.stringify(stats));
    setStreak(stats.streak);
    setBadges(stats.badges);
  };

  useEffect(() => {
    if (screen === 'RESULTS') {
      updateGamification(getScore(), questions.length);
    }
  }, [screen]);

  const startDailyChallenge = () => {
    if (dailyDone) return;
    setConfig({
      subject: 'Rajasthan GK',
      difficulty: 'Hard',
      language: 'English',
      questionCount: 10,
      topic: 'Mixed Syllabus Rapid Fire'
    });
    setIsDailyChallenge(true);
    handleStartQuiz();
  };

  const handleStartQuiz = () => {
    feedback('click');
    setScreen('RULES');
  };

  const confirmStartQuiz = async () => {
    feedback('click');
    setLoading(true);
    setScreen('QUIZ');
    try {
      const generatedQuestions = await generateQuizQuestions(config);
      setQuestions(generatedQuestions);
      setUserAnswers(new Array(generatedQuestions.length).fill(null));
      setCurrentIndex(0);
      setQuizTimer(0);
      setIsAnswered(false);

      // Automatic Save to Firebase
      saveQuiz(config, generatedQuestions).then(() => {
        getUserQuizzes().then(setOldQuizzes);
      });
    } catch (error) {
      alert("Error generating quiz. Please try again.");
      setScreen('SETUP');
    } finally {
      setLoading(false);
    }
  };

  const loadOldQuiz = (q: SavedQuiz) => {
    setQuestions(q.questions);
    setUserAnswers(new Array(q.questions.length).fill(null));
    setCurrentIndex(0);
    setQuizTimer(0);
    setIsAnswered(false);
    setConfig(q.config);
    setScreen('QUIZ');
    setShowHistory(false);
    feedback('success');
  };

  const handleSelectAnswer = (answer: string) => {
    if (isAnswered) return;
    
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = answer;
    setUserAnswers(newAnswers);
    setIsAnswered(true);

    if (answer === questions[currentIndex].correctAnswer) {
      feedback('correct');
      setConsecutiveCorrect(prev => prev + 1);
    } else {
      feedback('wrong');
      setConsecutiveCorrect(0);
      setMistakes(prev => {
        if (prev.find(m => m.id === questions[currentIndex].id)) return prev;
        return [...prev, questions[currentIndex]];
      });
    }
  };

  const nextQuestion = () => {
    feedback('click');
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsAnswered(false);
    } else {
      feedback('success');
      setScreen('RESULTS');
    }
  };

  const skipQuestion = () => {
    feedback('click');
    setUserAnswers(prev => {
      const next = [...prev];
      next[currentIndex] = 'SKIPPED';
      return next;
    });
    nextQuestion();
  };

  const prevQuestion = () => {
    feedback('click');
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsAnswered(true); // Assuming they already answered, if not it just shows question
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScore = () => {
    return userAnswers.reduce((acc, ans, idx) => {
      return ans === questions[idx]?.correctAnswer ? acc + 1 : acc;
    }, 0);
  };

  const getSkippedCount = () => {
    return userAnswers.filter(ans => ans === 'SKIPPED').length;
  };

  const getIncorrectCount = () => {
    return userAnswers.filter((ans, idx) => ans !== 'SKIPPED' && ans !== null && ans !== questions[idx]?.correctAnswer).length;
  };

  const subjects: { name: Subject; icon: any; color: string; desc: string }[] = [
    { name: 'Rajasthan Current Affairs', icon: Zap, color: 'bg-amber-600', desc: 'Sports, Politics, Schemes 2026' },
    { name: 'National Current Affairs', icon: Sun, color: 'bg-rose-600', desc: 'National & Global Events' },
    { name: 'Rajasthan GK', icon: History, color: 'bg-blue-600', desc: 'Geography, History, Culture' },
    { name: 'Indian GK', icon: BookOpen, color: 'bg-indigo-600', desc: 'Constitution, Polity, Economy' },
    { name: 'Mathematics', icon: Calculator, color: 'bg-orange-600', desc: 'Algebra, Calculus, Probability' },
    { name: 'Science', icon: FlaskConical, color: 'bg-green-600', desc: 'Physics, Chemistry, Biology' },
    { name: 'Reasoning', icon: BrainCircuit, color: 'bg-teal-600', desc: 'Series, Analogy, Puzzles' },
    { name: 'Hindi', icon: Languages, color: 'bg-red-600', desc: 'Grammar, Vocab, Samas' },
    { name: 'English', icon: Zap, color: 'bg-purple-600', desc: 'Grammar, Tense, Voice' },
  ];

  return (
    <div className={`h-screen bg-page flex flex-col font-sans text-main overflow-hidden theme-${theme} relative`} data-theme={theme}>
      {/* Background Accents (Geometric Balance Mode) */}
      {theme === 'geometric' && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px]"></div>
        </div>
      )}

      {/* Background Accents (Rajasthan Royal Mode) */}
      {theme === 'rajasthan' && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 opacity-100 -z-10">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_20%_20%,#9f1239_2px,transparent_2px)] bg-[length:32px_32px]" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[100px]"></div>
        </div>
      )}

      <AnimatePresence mode="wait">
        
        {/* LANDING SCREEN */}
        {screen === 'LANDING' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full bg-slate-900 text-white p-6"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-primary rounded flex items-center justify-center text-white font-bold text-3xl shadow-lg font-display">A</div>
              <h1 className="text-4xl font-bold tracking-tight font-display">RPSC <span className="text-primary underline underline-offset-8 decoration-2 italic">AI-Quizzer</span></h1>
            </div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <p className="text-xl font-light tracking-wide text-slate-300">आपकी तैयारी का स्मार्ट साथी!</p>
              <p className="text-sm uppercase tracking-[0.3em] mt-4 text-primary font-bold">Initializing Engine</p>
            </motion.div>
          </motion.div>
        )}

        {/* INTRO SCREEN */}
        {screen === 'INTRO' && (
          <IntroScreen onStart={() => setScreen('AUTH')} />
        )}

        {/* AUTH SCREEN */}
        {screen === 'AUTH' && (
          <AuthScreen 
            onSuccess={(u) => {
              setUser(u);
              setScreen('HOME');
            }} 
            onBack={() => setScreen('INTRO')}
          />
        )}

        {/* QUIZ SHELL (Used for screens after intro/auth) */}
        {(screen !== 'LANDING' && screen !== 'INTRO' && screen !== 'AUTH') && (
          <motion.div
            key="app-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Header Navigation */}
            <header className={`h-16 md:h-20 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-20 transition-all duration-700 ${
              theme === 'rajasthan' 
                ? 'bg-gradient-to-r from-rose-800 via-red-700 to-orange-600 text-white border-b-4 border-amber-600 shadow-lg' 
                : 'bg-white/80 backdrop-blur-md border-b border-white/10'
            }`}>
                <div className="flex items-center gap-3 md:gap-4 cursor-pointer" onClick={handleLogoClick}>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-bold text-lg md:text-xl font-display shadow-lg transition-transform active:scale-95 ${
                    theme === 'rajasthan' ? 'bg-white text-rose-800' : 'bg-primary text-white'
                  }`}>
                    {theme === 'rajasthan' ? <Castle size={18} /> : 'A'}
                  </div>
                  <div>
                    <h1 className={`text-base md:text-xl font-bold tracking-tight font-display ${theme === 'rajasthan' ? 'text-white' : ''}`}>
                      RPSC <span className={`${theme === 'rajasthan' ? 'text-amber-200' : 'text-primary'} underline decoration-2 underline-offset-4`}>AI-Quizzer</span>
                    </h1>
                    {theme === 'rajasthan' && <p className="hidden md:block text-[8px] text-orange-100 uppercase tracking-widest font-bold">Royal Examination Portal</p>}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 md:gap-4">
                  {(screen === 'QUIZ' || screen === 'RESULTS') && (
                    <div className="flex flex-col items-end mr-1 md:mr-4">
                      <span className="hidden lg:block text-[9px] uppercase font-bold text-slate-400 tracking-widest whitespace-nowrap">Session Timer</span>
                      <span className="text-xs md:text-xl font-mono font-bold text-primary italic leading-none">{formatTime(quizTimer)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 md:gap-2">
                    <div className="hidden sm:flex items-center gap-1 px-2 md:px-3 py-1 bg-orange-500/10 border border-orange-500/10 rounded-full">
                      <span className="text-orange-500 animate-pulse text-[10px]">🔥</span>
                      <span className="text-[10px] md:text-xs font-bold text-orange-500">{streak}</span>
                    </div>

                    <button 
                      onClick={toggleTheme}
                      title="Switch Theme"
                      className={`flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 rounded-full transition-all duration-700 shadow-lg border group relative overflow-hidden active:scale-95 ${
                        theme === 'rajasthan' 
                          ? 'bg-rose-900/40 border-amber-500/50 text-amber-100 hover:bg-rose-900/60' 
                          : 'bg-white border-indigo-100 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      <Palette size={18} className={`transition-all duration-500 group-hover:rotate-[30deg] ${theme === 'rajasthan' ? 'text-amber-400' : 'text-indigo-500'}`} />
                      <span className={`text-[10px] md:text-sm font-bold transition-all duration-700 whitespace-nowrap ${
                        theme === 'rajasthan' 
                          ? 'font-serif italic text-amber-200 tracking-[0.15em] drop-shadow-sm' 
                          : 'font-display uppercase tracking-widest text-indigo-700'
                      }`}>
                        {theme === 'rajasthan' ? 'Royal Mode' : 'Switch Theme'}
                      </span>
                      
                      {theme === 'rajasthan' && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
                          transition={{ repeat: Infinity, duration: 3 }}
                          className="absolute top-1 right-2 text-amber-300 pointer-events-none"
                        >
                          <Star size={8} fill="currentColor" />
                        </motion.div>
                      )}
                      
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-white`}></div>
                    </button>

                  <div className="hidden xs:block h-6 md:h-8 w-px bg-slate-200 mx-1 md:mx-2"></div>

                  {user && (
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="flex flex-col items-end hidden lg:flex">
                        <span className={`text-[10px] font-bold uppercase tracking-widest leading-none mb-1 ${theme === 'rajasthan' ? 'text-orange-200 opacity-80' : 'text-slate-400'}`}>Authenticated</span>
                        <span className={`text-xs font-bold ${theme === 'rajasthan' ? 'text-white' : 'text-main'}`}>{user.name}</span>
                      </div>
                      <button 
                        onClick={handleLogout}
                        title="Logout"
                        className={`p-1.5 md:p-2 transition-colors ${theme === 'rajasthan' ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-red-500'}`}
                      >
                        <LogOut size={16} />
                      </button>
                    </div>
                  )}

                  {screen === 'QUIZ' && (
                    <button 
                      onClick={() => setScreen('RESULTS')}
                      className="px-3 md:px-6 py-1.5 md:py-2 bg-slate-900 text-white text-xs md:text-sm font-semibold rounded hover:bg-slate-800 transition-colors shadow-sm ml-1 md:ml-4"
                    >
                      Submit
                    </button>
                  )}
                  {screen === 'RESULTS' && (
                    <button 
                      onClick={() => setScreen('HOME')}
                      className="px-3 md:px-6 py-1.5 md:py-2 bg-primary text-white text-xs md:text-sm font-semibold rounded hover:brightness-110 transition-all shadow-sm ml-1 md:ml-4"
                    >
                      Exit
                    </button>
                  )}
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden relative">
              
              {/* Sidebar Left: Progress & Stats (Quiz) - Desktop and Tablet */}
              {screen === 'QUIZ' && !loading && (
                <aside className="hidden lg:flex w-72 border-r border-white/10 bg-white/5 backdrop-blur-sm p-6 flex-col gap-8 shrink-0 relative z-10 transition-all">
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 font-display">
                       <Activity size={12} /> Adaptive Progress
                    </h3>
                    <div className="flex items-end gap-1.5 h-12">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`flex-1 rounded-sm transition-all duration-500 ${
                            i <= (currentIndex / questions.length) * 5 ? 'bg-primary' : 'bg-slate-100'
                          }`} 
                          style={{ height: `${(5 - i) * 20}%` }} 
                        />
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-slate-600 italic">
                      Difficulty: <span className="font-bold text-accent">{config.difficulty}</span>
                    </p>
                  </div>

                  <div>
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <LayoutGrid size={12} /> Question Map
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      {questions.map((_, i) => {
                        const isCurrent = i === currentIndex;
                        const isAnswered = userAnswers[i] !== null;
                        return (
                          <div 
                            key={i}
                            onClick={() => setCurrentIndex(i)}
                            className={`aspect-square border flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ${
                              isCurrent 
                                ? 'border-primary bg-primary text-white shadow-md' 
                                : isAnswered 
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {(i + 1).toString().padStart(2, '0')}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-auto p-4 bg-slate-50 border border-slate-200 rounded">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      <span className="font-bold block mb-1 uppercase tracking-tighter text-slate-400 flex items-center gap-1"><Info size={10} /> RPSC Context</span>
                      AI-curated patterns based on previous years' exams.
                    </p>
                  </div>
                </aside>
              )}

              {/* Central Section */}
              <section className="flex-1 bg-slate-50 overflow-y-auto px-4 md:px-12 py-8 md:py-12 flex flex-col pb-32 md:pb-12">
                {showSystemBar && (
         <SystemStatusBar onClose={() => setShowSystemBar(false)} />
       )}

       <AnimatePresence>
         {showHistory && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
           >
             <motion.div
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
             >
               <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                 <div>
                   <h3 className="text-xl font-display font-bold">Your Quiz History</h3>
                   <p className="text-xs text-slate-500">Retrieving old quizzes from Firebase...</p>
                 </div>
                 <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                   <X size={20} />
                 </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-4">
                 {oldQuizzes.length === 0 ? (
                   <div className="text-center py-12">
                     <p className="text-slate-400 italic">No historical quizzes found.</p>
                   </div>
                 ) : (
                   oldQuizzes.map(quiz => (
                     <div 
                       key={quiz.id}
                       className="p-4 border border-slate-100 rounded-2xl hover:border-primary/40 hover:bg-slate-50 transition-all group flex items-center justify-between"
                     >
                       <div>
                         <h4 className="font-bold text-slate-800">{quiz.subject}</h4>
                         <p className="text-[10px] text-slate-500 uppercase tracking-widest">{quiz.topic}</p>
                         <p className="text-[9px] text-slate-400 mt-1">{new Date(quiz.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                       </div>
                       <button 
                         onClick={() => loadOldQuiz(quiz)}
                         className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         Retake
                       </button>
                     </div>
                   ))
                 )}
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       <AnimatePresence mode="wait">
                  {screen === 'HOME' && (
                    <motion.div
                      key="home-grid"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="max-w-4xl mx-auto w-full"
                    >
                      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10 gap-4 md:gap-6">
                        <div>
                          <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Select Examination Subject</span>
                          <h2 className="text-2xl md:text-4xl font-display mt-1 md:mt-2 text-main italic">RPSC <span className="text-primary">Practice Portal</span></h2>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 md:gap-4 items-center">
                          <button 
                            onClick={() => setShowHistory(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-primary transition-colors"
                          >
                            <History size={16} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">Old Quizzes</span>
                          </button>

                          {streak > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-2xl shadow-sm">
                              <span className="text-xl">🔥</span>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-tighter">Current Streak</span>
                                <span className="text-sm font-bold text-orange-700 leading-none">{streak} Days</span>
                              </div>
                            </div>
                          )}

                          {mistakes.length > 0 && (
                            <button 
                              onClick={startMistakeReview}
                              className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-all uppercase text-xs tracking-widest ${
                                theme === 'rajasthan' 
                                  ? 'bg-rose-800 text-white rounded-2xl border-rose-900 shadow-rose-900/20 shadow-lg' 
                                  : 'bg-accent text-white rounded-sm border-accent/40 shadow-accent/20 shadow-lg'
                              } hover:brightness-110`}
                            >
                              <BrainCircuit size={16} /> Review Mistakes ({mistakes.length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Gamification Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        {/* Daily Challenge Card */}
                        <div className={`col-span-1 md:col-span-2 p-5 md:p-8 rounded-3xl border-2 flex flex-col sm:flex-row items-center sm:items-stretch gap-6 relative overflow-hidden group ${
                          dailyDone 
                            ? 'bg-slate-50 border-slate-200 opacity-80' 
                            : 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-600 text-white'
                        }`}>
                          <div className="flex-1 relative z-10 text-center sm:text-left">
                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                              <Sun size={20} className={dailyDone ? 'text-slate-400' : 'text-white animate-spin-slow'} />
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Daily Challenge</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-display font-bold mb-2">10 MCQs Rapid Fire</h3>
                            <p className={`text-xs md:text-sm mb-6 ${dailyDone ? 'text-slate-500' : 'text-white/80'}`}>
                              {dailyDone ? 'You completed today\'s challenge! Return tomorrow.' : 'Finish in 5 minutes to earn the "Daily Warrior" badge.'}
                            </p>
                            
                            {!dailyDone && (
                              <button 
                                onClick={startDailyChallenge}
                                className="px-6 py-2.5 bg-white text-orange-600 font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                              >
                                Start Challenge
                              </button>
                            )}
                            {dailyDone && (
                              <div className="flex items-center justify-center sm:justify-start gap-2 text-green-600 font-bold text-sm">
                                <CheckCircle2 size={18} /> Completed 
                              </div>
                            )}
                          </div>
                          <div className={`w-24 h-24 md:w-32 md:h-32 flex items-center justify-center shrink-0 relative z-10 ${dailyDone ? 'grayscale opacity-20' : ''}`}>
                             <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                             <Star size={48} className="text-white drop-shadow-lg md:hidden" />
                             <Star size={64} className="text-white drop-shadow-lg hidden md:block" />
                          </div>
                        </div>

                        {/* Resume / Badges Panel */}
                        <div className="flex flex-col gap-6">
                           {hasSavedQuiz && (
                             <motion.button
                               initial={{ x: 20, opacity: 0 }}
                               animate={{ x: 0, opacity: 1 }}
                               onClick={restoreQuiz}
                               className="p-6 bg-slate-900 rounded-3xl text-white border border-slate-700 shadow-xl group relative overflow-hidden"
                             >
                                <div className="relative z-10">
                                   <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Active Session</span>
                                   </div>
                                   <h3 className="text-xl font-display font-bold mb-1">Resume Test</h3>
                                   <p className="text-[10px] text-slate-400 italic">Curated: {config.subject}</p>
                                </div>
                                <Activity className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform" size={100} />
                             </motion.button>
                           )}

                           <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-1">
                           <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Award size={14} /> Unlocked Badges
                           </h3>
                           <div className="flex flex-wrap gap-3">
                             {badges.length === 0 ? (
                               <p className="text-xs text-slate-400 italic">Complete quizzes to unlock achievement badges.</p>
                             ) : (
                               badges.map(b => (
                                 <div key={b} className="group relative">
                                   <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all cursor-help shadow-sm">
                                     <Award size={18} />
                                   </div>
                                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[9px] rounded font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                     {b}
                                   </div>
                                 </div>
                               ))
                             )}
                           </div>
                        </div>
                      </div>

                    </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map((sub, idx) => (
                          <motion.button
                            key={sub.name}
                            whileHover={{ y: -4, shadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                            onClick={() => startSetup(sub.name)}
                            className={`p-6 border text-left transition-all group ${
                              theme === 'rajasthan' 
                                ? 'bg-white rounded-3xl border-orange-200 shadow-md shadow-orange-100 hover:shadow-xl' 
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className={`w-10 h-10 ${
                              theme === 'rajasthan' ? 'bg-rose-800' : (sub.color.includes('blue') ? 'bg-primary' : sub.color)
                            } text-white flex items-center justify-center rounded-sm mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                              <sub.icon size={20} />
                            </div>
                            <h3 className={`text-lg font-bold underline underline-offset-4 pointer-events-none ${
                                theme === 'rajasthan' ? 'text-rose-900 decoration-orange-100 group-hover:decoration-rose-500' : 'text-slate-800 decoration-slate-200 group-hover:decoration-primary'
                              }`}>{sub.name}</h3>
                            <p className="text-sm text-slate-500 mt-2 italic pointer-events-none">{sub.desc}</p>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {screen === 'SETUP' && (
                    <motion.div
                      key="setup-form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="max-w-2xl mx-auto w-full"
                    >
                      <button 
                        onClick={() => setScreen('HOME')}
                        className="flex items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors mb-8"
                      >
                        <ChevronLeft size={16} /> Back to Library
                      </button>
                      
                      <div className={`p-6 md:p-10 ${
                        theme === 'rajasthan' ? 'bg-white rounded-[2rem] border-2 border-amber-500 shadow-2xl' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="mb-8 md:mb-10 flex flex-col md:flex-row border-b border-slate-100 pb-8">
                           <div className={`w-12 h-12 md:w-14 md:h-14 ${
                             theme === 'rajasthan' ? 'bg-rose-800' : (subjects.find(s => s.name === config.subject)?.color.includes('blue') ? 'bg-primary' : subjects.find(s => s.name === config.subject)?.color)
                           } text-white flex items-center justify-center rounded-sm mx-auto md:ml-0 md:mr-6 mb-4 md:mb-0`}>
                             {(() => {
                               const SIcon = subjects.find(s => s.name === config.subject)?.icon || History;
                               return <SIcon size={28} />;
                             })()}
                           </div>
                           <div className="text-center md:text-left">
                             <h2 className="text-2xl md:text-3xl font-display text-main">{config.subject}</h2>
                             <p className="text-xs md:text-sm text-slate-500 italic">Configuration & AI Tuning</p>
                           </div>
                        </div>

                    <div className="grid gap-6 md:gap-8">
                          <div className="group">
                             <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Exam Pattern Style</label>
                             <div className="grid grid-cols-2 gap-2">
                               {(['2012-2020', '2021-Present'] as ExamPattern[]).map(p => (
                                 <button
                                   key={p}
                                   onClick={() => setConfig({ ...config, pattern: p })}
                                   className={`py-2.5 md:py-3 border text-[10px] md:text-xs font-bold transition-all ${
                                     config.pattern === p 
                                       ? 'border-primary bg-primary text-white shadow-md' 
                                       : 'border-slate-200 text-slate-500 hover:border-primary/20'
                                   }`}
                                 >
                                   {p}
                                 </button>
                               ))}
                             </div>
                          </div>

                          <div className="group">
                             <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quiz Language</label>
                             <div className="grid grid-cols-3 gap-2">
                               {(['English', 'Hindi', 'Hinglish'] as Language[]).map(lang => (
                                 <button
                                   key={lang}
                                   onClick={() => setConfig({ ...config, language: lang })}
                                   className={`py-2.5 md:py-3 border text-[10px] md:text-xs font-bold transition-all ${
                                     config.language === lang 
                                       ? 'border-primary bg-primary text-white shadow-md' 
                                       : 'border-slate-200 text-slate-500 hover:border-primary/20'
                                   }`}
                                 >
                                   {lang.toUpperCase()}
                                 </button>
                               ))}
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                            <div>
                               <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Difficulty Level</label>
                               <select 
                                 value={config.difficulty}
                                 onChange={(e) => setConfig({ ...config, difficulty: e.target.value as Difficulty })}
                                 className="w-full bg-slate-50 border border-slate-200 p-3 md:p-4 text-xs md:text-sm font-medium focus:border-primary outline-none appearance-none"
                               >
                                 <option value="Easy">EASY</option>
                                 <option value="Medium">MEDIUM</option>
                                 <option value="Hard">HARD</option>
                               </select>
                            </div>
                            <div>
                               <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Question Count</label>
                               <select 
                                 value={config.questionCount}
                                 onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
                                 className="w-full bg-slate-50 border border-slate-200 p-3 md:p-4 text-xs md:text-sm font-medium focus:border-primary outline-none appearance-none"
                               >
                                 <option value={5}>05 QUESTIONS</option>
                                 <option value={10}>10 QUESTIONS</option>
                                 <option value={15}>15 QUESTIONS</option>
                               </select>
                            </div>
                          </div>

                          <div>
                             <label className="block text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Syllabus Focus (Optional)</label>
                             <input 
                               type="text"
                               placeholder="e.g. Geography of Aravalli..."
                               value={config.topic}
                               onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                               className="w-full bg-slate-800/5 border border-slate-200 p-3 md:p-4 text-xs md:text-sm font-medium focus:border-primary outline-none text-main"
                             />
                          </div>

                          <button
                            onClick={handleStartQuiz}
                            className="bg-slate-900 text-white font-bold tracking-widest uppercase py-4 md:py-5 mt-4 hover:bg-primary transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 text-xs md:text-sm"
                          >
                            Generate Quiz <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {screen === 'RULES' && (
                    <motion.div
                      key="rules"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="max-w-xl mx-auto w-full"
                    >
                      <div className={`p-8 md:p-12 ${
                        theme === 'rajasthan' ? 'bg-white rounded-[2rem] border-2 border-amber-500 shadow-2xl shadow-amber-900/10' : 'bg-white border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-4 mb-8">
                           <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                              <Info size={24} />
                           </div>
                           <div>
                              <h2 className="text-2xl font-display font-bold text-main italic">Pre-Exam <span className="text-primary">Protocols</span></h2>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">RPSC AI Compliance v2.4</p>
                           </div>
                        </div>

                        <div className="space-y-6 mb-10">
                           {[
                             { icon: Timer, text: "The session is strictly timed. Auto-submit on expiry." },
                             { icon: Star, text: "Focus entirely on the screen. Do not switch tabs." },
                             { icon: BookOpen, text: "Instant AI feedback is available after selecting answers." },
                             { icon: ShieldCheck, text: "Questions are generated based on RPSC official syllabus." }
                           ].map((rule, i) => (
                             <div key={i} className="flex gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:shadow-md transition-all">
                                <rule.icon size={20} className="text-slate-400 shrink-0 group-hover:text-primary transition-colors" />
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">{rule.text}</p>
                             </div>
                           ))}
                        </div>

                        <label className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl cursor-pointer hover:bg-primary/10 transition-colors mb-8">
                           <input 
                             type="checkbox" 
                             className="w-5 h-5 rounded border-primary text-primary focus:ring-primary shadow-sm"
                             onChange={(e) => setRulesAccepted(e.target.checked)}
                           />
                           <span className="text-xs font-bold text-slate-700">I have read and understood the examination protocols.</span>
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                           <button 
                             onClick={() => setScreen('SETUP')}
                             className="py-4 border border-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
                           >
                              Back
                           </button>
                           <button 
                             disabled={!rulesAccepted}
                             onClick={confirmStartQuiz}
                             className="py-4 bg-primary text-white rounded-xl font-bold uppercase text-[10px] tracking-widest disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-primary/20 hover:brightness-110 flex items-center justify-center gap-2 active:scale-95"
                           >
                              Proceed to Exam <ChevronRight size={14} />
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {screen === 'QUIZ' && (
                    <motion.div
                      key="quiz-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="max-w-2xl mx-auto w-full flex flex-col justify-center min-h-full"
                    >
                      {loading ? (
                        <div className="flex flex-col items-center py-20 text-center">
                          <Loader2 size={48} className="text-primary animate-spin mb-6" />
                          <h3 className="text-2xl font-display text-main italic">Assembling MCQs...</h3>
                          <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest font-bold">Matching Exam Patterns</p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-8 relative">
                            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-sm uppercase tracking-widest">
                               {isReviewMode ? 'Mistake Notebook' : `${config.subject} • ${config.difficulty}`}
                            </span>
                            
                            <AnimatePresence>
                              {consecutiveCorrect >= 3 && (
                                <motion.span 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="ml-4 text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-1 inline-flex"
                                >
                                  <Zap size={10} /> AI: Leveling Up Challenge
                                </motion.span>
                              )}
                            </AnimatePresence>
                            <h2 className="text-base md:text-lg font-semibold tracking-tight mt-3 md:mt-4 leading-relaxed text-slate-800">
                               {questions[currentIndex]?.question}
                            </h2>
                          </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {questions[currentIndex] && Object.entries(questions[currentIndex].options).map(([key, value]) => {
                    const isCorrect = key === questions[currentIndex].correctAnswer;
                    const isSelected = key === userAnswers[currentIndex];
                    
                    let btnClass = "border-slate-200 bg-white hover:border-primary shadow-sm hover:shadow-md";
                    let circleClass = "border-slate-200 text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary";

                    if (isAnswered) {
                      if (isCorrect) {
                        btnClass = "border-primary bg-primary/5 shadow-lg pointer-events-none ring-2 ring-primary/20";
                        circleClass = "bg-primary text-white border-primary scale-110";
                      } else if (isSelected) {
                        btnClass = "border-red-400 bg-red-50/50 pointer-events-none";
                        circleClass = "bg-red-500 text-white border-red-500";
                      } else {
                        btnClass = "opacity-40 grayscale pointer-events-none border-slate-100 bg-white shadow-none";
                      }
                    }

                    return (
                      <motion.button
                        key={key}
                        whileHover={!isAnswered ? { y: -4, scale: 1.01 } : {}}
                        whileTap={!isAnswered ? { scale: 0.98 } : {}}
                        onClick={() => handleSelectAnswer(key)}
                        className={`flex items-center gap-5 p-5 md:p-6 border transition-all text-left group relative min-h-[80px] ${
                          theme === 'rajasthan' ? 'rounded-3xl' : 'rounded-2xl'
                        } ${btnClass}`}
                      >
                        <span className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-all ${circleClass}`}>
                          {key}
                        </span>
                        <span className={`text-base md:text-lg flex-1 leading-tight ${isSelected && !isAnswered ? 'font-bold' : 'font-medium'}`}>{value}</span>
                        {isAnswered && isCorrect && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute right-5"
                          >
                            <CheckCircle2 className="text-primary" size={24} />
                          </motion.div>
                        )}
                        {isAnswered && isSelected && !isCorrect && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute right-5"
                          >
                            <XCircle className="text-red-500" size={24} />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-12 border-t border-slate-200 pt-8 pb-4 md:pb-0 hidden md:flex">
                  <div className="flex gap-4">
                    <button 
                      onClick={prevQuestion}
                      disabled={currentIndex === 0}
                      className="touch-target text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 flex items-center gap-1 disabled:opacity-20 transition-all"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    {!isAnswered && (
                      <button 
                        onClick={skipQuestion}
                        className="touch-target text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all"
                      >
                        Skip Question
                      </button>
                    )}
                  </div>
                  <div className="flex gap-4">
                     {isAnswered && questions[currentIndex]?.question.toLowerCase().includes('ganga') && (
                        <button 
                          onClick={() => {
                            feedback('click');
                            setIsMapOpen(true);
                          }}
                          className="px-6 bg-white border border-primary/30 text-primary font-bold rounded shadow-sm transition-all uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-primary/5 h-[44px]"
                        >
                          <MapIcon size={14} /> Explore Map
                        </button>
                      )}
                     <button 
                       onClick={nextQuestion}
                       className={`touch-target px-8 text-white font-bold rounded shadow-lg transition-all uppercase text-[11px] tracking-widest flex items-center gap-2 ${
                         isAnswered ? 'bg-primary shadow-primary/20 brightness-110' : 'bg-slate-400 opacity-60'
                       }`}
                     >
                       {currentIndex === questions.length - 1 ? 'Finish Exam' : (isAnswered ? 'Save & Next' : 'Select Answer')} <ChevronRight size={18} />
                     </button>
                  </div>
                </div>

                {/* Mobile Sticky Bottom Nav for Quiz */}
                <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 glass rounded-3xl p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                   <div className="flex flex-col pl-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Question</span>
                      <span className="text-sm font-bold text-main italic">Q{currentIndex + 1}/{questions.length}</span>
                   </div>
                   
                    <div className="flex gap-3">
                      <button 
                        onClick={prevQuestion}
                        disabled={currentIndex === 0}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 disabled:opacity-20 active:scale-95 transition-all shadow-sm"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      {isAnswered && questions[currentIndex]?.question.toLowerCase().includes('ganga') && (
                         <button 
                           onClick={() => {
                             feedback('click');
                             setIsMapOpen(true);
                           }}
                           className="w-10 h-10 flex items-center justify-center bg-white border border-primary/30 rounded-2xl text-primary active:scale-95 transition-all shadow-sm"
                         >
                           <Compass size={20} />
                         </button>
                       )}
                      {!isAnswered && (
                        <button 
                          onClick={skipQuestion}
                          className="px-4 h-10 bg-white border border-slate-200 text-slate-400 font-bold rounded-2xl active:scale-95 transition-all text-[10px] uppercase tracking-widest"
                        >
                          Skip
                        </button>
                      )}
                      <button 
                        onClick={nextQuestion}
                        className={`px-6 h-10 text-white font-bold rounded-2xl shadow-lg flex items-center gap-2 active:scale-95 transition-all text-[10px] uppercase tracking-widest ${
                          isAnswered ? 'bg-primary' : 'bg-slate-400 opacity-60'
                        }`}
                      >
                        {currentIndex === questions.length - 1 ? 'Finish' : (isAnswered ? 'Save' : 'Next')}
                        <ChevronRight size={16} />
                      </button>
                   </div>
                </div>

                          {isAnswered && questions[currentIndex] && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-8 space-y-4"
                            >
                              {/* Guruji's Insight Section */}
                              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 shadow-sm rounded-r-2xl">
                                <div className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                  <BrainCircuit size={14} /> Guruji's Smart Tip (Guru-Mantra)
                                </div>
                                <p className="text-sm md:text-base text-slate-800 leading-relaxed font-bold italic mb-3">
                                  {questions[currentIndex].teacherInsight}
                                </p>
                                {questions[currentIndex].patternYear && (
                                  <span className="inline-block px-2 py-1 bg-amber-200/50 text-amber-800 text-[9px] font-bold rounded uppercase tracking-tighter">
                                    Pattern Context: {questions[currentIndex].patternYear} RPSC Style
                                  </span>
                                )}
                              </div>

                              {/* Why Other Options are Wrong */}
                              {questions[currentIndex].wrongOptionsAnalysis && (
                                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                                  <div className="text-[10px] text-red-600 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <RotateCcw size={14} /> विकल्प विश्लेषण (Option Analysis)
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(['A', 'B', 'C', 'D'] as const).map(key => (
                                      <div key={key} className={`p-3 rounded-xl border flex items-start gap-3 ${key === questions[currentIndex].correctAnswer ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                                        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${key === questions[currentIndex].correctAnswer ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                          {key}
                                        </span>
                                        <span className="text-xs text-slate-600 italic">
                                          {(questions[currentIndex].wrongOptionsAnalysis as any)[key]}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Standard Tech Explanation */}
                              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                                <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                                  <Info size={12} /> Standard Facts
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                  {questions[currentIndex].explanation}
                                </p>
                              </div>

                              {/* Extra Facts */}
                              {questions[currentIndex].extraFacts && (questions[currentIndex].extraFacts || []).length > 0 && (
                                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl shadow-sm">
                                  <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <BookOpen size={14} /> अतिरिक्त परीक्षा तथ्य (Extra Facts)
                                  </div>
                                  <ul className="space-y-2">
                                    {(questions[currentIndex].extraFacts || []).map((fact, i) => (
                                      <li key={i} className="text-xs md:text-sm text-slate-700 flex items-start gap-3">
                                        <CheckCircle2 size={12} className="text-indigo-400 mt-1 shrink-0" />
                                        <span>{fact}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Youtube Video Player */}
                              {questions[currentIndex].videoUrl && (
                                <div className="space-y-4">
                                  <div className="text-[10px] text-red-600 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={14} className="fill-red-500 animate-pulse" /> Concept Deep-Dive (Hindi)
                                  </div>
                                  <div className="relative aspect-video w-full overflow-hidden rounded-3xl shadow-xl bg-slate-900 border-4 border-white">
                                    <iframe 
                                      className="absolute inset-0 w-full h-full"
                                      src={`https://www.youtube.com/embed/${
                                        questions[currentIndex].videoUrl.includes('v=') 
                                          ? questions[currentIndex].videoUrl.split('v=')[1]?.split('&')[0] 
                                          : questions[currentIndex].videoUrl.includes('youtu.be/')
                                            ? questions[currentIndex].videoUrl.split('youtu.be/')[1]?.split('?')[0]
                                            : questions[currentIndex].videoUrl
                                      }?hl=hi&cc_lang_pref=hi&cc_load_policy=1&modestbranding=1&rel=0`}
                                      title="YouTube video player"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                      allowFullScreen
                                    ></iframe>
                                  </div>
                                  <div className="flex items-center justify-between px-2">
                                    <p className="text-[10px] text-slate-400 font-medium italic">
                                      * Video content curated for RPSC/Current Affairs preparation.
                                    </p>
                                    <a 
                                      href={`https://www.youtube.com/watch?v=${
                                        questions[currentIndex].videoUrl.includes('v=') 
                                          ? questions[currentIndex].videoUrl.split('v=')[1]?.split('&')[0] 
                                          : questions[currentIndex].videoUrl
                                      }`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter"
                                    >
                                      Open in App
                                    </a>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  {screen === 'RESULTS' && (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="max-w-4xl mx-auto w-full"
                    >
                      <div className="text-center mb-10">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30"
                        >
                          <Trophy size={48} />
                        </motion.div>
                        <h2 className="text-4xl font-display font-bold italic text-main tracking-tight">Session <span className="text-primary">Completed!</span></h2>
                        <p className="text-slate-500 mt-2 uppercase tracking-[0.3em] text-[10px] font-bold">Deep Performance Analysis Ready</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                        <div className={`p-6 shadow-sm border ${
                          theme === 'rajasthan' ? 'bg-white rounded-3xl border-amber-500' : 'bg-white border-slate-200'
                        }`}>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Accuracy dashboard</h4>
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold font-mono text-slate-900">{getScore()}/{questions.length}</div>
                            <div className="h-10 w-px bg-slate-100 mx-2"></div>
                            <div className="flex-1">
                               <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${(getScore() / questions.length) * 100}%` }}
                                   className="h-full bg-primary"
                                 />
                               </div>
                               <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">{Math.round((getScore() / questions.length) * 100)}% Match rate</p>
                            </div>
                          </div>
                        </div>

                        <div className={`p-6 shadow-sm border ${
                          theme === 'rajasthan' ? 'bg-white rounded-3xl border-teal-600' : 'bg-white border-slate-200'
                        }`}>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Detailed Performance</h4>
                          <div className="grid grid-cols-3 gap-2">
                             <div className="text-center">
                                <p className="text-lg font-bold text-green-600">{getScore()}</p>
                                <p className="text-[8px] uppercase font-bold text-slate-400">Correct</p>
                             </div>
                             <div className="text-center">
                                <p className="text-lg font-bold text-red-500">{getIncorrectCount()}</p>
                                <p className="text-[8px] uppercase font-bold text-slate-400">Wrong</p>
                             </div>
                             <div className="text-center">
                                <p className="text-lg font-bold text-slate-400">{getSkippedCount()}</p>
                                <p className="text-[8px] uppercase font-bold text-slate-400">Skipped</p>
                             </div>
                          </div>
                        </div>

                        <div className={`p-6 shadow-sm border ${
                          theme === 'rajasthan' ? 'bg-white rounded-3xl border-teal-600' : 'bg-white border-slate-200'
                        }`}>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Vitals & Pace</h4>
                          <div className="flex items-center gap-4">
                             <Timer className="text-slate-300" size={24} />
                             <div>
                                <span className="text-2xl font-mono font-bold text-main">{formatTime(quizTimer)}</span>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Total Duration</p>
                             </div>
                          </div>
                        </div>

                        <div className={`p-6 shadow-sm border md:col-span-2 lg:col-span-1 ${
                          theme === 'rajasthan' ? 'bg-white rounded-3xl border-orange-500' : 'bg-white border-slate-200'
                        }`}>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Study Insight</h4>
                          <div className="flex items-start gap-3">
                            <Zap size={16} className="text-accent shrink-0" />
                            <p className="text-xs text-slate-500 italic leading-relaxed">
                              Focus on <span className="text-main font-bold">"{config.subject}"</span>. Your response time was optimal, but consistency peaked in the first half.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Summary Card */}
                        <div className={`p-6 md:p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[280px] md:h-80 shadow-2xl ${
                          theme === 'rajasthan' ? 'bg-gradient-to-br from-rose-800 to-rose-950 rounded-[2rem]' : 'bg-brand-bg rounded-2xl'
                        }`}>
                           <div className="relative z-10">
                             <h4 className="text-[10px] font-bold opacity-60 uppercase tracking-[0.3em] mb-2">Examination Score</h4>
                             <p className="text-5xl md:text-7xl font-mono font-bold italic tracking-tighter">{getScore()} <span className="text-xl md:text-2xl opacity-40 font-serif not-italic">/ {questions.length}</span></p>
                           </div>
                           
                           <div className="relative z-10">
                              <div className="flex -space-x-2 mb-4">
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="w-8 h-8 rounded-full border-2 border-brand-bg bg-primary flex items-center justify-center text-[10px] font-bold">#{i}</div>
                                ))}
                                <div className="w-8 h-8 rounded-full border-2 border-brand-bg bg-slate-800 flex items-center justify-center text-[10px] font-bold hidden xs:flex">+RPSC</div>
                              </div>
                              <p className="text-xs md:text-sm font-light leading-relaxed text-slate-300 italic">You outperformed <span className="text-white font-bold">82% of peers</span> in the {config.difficulty} module.</p>
                           </div>

                           <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
                        </div>

                        {/* Analysis Card */}
                        <div className={`p-8 flex flex-col shadow-sm border ${
                          theme === 'rajasthan' ? 'bg-white rounded-[2rem] border-amber-500' : 'bg-white border-slate-200 rounded-2xl'
                        }`}>
                           <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2 flex items-center gap-2">
                             <Activity size={14} /> Subject Vitals
                           </h3>
                           <div className="space-y-6 flex-1">
                             <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                   <div className="w-1.5 h-1.5 rounded-full bg-accent group-hover:scale-150 transition-transform"></div>
                                   <span className="text-sm font-bold text-slate-700">MCQ Accuracy</span>
                                </div>
                                <span className="text-sm font-mono font-bold text-main">{Math.round((getScore() / questions.length) * 100)}%</span>
                             </div>
                             <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                   <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-150 transition-transform"></div>
                                   <span className="text-sm font-bold text-slate-700">Processing Pace</span>
                                </div>
                                <span className="text-sm font-mono font-bold text-main">{Math.round(quizTimer / questions.length)}s per item</span>
                             </div>
                             <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:scale-150 transition-transform"></div>
                                   <span className="text-sm font-bold text-slate-700">System Difficulty</span>
                                </div>
                                <span className="text-sm font-mono font-bold text-main italic px-2 bg-slate-100 rounded text-[10px] uppercase tracking-tighter">{config.difficulty}</span>
                             </div>
                           </div>

                           <div className="mt-8 grid grid-cols-2 gap-4">
                              <button 
                                onClick={handleStartQuiz}
                                className="touch-target bg-primary text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                              >
                                <RotateCcw size={14} /> Re-Generate
                              </button>
                              <button 
                                onClick={() => setScreen('HOME')}
                                className="touch-target bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                              >
                                Exit Session <ChevronRight size={14} />
                              </button>
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Sidebar Right: Info Panel (Only in Quiz) */}
              {screen === 'QUIZ' && !loading && (
                <aside className="hidden xl:flex w-80 bg-white border-l border-slate-200 p-8 flex flex-col gap-8 shrink-0">
                  <div className="p-6 bg-brand-bg text-white rounded overflow-hidden relative group">
                     <div className="relative z-10">
                       <h4 className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Session Score</h4>
                       <p className="text-4xl font-mono font-bold italic">{getScore()} <span className="text-lg opacity-40 font-serif not-italic">pts</span></p>
                       <div className="mt-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-primary transition-all duration-700" style={{ width: `${(getScore() / questions.length) * 100}%` }}></div>
                       </div>
                     </div>
                     <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-primary rounded-full opacity-30 group-hover:scale-125 transition-transform duration-700"></div>
                   </div>

                   <div>
                     <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Topic Metrics</h3>
                     <div className="space-y-4">
                        <div className="space-y-1.5">
                           <div className="flex items-center justify-between text-xs">
                             <span className="text-slate-500 font-medium">{config.subject} Concepts</span>
                             <span className="font-bold text-slate-900">{Math.round((currentIndex / questions.length) * 100)}% Coverage</span>
                           </div>
                           <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${(currentIndex / questions.length) * 100}%` }}></div>
                           </div>
                        </div>
                     </div>
                   </div>

                   <div className="mt-auto">
                     <div className="p-5 border border-primary/10 bg-primary/5 rounded italic relative overflow-hidden">
                        <div className="w-1 h-full bg-primary absolute left-0 top-0"></div>
                        <p className="text-[9px] text-primary font-bold uppercase mb-2 flex items-center gap-1"><Zap size={10} /> AI Recommendation</p>
                        <p className="text-xs text-primary/80 leading-snug font-medium">
                          "Maintain your pace. High accuracy in early questions suggests you can transition to more complex topics."
                        </p>
                     </div>
                   </div>
                </aside>
              )}
            </main>

            {/* Footer Bar */}
            <footer className="h-10 bg-brand-bg text-slate-500 text-[10px] uppercase tracking-[0.2em] flex items-center justify-between px-4 md:px-8 shrink-0">
              <span className="flex items-center gap-2">AI Engine <span className="hidden xs:inline">v2.4</span> <span className="opacity-30">|</span> <span className="text-primary italic font-bold">RPSC Optimized</span></span>
              <div className="flex gap-6 items-center">
                <span className="hidden md:inline">ClickCraft v1.0 <span className="opacity-30">|</span> Session ID: AIQ-2024-{quizTimer}</span>
                <span className="flex items-center gap-1.5 text-primary"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div> <ShieldCheck size={12} /> <span className="hidden xs:inline">Secure Portal</span></span>
              </div>
            </footer>

            <AnimatePresence>
              {isMapOpen && (
                <RiverMap onClose={() => setIsMapOpen(false)} feedback={feedback} />
              )}
            </AnimatePresence>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
