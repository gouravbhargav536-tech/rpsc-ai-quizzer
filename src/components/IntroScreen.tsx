import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, ChevronRight, Languages } from 'lucide-react';
import { useFeedback } from '../hooks/useFeedback';

interface IntroScreenProps {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: IntroScreenProps) {
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const { feedback } = useFeedback();

  const handleStart = () => {
    feedback('click');
    onStart();
  };

  const toggleLang = () => {
    feedback('click');
    setLang(lang === 'EN' ? 'HI' : 'EN');
  };

  const content = {
    EN: {
      heading: "Welcome to RPSC AI MCQ Master",
      subheading: "Your Smart Study Partner",
      body: "Practice, test, and improve your score with AI-generated quizzes tailored for RPSC exams. Study anytime, anywhere with personalized feedback.",
      button: "Get Started",
      footer: "Powered by ClickCraft"
    },
    HI: {
      heading: "RPSC AI MCQ मास्टर में आपका स्वागत है",
      subheading: "आपकी तैयारी का स्मार्ट साथी",
      body: "राजस्थान लोक सेवा आयोग (RPSC) की परीक्षाओं के लिए AI-संचालित क्विज़ के साथ अभ्यास करें। अपनी प्रगति को ट्रैक करें और व्यक्तिगत प्रतिक्रिया के साथ अपनी तैयारी को बेहतर बनाएं।",
      button: "शुरू करें",
      footer: "Powered by ClickCraft"
    }
  };

  const curr = content[lang];

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-main text-center relative overflow-hidden">
      {/* Background Decor (Geometric Balance Style) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-accent/20 rounded-full blur-[100px]" />
        
        {/* Subtle geometric lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-white/5 -rotate-12"></div>
        <div className="absolute top-3/4 left-0 w-full h-px bg-white/5 rotate-6"></div>
      </div>

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="z-10 flex flex-col items-center max-w-2xl"
      >
        <button 
          onClick={toggleLang}
          className="mb-8 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest"
        >
          <Languages size={14} />
          {lang === 'EN' ? 'हिंदी में बदलें' : 'Switch to English'}
        </button>

        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="w-20 h-20 bg-primary/20 border-2 border-primary/40 rounded-2xl flex items-center justify-center shadow-2xl mb-8 rotate-45"
        >
          <div className="-rotate-45">
            <BrainCircuit size={40} className="text-primary" />
          </div>
        </motion.div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2 font-display px-2">
          {curr.heading}
        </h1>
        <p className="text-lg md:text-xl text-primary font-display italic mb-6">
          {curr.subheading}
        </p>
        
        <p className="text-base md:text-lg text-slate-400 mb-8 md:mb-10 leading-relaxed font-light px-4">
          {curr.body}
        </p>

        <button
          onClick={handleStart}
          className="px-10 py-5 bg-primary text-white rounded-sm font-bold text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 group"
        >
          {curr.button} <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>


      <footer className="absolute bottom-8 left-0 w-full text-center text-slate-500 text-sm italic">
        {curr.footer}
      </footer>
    </div>
  );
}
