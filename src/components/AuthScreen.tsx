import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2, Languages, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';
import { useFeedback } from '../hooks/useFeedback';

interface AuthScreenProps {
  onSuccess: (user: User) => void;
  onBack: () => void;
}

export default function AuthScreen({ onSuccess, onBack }: AuthScreenProps) {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const { feedback } = useFeedback();

  const content = {
    EN: {
      loginTitle: "Welcome Back",
      signupTitle: "Create your account",
      nameLabel: "Full Name",
      emailLabel: "Email Address",
      passLabel: "Password",
      loginBtn: "Sign In",
      signupBtn: "Sign Up",
      switchSignup: "Don't have an account? Sign Up",
      switchLogin: "Already have an account? Sign In",
      passHint: "Use at least 8 characters including a number",
      back: "Back"
    },
    HI: {
      loginTitle: "आपका स्वागत है",
      signupTitle: "अपना खाता बनाएं",
      nameLabel: "पूरा नाम",
      emailLabel: "ईमेल",
      passLabel: "पासवर्ड",
      loginBtn: "साइन इन करें",
      signupBtn: "साइन अप",
      switchSignup: "खाता नहीं है? साइन अप करें",
      switchLogin: "पहले से खाता है? साइन इन करें",
      passHint: "कम से कम 8 अक्षर सहित एक अंक शामिल करें",
      back: "पीछे"
    }
  };

  const curr = content[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    feedback('click');
    setLoading(true);
    try {
      let user;
      if (mode === 'SIGNUP') {
        user = await authService.signup(formData.name, formData.email, formData.password);
      } else {
        user = await authService.login(formData.email, formData.password);
      }
      feedback('success');
      onSuccess(user);
    } catch (err: any) {
      feedback('wrong');
      alert(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-page flex flex-col p-6 items-center justify-center relative overflow-hidden">
      {/* Background Decor (Geometric Balance Style) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[150px]" />
      </div>

      {/* Mobile Top Nav */}
      <div className="absolute top-4 sm:top-8 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between z-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold uppercase text-[10px] sm:text-xs tracking-widest"
        >
          <ArrowLeft size={16} /> <span className="hidden xs:inline">{curr.back}</span>
        </button>

        <button 
          onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')}
          className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-full hover:border-primary transition-all text-[10px] sm:text-xs font-bold text-main"
        >
          <Languages size={14} /> {lang === 'EN' ? 'हिंदी' : 'EN'}
        </button>
      </div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-10 shadow-2xl relative z-10 mt-12 sm:mt-0"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display italic text-main mb-2">
            {mode === 'LOGIN' ? curr.loginTitle : curr.signupTitle}
          </h2>
          <div className="h-1 w-12 bg-primary mx-auto"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {mode === 'SIGNUP' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{curr.nameLabel}</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    required
                    type="text"
                    placeholder="Enter your name"
                    className="w-full bg-white/5 border border-white/10 p-4 pl-12 text-sm outline-none focus:border-primary transition-colors text-main"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{curr.emailLabel}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                required
                type="email"
                placeholder="email@example.com"
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 text-sm outline-none focus:border-primary transition-colors text-main"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{curr.passLabel}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                required
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 pr-12 text-sm outline-none focus:border-primary transition-colors text-main"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic font-light">{curr.passHint}</p>
          </div>

          <button
            disabled={loading}
            className="w-full bg-slate-900 border border-white/10 text-white font-bold tracking-[0.2em] uppercase py-4 hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-xl"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'LOGIN' ? curr.loginBtn : curr.signupBtn)}
          </button>
        </form>

        <button 
          onClick={() => setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
          className="w-full mt-8 text-center text-[10px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-[0.2em]"
        >
          {mode === 'LOGIN' ? curr.switchSignup : curr.switchLogin}
        </button>
      </motion.div>
    </div>
  );
}
