import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldAlert, Key, Database, X } from 'lucide-react';
import { testConnection } from '../lib/firebase';

interface SystemStatusBarProps {
  onClose: () => void;
}

export default function SystemStatusBar({ onClose }: SystemStatusBarProps) {
  const [stats, setStats] = useState<{ count: number; lastUsed?: any } | null>(null);
  const [dbStatus, setDbStatus] = useState<'Checking' | 'Connected' | 'Error'>('Checking');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      // Check Firebase
      const connected = await testConnection();
      setDbStatus(connected ? 'Connected' : 'Error');

      // Check API Usage
      try {
        const res = await fetch('/api/system/usage');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch usage stats:", err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 left-4 right-4 bg-slate-900 border border-slate-700 text-white p-4 rounded-2xl shadow-2xl z-[100] flex flex-col gap-4 md:flex-row md:items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary/20 text-primary rounded-lg">
          <Activity size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest leading-none">System Dashboard</h4>
          <p className="text-[10px] text-slate-400 mt-1">Internal monitor for quiz engine and backend services</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:flex gap-6">
        <div className="flex items-center gap-2">
          <Database size={16} className={dbStatus === 'Connected' ? 'text-green-500' : 'text-red-500'} />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-slate-500">Firebase Status</span>
            <span className={`text-xs font-bold ${dbStatus === 'Connected' ? 'text-green-400' : 'text-red-400'}`}>{dbStatus}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Key size={16} className="text-amber-500" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-slate-500">Gemini Usage</span>
            <span className="text-xs font-bold text-amber-400">{stats?.count || 0} API Calls</span>
          </div>
        </div>

        {dbStatus === 'Error' && (
          <div className="flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded">
            <ShieldAlert size={14} className="text-red-500" />
            <span className="text-[10px] font-bold text-red-100">Connection Issues Detected</span>
          </div>
        )}
      </div>

      <button 
        onClick={onClose}
        className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
