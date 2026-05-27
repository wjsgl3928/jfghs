import React, { useState, useEffect, useRef } from 'react';
import { 
  Gamepad2, Zap, Baby, History, Sparkles, Timer, Send, 
  RefreshCw, Trophy, HelpCircle, Settings, Check, Loader2, 
  Menu, X, ChevronRight, MessageSquare, AlertTriangle, Star
} from 'lucide-react';
import FloatingParticles from './components/FloatingParticles';
import RulesModal from './components/RulesModal';
import LeaderboardPanel from './components/LeaderboardPanel';
import { GameMode, WordItem, LeaderboardEntry } from './types';

// Initial preloaded mock entries that match the screen's visual state!
const DEFAULT_HISTORY: WordItem[] = [
  {
    id: '1',
    word: '사과',
    english: 'Apple',
    sender: 'ai',
    timestamp: '10:42 AM',
    definition: '붉고 달콤한 원형의 대표적인 가을 재배 과일'
  },
  {
    id: '2',
    word: '과자',
    english: 'Snack',
    sender: 'user',
    timestamp: '10:42 AM',
    definition: '밀가루나 전분 등을 반죽하여 바삭하게 만든 기호용 주전부리 식품'
  },
  {
    id: '3',
    word: '자전거',
    english: 'Bicycle',
    sender: 'ai',
    timestamp: '10:43 AM',
    definition: '사람의 힘에 의해 작동하여 바퀴를 구동시키는 이륜 육상 운송기구'
  },
  {
    id: '4',
    word: '거울',
    english: 'Mirror',
    sender: 'user',
    timestamp: '10:43 AM',
    definition: '유리에 수은을 발라 표면에 반사하는 상을 비추도록 다듬은 광학 도구'
  }
];

export default function App() {
  // Navigation & Tab active
  const [activeTab, setActiveTab] = useState<'arena' | 'leaderboard' | 'rules-tab'>('arena');
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Gameplay session variables
  const [difficulty, setDifficulty] = useState<GameMode>('normal');
  const [score, setScore] = useState<number>(1240); // Standard initial score as user wanted
  const [turn, setTurn] = useState<number>(12); // Turn 12
  const [history, setHistory] = useState<WordItem[]>(DEFAULT_HISTORY);
  const [timeRemaining, setTimeRemaining] = useState<number>(30); // 30s turn timer
  const [gameStatus, setGameStatus] = useState<'playing' | 'ended'>('playing');

  // Input control
  const [userInput, setUserInput] = useState('');
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // SCROLL ANCHOR FOR CHAT
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // LOCAL MEMORY LEADERS LIST
  const [localLeaderboard, setLocalLeaderboard] = useState<LeaderboardEntry[]>([]);

  // TIMER HANDLER
  useEffect(() => {
    if (gameStatus !== 'playing' || aiIsThinking) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameStatus('ended');
          setAlertMsg({
            text: '시간 초과! 30초 내에 연쇄 단어를 찾지 못해 게임이 종료되었습니다.',
            type: 'error'
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus, aiIsThinking, turn]); // updates on turn changes or status alterations

  // Autoscroll to bottom whenever history list updates or loading is active
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, aiIsThinking]);

  // Alert automatic fadeout
  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => {
        setAlertMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  // Restart match logic
  const handleRestart = async (selectedMode?: GameMode) => {
    const targetMode = selectedMode || difficulty;
    setDifficulty(targetMode);
    setScore(0);
    setTurn(1);
    setTimeRemaining(30);
    setGameStatus('playing');
    setUserInput('');
    setAlertMsg(null);
    setAiIsThinking(true);

    try {
      // Fetch starter word from backend!
      const resp = await fetch(`/api/game/starter-word?mode=${targetMode}`);
      if (resp.ok) {
        const data = await resp.json();
        setHistory([
          {
            id: 'starter',
            word: data.word,
            english: data.english,
            sender: 'ai',
            timestamp: data.timestamp || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            definition: data.definition
          }
        ]);
      } else {
        throw new Error('Fallback required');
      }
    } catch (err) {
      // Local fallback starter
      setHistory([
        {
          id: 'starter',
          word: targetMode === 'hard' ? '원소' : '사과',
          english: targetMode === 'hard' ? 'Element' : 'Apple',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          definition: targetMode === 'hard' ? '화학적 물리적 방법으로 더 단순한 물질로 분해할 수 없는 기본 물질' : '붉은 색깔의 아삭아삭한 맛을 자랑하는 장미과의 대표 활엽수 열매'
        }
      ]);
    } finally {
      setAiIsThinking(false);
    }
  };

  // Turn playing submit logic
  const handlePlayTurn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (gameStatus !== 'playing' || aiIsThinking) return;

    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;

    const lastWordObj = history[history.length - 1];
    const previousWord = lastWordObj?.word || "";

    setUserInput('');
    setAiIsThinking(true);
    setAlertMsg(null);

    try {
      const playedHistoryWords = history.map(h => h.word);
      const resp = await fetch('/api/game/play-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previousWord,
          userWord: trimmedInput,
          history: playedHistoryWords,
          mode: difficulty
        })
      });

      if (resp.ok) {
        const body = await resp.json();

        if (!body.isValid) {
          // Play turn is invalid! Show detailed warning alert
          setAlertMsg({
            text: body.reason || "유효한 단어가 아닙니다.",
            type: 'error'
          });
          setAiIsThinking(false);
          return;
        }

        // 1. Success validation! Create user's speech bubble
        const userTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const userWordId = `user_${Date.now()}`;
        const userItem: WordItem = {
          id: userWordId,
          word: trimmedInput,
          english: body.userWordTranslation || "Lexicon",
          sender: 'user',
          timestamp: userTimeStr,
          definition: body.userWordDefinition || "사전에 등재된 한국어 단어"
        };

        // Increase score based on word length and active speed!
        const bonusLength = trimmedInput.length * 20;
        const bonusSpeed = Math.floor(timeRemaining * 1.5);
        const addedValue = bonusLength + bonusSpeed;
        const newScore = score + addedValue;

        setScore(newScore);
        const updatedHistory = [...history, userItem];
        setHistory(updatedHistory);
        setTurn((prev) => prev + 1);

        // Notify user of points
        setAlertMsg({
          text: `멋진 수비 성공! +${addedValue}점 돌파`,
          type: 'success'
        });

        // 2. Play AI counterpart turn bubble immediately
        if (body.aiWord) {
          setTimeout(() => {
            const aiTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const aiWordId = `ai_${Date.now()}`;
            const aiItem: WordItem = {
              id: aiWordId,
              word: body.aiWord,
              english: body.aiWordTranslation || "Counterpoint",
              sender: 'ai',
              timestamp: aiTimeStr,
              definition: body.aiWordDefinition || "AI 마스터가 선정한 대칭 어휘"
            };
            setHistory([...updatedHistory, aiItem]);
            setAiIsThinking(false);
            setTimeRemaining(30); // reset 30s count on AI success play
          }, 1200); // 1.2s realistic AI suspense typing glow delay!
        } else {
          // AI yielded or couldn't find a word! (Rare on Gemini, common on fallbacks)
          setAlertMsg({
            text: '어휘 한계 도달! AI 마스터가 더 이상 단어를 잇지 못했습니다. 플레이어 대승리!',
            type: 'success'
          });
          setGameStatus('ended');
          setAiIsThinking(false);
        }

      } else {
        throw new Error('API connection error');
      }

    } catch (err) {
      console.error(err);
      setAlertMsg({
        text: '서버 연계 전송 중 일시적 오류가 감지되었습니다. 인터넷 네트워크 상태를 확인하세요.',
        type: 'error'
      });
      setAiIsThinking(false);
    }
  };

  // Toggle Difficulty modes
  const handleDifficultyChange = (mode: GameMode) => {
    if (difficulty === mode) return;
    if (confirm(`난이도를 "${mode.toUpperCase()}" 모드로 전환하고 새 매치를 시작하시겠습니까?`)) {
      handleRestart(mode);
    }
  };

  return (
    <div className="text-on-surface font-sans overflow-hidden h-screen flex flex-col relative">
      <FloatingParticles />
      <div className="mesh-gradient-bg"></div>

      {/* TopNavBar */}
      <header className="sticky top-0 w-full z-50 flex justify-between items-center px-6 py-4 backdrop-blur-md bg-surface/80 border-b border-white/10 shadow-[0_0_20px_rgba(210,187,255,0.12)]">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => handleRestart()}>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-60 group-hover:opacity-100 transition duration-300"></div>
            <img 
              alt="LexiLink Logo" 
              className="relative w-10 h-10 rounded-full cursor-pointer hover:scale-105 transition-all"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPWyc0OjDDG6vqFCNUbS2kcn1gHl_JCAfr3VWTRQ4wTB06MyveFMsIUXsGzuLTfYRvR-YYKbXpvcABYSJTqxurirXAg24ILntC0z_l8pR_NzXXF5gPE0nnz3Fj6-4twYW6ZkDNqwkGztT2mkrNASuqbNNzDQJnnbanVAY4Q9sAF6iLl2Cvxq1g53C-zPHJWUR2-1yJqtqATckVF5hbU0TKPapQjTbrXqIdr9UIbisFMFQ1JXTB6ev02qNJ2T47PVIVt8Hzhk4"
            />
          </div>
          <span 
            className="font-plus font-extrabold text-2xl bg-gradient-to-r from-primary via-tertiary to-secondary bg-clip-text text-transparent hover:brightness-110 tracking-tight transition-all cursor-pointer"
            onClick={() => setActiveTab('arena')}
          >
            LexiLink AI
          </span>
        </div>

        {/* Desktop nav tabs */}
        <div className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => setActiveTab('arena')}
            className={`font-plus text-xs uppercase tracking-widest pb-1 transition-all ${
              activeTab === 'arena' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Arena Play
          </button>
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`font-plus text-xs uppercase tracking-widest pb-1 transition-all ${
              activeTab === 'leaderboard' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Leaderboard
          </button>
          <button 
            onClick={() => setIsRulesOpen(true)}
            className="font-plus text-xs uppercase tracking-widest pb-1 text-on-surface-variant hover:text-on-surface transition-all"
          >
            Game Rules
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Score Display */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-primary-fixed-dim uppercase tracking-widest font-extrabold">Current Score</span>
            <span className="font-plus font-extrabold text-xl text-primary drop-shadow-[0_0_8px_rgba(210,187,255,0.4)]">
              {score.toLocaleString()}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
          
          <div className="flex items-center gap-3">
            <Trophy 
              onClick={() => setActiveTab('leaderboard')}
              className="text-secondary cursor-pointer hover:scale-110 active:scale-95 transition-all w-5 h-5 drop-shadow-[0_0_4px_rgba(76,215,246,0.3)]" 
            />
            <img 
              alt="Player Profile" 
              className="w-9 h-9 rounded-full border border-secondary/30 object-cover hover:ring-2 hover:ring-secondary/50 transition-all cursor-pointer" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-nrIuSI7uo4kNGxKIZ2bWKfWR82Lri42LDr-Jz-QA2BKid0SGdT_76AxpSlEp6-eF3WvFBW58xTBubFW-tcafDfFIjrhDt1WO2tTmhBcEIPfovX-n9pN-l7DrFL0_2bUAU6-T9zrjYj0XpEh1SPIOJOXaZ2OVM2VP5tQjE_h8rlRY10tl-DdWywWe4YoKLw0dPJUOFy9ESKT8tn2mbDAznzTD-jttsyhFgylSsp1vouYFegAgFU5hm08IytE1uNDgb0EG3rU"
            />
          </div>

          {/* Mobile menu toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 md:hidden text-white hover:text-primary transition-colors focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-surface/90 backdrop-blur-lg pt-24 px-6 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
          <button 
            onClick={() => { setActiveTab('arena'); setMobileMenuOpen(false); }}
            className={`text-lg font-plus font-bold text-left py-2 border-b border-white/5 ${activeTab === 'arena' ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            Arena Play
          </button>
          <button 
            onClick={() => { setActiveTab('leaderboard'); setMobileMenuOpen(false); }}
            className={`text-lg font-plus font-bold text-left py-2 border-b border-white/5 ${activeTab === 'leaderboard' ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            Leaderboard
          </button>
          <button 
            onClick={() => { setIsRulesOpen(true); setMobileMenuOpen(false); }}
            className="text-lg font-plus font-bold text-left py-2 border-b border-white/5 text-on-surface-variant"
          >
            Show Rules
          </button>

          {/* Mobile Side Controls */}
          <div className="mt-8 space-y-4">
            <h4 className="text-xs font-bold text-primary uppercase">Game Master Controls</h4>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => { handleDifficultyChange('easy'); setMobileMenuOpen(false); }}
                className={`py-2 text-xs font-bold rounded-xl ${difficulty === 'easy' ? 'bg-primary text-on-primary' : 'bg-white/5 text-on-surface-variant'}`}
              >
                쉬움말
              </button>
              <button 
                onClick={() => { handleDifficultyChange('normal'); setMobileMenuOpen(false); }}
                className={`py-2 text-xs font-bold rounded-xl ${difficulty === 'normal' ? 'bg-primary text-on-primary' : 'bg-white/5 text-on-surface-variant'}`}
              >
                보통말
              </button>
              <button 
                onClick={() => { handleDifficultyChange('hard'); setMobileMenuOpen(false); }}
                className={`py-2 text-xs font-bold rounded-xl ${difficulty === 'hard' ? 'bg-primary text-on-primary' : 'bg-white/5 text-on-surface-variant'}`}
              >
                지옥말
              </button>
            </div>
            <button
              onClick={() => { handleRestart(); setMobileMenuOpen(false); }}
              className="w-full py-3 mt-4 bg-gradient-to-r from-primary to-secondary text-on-primary font-bold rounded-xl text-center"
            >
              Restart match
            </button>
          </div>
        </div>
      )}

      {/* Main Container Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Sidebar (Desktop Only) */}
        <aside className="hidden lg:flex flex-col fixed left-0 top-[73px] h-[calc(100vh-73px)] w-64 p-4 z-40 bg-surface-container/60 backdrop-blur-2xl border-r border-white/5 shadow-2xl transition-all duration-300">
          
          {/* AI Character HUD summary */}
          <div className="mb-6 p-4 glass-panel rounded-2xl flex flex-col items-center text-center">
            <div className="floating-ai mb-3">
              <div className="relative">
                <div className={`absolute -inset-1 bg-gradient-to-r ${
                  difficulty === 'hard' ? 'from-red-500 to-amber-500' : 'from-primary to-secondary'
                } rounded-full blur opacity-60`}></div>
                <img 
                  alt="AI Sensei" 
                  className="relative w-16 h-16 rounded-full shadow-[0_0_20px_rgba(124,58,237,0.3)] border-2 border-white/10"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPWyc0OjDDG6vqFCNUbS2kcn1gHl_JCAfr3VWTRQ4wTB06MyveFMsIUXsGzuLTfYRvR-YYKbXpvcABYSJTqxurirXAg24ILntC0z_l8pR_NzXXF5gPE0nnz3Fj6-4twYW6ZkDNqwkGztT2mkrNASuqbNNzDQJnnbanVAY4Q9sAF6iLl2Cvxq1g53C-zPHJWUR2-1yJqtqATckVF5hbU0TKPapQjTbrXqIdr9UIbisFMFQ1JXTB6ev02qNJ2T47PVIVt8Hzhk4"
                />
              </div>
            </div>
            <h3 className="font-plus font-bold text-lg text-primary">Game Master</h3>
            <span className={`text-[11px] font-semibold tracking-wider font-mono capitalize transition-all ${
              difficulty === 'hard' ? 'text-red-400' : difficulty === 'easy' ? 'text-green-400' : 'text-secondary'
            }`}>
              Difficulty: {difficulty}
            </span>
          </div>

          {/* Difficulty Navigation Select List */}
          <nav className="flex-1 space-y-2">
            <span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-widest pl-2 block mb-2">ARENA AREALS</span>
            
            <button 
              onClick={() => handleDifficultyChange('easy')}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                difficulty === 'easy' 
                  ? 'bg-primary-container text-white font-bold shadow-[0_4px_12px_rgba(124,58,237,0.25)]' 
                  : 'text-on-surface-variant hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Baby className="w-4 h-4" />
                <span className="text-sm">Easy Mode</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button 
              onClick={() => handleDifficultyChange('normal')}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                difficulty === 'normal' 
                  ? 'bg-primary-container text-white font-bold shadow-[0_4px_12px_rgba(124,58,237,0.25)]' 
                  : 'text-on-surface-variant hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-4 h-4" />
                <span className="text-sm">Normal Mode</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button 
              onClick={() => handleDifficultyChange('hard')}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                difficulty === 'hard' 
                  ? 'bg-primary-container text-white font-bold shadow-[0_4px_12px_rgba(124,58,237,0.25)]' 
                  : 'text-on-surface-variant hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 animate-bounce" />
                <span className="text-sm font-semibold">Hard Mode</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            <div className="py-2">
              <div className="border-t border-white/5"></div>
            </div>

            <button 
              onClick={() => setIsRulesOpen(true)}
              className="w-full flex items-center gap-3 p-3 text-on-surface-variant hover:bg-white/5 rounded-xl transition-all text-sm"
            >
              <HelpCircle className="w-4 h-4" />
              <span>History & Guide</span>
            </button>
          </nav>

          {/* Bottom Action buttons */}
          <div className="mt-auto pt-4 space-y-4 border-t border-white/5">
            <button 
              onClick={() => handleRestart()}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-on-primary font-bold rounded-xl shadow-lg hover-lift active:scale-[0.98] cursor-pointer text-sm"
            >
              Restart Match
            </button>
            <div className="flex justify-around items-center pt-2 text-on-surface-variant">
              <Settings className="w-4 h-4 hover:text-secondary cursor-pointer transition-colors" />
              <div className="text-[10px] tracking-wider uppercase opacity-60">v2.4 Live AI</div>
              <HelpCircle className="w-4 h-4 hover:text-secondary cursor-pointer transition-colors" onClick={() => setIsRulesOpen(true)} />
            </div>
          </div>
        </aside>

        {/* Content panel */}
        <main className="flex-1 lg:ml-64 flex flex-col relative overflow-hidden h-full">
          
          {activeTab === 'arena' ? (
            <>
              {/* Game Interactive HUD */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex gap-4 w-auto scale-90 sm:scale-100 transition-all">
                {/* Turn count */}
                <div className="px-5 py-2 glass-panel rounded-full flex items-center gap-2.5 border border-primary/20 shadow-[0_0_15px_rgba(124,58,237,0.15)]">
                  <Star className="text-primary w-4 h-4" />
                  <span className="font-plus text-xs uppercase tracking-wider text-on-surface-variant">
                    Turn: <span className="text-primary font-bold">{turn}</span>
                  </span>
                </div>

                {/* Turn Timer Badge */}
                <div 
                  id="timer-badge"
                  className={`px-5 py-2 glass-panel rounded-full flex items-center gap-2.5 border border-secondary/20 shadow-[0_0_15px_rgba(76,215,246,0.15)] transition-all ${
                    timeRemaining <= 10 ? 'time-critical' : ''
                  }`}
                >
                  <Timer className={`w-4 h-4 text-secondary ${timeRemaining <= 10 ? 'animate-pulse' : ''}`} />
                  <span className="font-plus text-xs uppercase tracking-wider text-on-surface-variant">
                    Time: <span className="text-secondary font-bold font-mono">{timeRemaining}s</span>
                  </span>
                </div>
              </div>

              {/* Chat Play Zone */}
              <div className="flex-1 overflow-y-auto px-6 pt-24 pb-32 custom-scrollbar space-y-6 max-w-4xl mx-auto w-full">
                
                {history.map((item, index) => {
                  const isAi = item.sender === 'ai';
                  return (
                    <div 
                      key={item.id}
                      className={`flex items-end gap-3 animate-in ${
                        isAi ? 'slide-in-from-left' : 'justify-end slide-in-from-right'
                      } duration-500`}
                    >
                      {isAi && (
                        <img 
                          alt="AI mascot circular icon"
                          className="w-10 h-10 rounded-full glass-panel p-1 border border-primary/20 object-contain shadow-md"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPWyc0OjDDG6vqFCNUbS2kcn1gHl_JCAfr3VWTRQ4wTB06MyveFMsIUXsGzuLTfYRvR-YYKbXpvcABYSJTqxurirXAg24ILntC0z_l8pR_NzXXF5gPE0nnz3Fj6-4twYW6ZkDNqwkGztT2mkrNASuqbNNzDQJnnbanVAY4Q9sAF6iLl2Cvxq1g53C-zPHJWUR2-1yJqtqATckVF5hbU0TKPapQjTbrXqIdr9UIbisFMFQ1JXTB6ev02qNJ2T47PVIVt8Hzhk4"
                        />
                      )}

                      <div className={`relative max-w-[80%] px-6 py-4 rounded-2xl ${
                        isAi 
                          ? 'rounded-bl-none glass-panel border border-tertiary/20 text-tertiary shadow-[0_4px_15px_rgba(210,187,255,0.08)] bg-surface-container/40' 
                          : 'rounded-br-none bg-primary-container text-on-primary-container shadow-lg shadow-primary/20'
                      }`}>
                        
                        {/* Word string */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="font-plus font-bold text-xl md:text-2xl tracking-wide">
                            {item.word}
                          </p>
                          <span className={`text-xs ${isAi ? 'text-on-surface-variant' : 'text-primary'}`}>
                            ({item.english})
                          </span>
                        </div>

                        {/* Translation definition */}
                        {item.definition && (
                          <p className={`text-xs mt-2 leading-relaxed opacity-90 ${
                            isAi ? 'text-on-surface/80 border-t border-white/5 pt-1.5' : 'text-on-primary-container/85 border-t border-white/10 pt-1.5'
                          }`}>
                            {item.definition}
                          </p>
                        )}

                        <div className={`absolute -bottom-5 text-[10px] text-on-surface-variant font-medium whitespace-nowrap ${
                          isAi ? 'left-0' : 'right-0'
                        }`}>
                          {isAi ? 'AI' : 'You'} • {item.timestamp}
                        </div>
                      </div>

                      {!isAi && (
                        <img 
                          alt="User profile avatar icon"
                          className="w-10 h-10 rounded-full border border-primary/30 object-cover"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAsL-FU93NqFDkKt-t6hgtzSFU54sOIRIsEX4oFJUVS5q2Tg2oXJ9otDwX9auJblgUqXFxKE_k-PrUKsGXe9sVJF9Ny8mnWVNR-n9knYE1bW7YgkcAPpFvUMU5ThhTZsnR_bsjU7S7ZJDCN_eVs4agAoET67l5bAi5tdaiee5blkrGjfPEOgnH42jLxQ1qjWUn1luROxa6yvZF-zyBIxD0ejoymF6kXR4P7GGsoLQYRmVeoaU6sFmQqaqhg-XWmGLoH-803vM"
                        />
                      )}
                    </div>
                  );
                })}

                {/* AI Thinking indicator bubble */}
                {aiIsThinking && (
                  <div className="flex items-end gap-3" id="ai-thinking">
                    <img 
                      alt="Thinking character placeholder icon"
                      className="w-10 h-10 rounded-full glass-panel p-1 floating-ai object-contain"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPWyc0OjDDG6vqFCNUbS2kcn1gHl_JCAfr3VWTRQ4wTB06MyveFMsIUXsGzuLTfYRvR-YYKbXpvcABYSJTqxurirXAg24ILntC0z_l8pR_NzXXF5gPE0nnz3Fj6-4twYW6ZkDNqwkGztT2mkrNASuqbNNzDQJnnbanVAY4Q9sAF6iLl2Cvxq1g53C-zPHJWUR2-1yJqtqATckVF5hbU0TKPapQjTbrXqIdr9UIbisFMFQ1JXTB6ev02qNJ2T47PVIVt8Hzhk4"
                    />
                    <div className="px-5 py-4 rounded-xl rounded-bl-none glass-panel border-secondary/20 flex items-center gap-2 relative bg-surface-container/50">
                      <span className="text-secondary font-medium text-sm italic">Thinking</span>
                      <div className="thinking-dots flex gap-1">
                        <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                        <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                        <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alert/Status banner */}
                {alertMsg && (
                  <div className={`p-4 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
                    alertMsg.type === 'error' 
                      ? 'bg-red-500/10 border border-red-500/20 text-red-200' 
                      : 'bg-green-500/10 border border-green-500/20 text-green-200'
                  }`}>
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{alertMsg.text}</span>
                  </div>
                )}

                {/* Game Ended screen inside play arena */}
                {gameStatus === 'ended' && (
                  <div className="glass-panel rounded-2xl p-6 text-center space-y-4 max-w-lg mx-auto border-secondary/20 bg-gradient-to-t from-black/40 to-transparent">
                    <Trophy className="w-12 h-12 text-secondary mx-auto animate-bounce" />
                    <h3 className="text-xl font-bold text-white">Match Concluded!</h3>
                    <p className="text-sm text-on-surface-variant">
                      최종 점수 <strong>{score.toLocaleString()}</strong>점을 달성하셨습니다. 리더보드 탭에 점수를 게시해 보세요!
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setActiveTab('leaderboard')}
                        className="px-5 py-2 bg-secondary text-on-secondary font-extrabold text-xs rounded-full hover:scale-105 transition-transform"
                      >
                        리더보드 점수 등록
                      </button>
                      <button
                        onClick={() => handleRestart()}
                        className="px-5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-xs text-white"
                      >
                        새 매치하기
                      </button>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Bottom Gameplay Word Input */}
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
                <div className="max-w-4xl mx-auto w-full pointer-events-auto">
                  <form 
                    onSubmit={handlePlayTurn}
                    className="relative glass-panel rounded-full p-2 flex items-center border border-primary/30 pulse-border group"
                  >
                    <div className="flex-1 px-4">
                      <input 
                        type="text"
                        disabled={gameStatus !== 'playing' || aiIsThinking}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={
                          gameStatus !== 'playing' 
                            ? '게임오버! 매치를 새로 시작하세요.' 
                            : aiIsThinking 
                            ? 'AI 가 연쇄 단어를 구상하고 있습니다...' 
                            : `단어를 끝글자로 이으세요... (${history[history.length - 1]?.word.slice(-1) || '사'})`
                        }
                        className="w-full bg-transparent border-none text-white focus:outline-none focus:ring-0 text-md placeholder-on-surface-variant/50 px-4"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={gameStatus !== 'playing' || aiIsThinking || !userInput.trim()}
                      className="bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center hover-lift hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-primary/30 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                    
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-surface-bright/95 border border-white/5 rounded text-[10px] text-primary-fixed uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Press Enter to push word
                    </div>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 overflow-y-auto h-full custom-scrollbar">
              <LeaderboardPanel 
                currentScore={score} 
                currentMode={difficulty}
                turnsPlayed={turn}
                onPostScoreLocal={(entry) => {
                  setLocalLeaderboard([entry, ...localLeaderboard]);
                }}
              />
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 px-6 flex flex-col md:flex-row justify-between items-center bg-surface-container-lowest border-t border-white/5 text-xs text-on-surface-variant opacity-80 z-20">
        <span className="font-plus font-bold tracking-widest text-[11px] uppercase">
          © {new Date().getFullYear()} LexiLink AI Arena - Korean Word Chain Engine
        </span>
        <div className="flex gap-6 mt-2 md:mt-0 font-medium">
          <a href="#" className="hover:text-secondary underline-offset-4 hover:underline">GitHub</a>
          <a href="#" className="hover:text-secondary underline-offset-4 hover:underline" onClick={() => setIsRulesOpen(true)}>Documentation</a>
          <a href="#" className="hover:text-secondary underline-offset-4 hover:underline" onClick={() => setIsRulesOpen(true)}>Game Rules</a>
        </div>
      </footer>

      {/* Rules Modal Overlay */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
