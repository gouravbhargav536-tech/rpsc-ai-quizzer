import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, MapPin, Waves, Mountain, Building2, Droplets, Info, 
  Play, Pause, RotateCcw, Volume2, VolumeX, History, 
  ChevronRight, ArrowLeft 
} from 'lucide-react';

// Animation logic moved to custom HTML icons
const createCustomIcon = (isSelected: boolean, type: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-10 h-10 bg-primary/20 rounded-full animate-ping ${isSelected ? 'opacity-100' : 'opacity-0'}"></div>
        <div class="relative w-8 h-8 ${isSelected ? 'bg-primary scale-125' : 'bg-white'} border-2 border-primary rounded-xl shadow-lg flex items-center justify-center transition-all duration-500">
          <div class="w-1.5 h-1.5 bg-primary rounded-full ${isSelected ? 'bg-white' : ''}"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface RiverMapProps {
  onClose: () => void;
  feedback: (type: 'click' | 'success' | 'error' | 'correct' | 'wrong' | 'win' | 'lose') => void;
}

const GANGA_PATH: [number, number][] = [
  [30.9947, 78.9398], // Gangotri
  [30.1456, 78.5989], // Devaprayag
  [30.1083, 78.2972], // Rishikesh
  [29.9457, 78.1642], // Haridwar
  [26.4499, 80.3319], // Kanpur
  [25.4358, 81.8464], // Prayagraj
  [25.3217, 82.9873], // Varanasi
  [25.6127, 85.1589], // Patna
  [24.8044, 87.9331], // Farakka
  [22.57, 88.36],     // Kolkata
];

const MILESTONES = [
  { year: '2500 BCE', label: 'Indus-Ganga Foundations', desc: 'Early civilizations began to settle along the fertile floodplains.' },
  { year: '322 BCE', label: 'Mauryan Unification', desc: 'Empire unification linked the entire basin as a political entity.' },
  { year: '1600s', label: 'Mughal Cultural Bloom', desc: 'Vibrant riverside cities and architecture flourished along the banks.' },
  { year: '1975', label: 'Farakka Operational', desc: 'Major engineering feat to regulate flow and flush silt for Kolkata port.' },
  { year: '2014', label: 'Namami Gange Launch', desc: 'India launched a massive $5B mission to clean and protect the river.' },
  { year: '2022', label: 'UN Restoration Award', desc: 'Ganga recognized among Top 10 global restoration flagships.' }
];

const HOTSPOTS = [
  {
    name: 'Gaumukh (Origin)',
    pos: [30.9947, 78.9398],
    type: 'Source',
    icon: Mountain,
    desc: 'The primary source of the Ganges, located in the Uttarkashi district.',
    narration: 'Here at Gaumukh, the Bhagirathi emerges from the Gangotri Glacier, the sacred source of the Ganges at 13,200 feet.',
    fact: 'The glacier is melting at about 22 meters per year due to climate change.'
  },
  {
    name: 'Tehri Dam',
    pos: [30.3787, 78.4795],
    type: 'Engineering',
    icon: Droplets,
    desc: 'One of the tallest dams in the world at 260.5 meters high.',
    narration: 'The Tehri Dam is a massive rockfill dam generating 2400 Megawatts of power, essential for northern India\'s energy grid.',
    fact: 'It involved relocating the entire historic Tehri town to New Tehri.'
  },
  {
    name: 'Haridwar',
    pos: [29.9457, 78.1642],
    type: 'Cultural Hub',
    icon: Building2,
    desc: 'The "Gateway to Gods" where the river leaves the Himalayas for the plains.',
    narration: 'Haridwar marks where Ganga enters the plains. It is a major pilgrimage city with ancient ritual traditions like the Ganga Aarti.',
    fact: 'The river is considered so sacred here that millions gather for the Kumbh Mela.'
  },
  {
    name: 'Prayagraj (Sangam)',
    pos: [25.4358, 81.8464],
    type: 'Confluence',
    icon: Droplets,
    desc: 'The meeting point of Ganga, Yamuna, and the mythical Saraswati.',
    narration: 'At Prayagraj, the Ganges meets the Yamuna at the Triveni Sangam, a holy confluence site for the world\'s largest human gathering.',
    fact: 'The Kumbh Mela here is recognized by UNESCO as Intangible Cultural Heritage.'
  },
  {
    name: 'Varanasi',
    pos: [25.3217, 82.9873],
    type: 'Heritage City',
    icon: Building2,
    desc: 'One of the oldest living cities in the world, famous for its 84 ghats.',
    narration: 'Varanasi is among the most ancient cities, where the riverfront features 84 ritual ghats that have stood for centuries.',
    fact: 'The city has been a center for learning, spirituality, and culture for over 3,000 years.'
  },
  {
    name: 'Farakka Barrage',
    pos: [24.8044, 87.9331],
    type: 'Barrage',
    icon: Waves,
    desc: 'Major diversion project near the border with Bangladesh.',
    narration: 'The Farakka Barrage regulates flow to the Hooghly river, ensuring Kolkata port remains navigable year-round.',
    fact: 'Operational since 1975, it covers a total span of about 2.2 kilometers.'
  }
];

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);
  return null;
}

function MapCenterer({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) {
      map.flyTo(pos, 8, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [pos, map]);
  return null;
}

export default function RiverMap({ onClose, feedback }: RiverMapProps) {
  const [selectedSpot, setSelectedSpot] = useState<typeof HOTSPOTS[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [yearIndex, setYearIndex] = useState(MILESTONES.length - 1);
  const [isNarrationOn, setIsNarrationOn] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback((text: string) => {
    if (!isNarrationOn || isMuted) return;
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = playbackSpeed;
    utter.onstart = () => setIsPlaying(true);
    utter.onend = () => setIsPlaying(false);
    utter.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utter);
  }, [isNarrationOn, playbackSpeed, isMuted, stopSpeaking]);

  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleSpotClick = (spot: typeof HOTSPOTS[0]) => {
    feedback('click');
    setSelectedSpot(spot);
    speak(spot.narration);
    
    // Smooth scroll sidebar to top to show info
    if (sidebarRef.current) {
      sidebarRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePlayPause = () => {
    feedback('click');
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else if (selectedSpot) {
      speak(selectedSpot.narration);
    } else {
      // If no spot selected, start from origin
      setSelectedSpot(HOTSPOTS[0]);
      speak(HOTSPOTS[0].narration);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-900 overflow-hidden"
    >
      {/* Premium Header */}
      <div className="h-16 px-4 md:px-6 bg-white border-b border-slate-200 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Waves size={24} className={isPlaying ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h2 className="text-sm md:text-lg font-display font-bold text-slate-800">The Holy Ganga Exploration</h2>
            <p className="text-[8px] md:text-[10px] uppercase tracking-widest font-bold text-slate-400">Integrated Course Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => {
              feedback('click');
              setIsMuted(!isMuted);
              if (!isMuted) stopSpeaking();
            }}
            className={`p-2 rounded-lg transition-colors ${!isMuted ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}
          >
            {!isMuted ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button 
            onClick={() => {
              feedback('click');
              onClose();
            }}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-[9px] md:text-[10px] uppercase tracking-widest text-slate-600 transition-all active:scale-95"
          >
            <ArrowLeft size={14} className="md:size-4" /> <span className="hidden xs:inline">Back to Quiz</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Map Container */}
        <div className="flex-1 relative order-2 lg:order-1 min-h-[300px]">
          <MapContainer 
            center={[25.5, 83]} 
            zoom={6} 
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapResizer />
            <MapCenterer pos={selectedSpot ? (selectedSpot.pos as [number, number]) : null} />

            {/* Animated Flow Line */}
            <Polyline 
              pathOptions={{ 
                color: '#3b82f6', 
                weight: 6, 
                opacity: 0.8,
                dashArray: '12, 12',
                className: isPlaying ? 'animate-river-flow' : '' 
              }} 
              positions={GANGA_PATH} 
            />

            {/* Hotpot Markers */}
            {HOTSPOTS.map((spot, i) => (
              <Marker 
                key={i} 
                position={spot.pos as L.LatLngExpression}
                icon={createCustomIcon(selectedSpot?.name === spot.name, spot.type)}
                eventHandlers={{
                  click: () => handleSpotClick(spot)
                }}
              >
                <Popup closeButton={false}>
                  <div className="p-2 min-w-[140px] text-center">
                    <p className="font-bold text-slate-800 m-0 text-sm">{spot.name}</p>
                    <p className="text-[9px] text-primary font-bold m-0 uppercase tracking-tighter mb-2">{spot.type}</p>
                    <button 
                      onClick={() => speak(spot.narration)}
                      className="w-full py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <Volume2 size={12} /> Play Audio
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar Panel */}
        <div 
          ref={sidebarRef}
          className="w-full lg:w-96 bg-white border-b lg:border-b-0 lg:border-l border-slate-200 z-10 overflow-y-auto order-1 lg:order-2 shrink-0 scroll-smooth"
        >
          <div className="p-6 h-full flex flex-col">
            
            <div className="flex-1">
              <AnimatePresence mode="wait">
                {selectedSpot ? (
                  <motion.div 
                    key={selectedSpot.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-slate-100">
                            <selectedSpot.icon size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] leading-none mb-1">{selectedSpot.type}</p>
                            <h3 className="text-lg md:text-xl font-display font-bold text-slate-800 leading-tight">{selectedSpot.name}</h3>
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 leading-relaxed font-medium mb-6">
                          {selectedSpot.desc}
                        </p>

                        <div className="space-y-4">
                          <div className="flex items-start gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100">
                             <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                               <Info size={16} />
                             </div>
                             <div>
                               <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-1">Expert Insight</span>
                               <p className="text-xs text-slate-600 leading-relaxed italic">
                                 {selectedSpot.fact}
                               </p>
                             </div>
                          </div>
                          <button 
                            onClick={() => {
                              feedback('click');
                              speak(selectedSpot.narration);
                            }}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                          >
                             <Volume2 size={16} /> Hear the History
                          </button>
                        </div>
                      </div>
                      <Waves className="absolute -right-12 -bottom-12 text-primary/5 group-hover:scale-110 transition-transform duration-1000" size={180} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                       <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                          <Droplets className="text-indigo-400 mb-2" size={16} />
                          <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Ecology</p>
                          <p className="text-xs font-bold text-indigo-900 leading-tight">Dolphin Sanctuary Site</p>
                       </div>
                       <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl">
                          <Building2 className="text-teal-400 mb-2" size={16} />
                          <p className="text-[8px] font-bold text-teal-400 uppercase tracking-widest">Heritage</p>
                          <p className="text-xs font-bold text-teal-900 leading-tight">UNESCO Intangible Site</p>
                       </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                      <MapPin size={40} />
                    </div>
                    <h3 className="text-lg md:text-xl font-display font-bold text-slate-400 italic">Trace the Flow</h3>
                    <p className="text-xs text-slate-400 mt-4 leading-relaxed italic">
                      The Ganges river is closely associated with tradition and civilization. Select a milestone on the map to begin your narrated journey.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Historical Timeline Swiper */}
            <div className="mt-8 pt-8 border-t border-slate-100">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                     <History size={18} className="text-primary" />
                     <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Ganga Era Timeline</h4>
                  </div>
                  <motion.span 
                    key={yearIndex}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full"
                  >
                    {MILESTONES[yearIndex].year}
                  </motion.span>
               </div>

               <div className="relative mb-6 px-1">
                  <input 
                    type="range" 
                    min={0} 
                    max={MILESTONES.length - 1} 
                    value={yearIndex}
                    onChange={(e) => {
                      feedback('click');
                      setYearIndex(parseInt(e.target.value));
                    }}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-2">
                     {MILESTONES.map((_, i) => (
                       <div 
                         key={i} 
                         className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i <= yearIndex ? 'bg-primary scale-125' : 'bg-slate-200'}`}
                       />
                     ))}
                  </div>
               </div>

               <AnimatePresence mode="wait">
                 <motion.div 
                   key={yearIndex}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="p-4 bg-slate-50 rounded-2xl border border-slate-100"
                 >
                    <h5 className="text-sm font-bold text-slate-800 mb-1">{MILESTONES[yearIndex].label}</h5>
                    <p className="text-[11px] text-slate-500 italic leading-relaxed">{MILESTONES[yearIndex].desc}</p>
                 </motion.div>
               </AnimatePresence>
            </div>

          </div>
        </div>
      </div>

      {/* Playback Controls Footer */}
      <div className="h-20 px-6 bg-slate-900 border-t border-white/10 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={handlePlayPause}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
          </button>
          
          <div className="hidden md:flex flex-col">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Speaker Speed</span>
            <div className="flex gap-2">
              {[0.75, 1, 1.25].map((s) => (
                <button 
                  key={s}
                  onClick={() => {
                    feedback('click');
                    setPlaybackSpeed(s);
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${playbackSpeed === s ? 'bg-primary text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 mx-4 md:mx-12 max-w-xl">
           <div className="flex items-center gap-4">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '30%' }}
                  animate={{ width: isPlaying ? '100%' : '30%' }}
                  transition={{ duration: isPlaying ? 30 : 0.5, ease: isPlaying ? 'linear' : 'easeInOut' }}
                  className="h-full bg-primary"
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline whitespace-nowrap">Auto-Narrating Course</span>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              feedback('click');
              setSelectedSpot(HOTSPOTS[0]);
              speak(HOTSPOTS[0].narration);
            }}
            className="p-3 text-white/50 hover:text-white transition-colors"
            title="Restart Journey"
          >
            <RotateCcw size={20} />
          </button>
          <div className="w-px h-8 bg-white/10 mx-2 hidden md:block"></div>
          <button 
            onClick={() => {
              feedback('success');
              onClose();
            }}
            className="px-5 md:px-7 py-3 bg-white text-slate-900 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-95 shadow-xl"
          >
            Exit Explore
          </button>
        </div>
      </div>

    </motion.div>
  );
}
