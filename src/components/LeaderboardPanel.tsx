import React, { useEffect, useState } from 'react';
import { Trophy, RefreshCw, Zap, Medal, Star } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardPanelProps {
  currentScore?: number;
  currentMode?: string;
  turnsPlayed?: number;
  onPostScoreLocal?: (entry: LeaderboardEntry) => void;
}

export default function LeaderboardPanel({ currentScore = 0, currentMode = 'normal', turnsPlayed = 0, onPostScoreLocal }: LeaderboardPanelProps) {
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const fetchScores = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/leaderboard');
      if (resp.ok) {
        const data = await resp.json();
        setBoard(data);
      }
    } catch (e) {
      console.error("Failed to load leaderboard", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    try {
      const resp = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName,
          score: currentScore,
          mode: currentMode,
          turns: turnsPlayed
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.updatedLeaderboard) {
          setBoard(data.updatedLeaderboard);
          setHasSubmitted(true);
          if (onPostScoreLocal) {
            onPostScoreLocal({
              name: playerName,
              score: currentScore,
              mode: currentMode as any,
              turns: turnsPlayed,
              date: new Date().toISOString().split('T')[0]
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to post score", err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-plus text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary flex items-center gap-3">
            <Trophy className="text-secondary w-7 h-7 animate-pulse" />
            Arena Hall of Fame (Leaderboard)
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            LexiLink AI 최고의 어휘 지략가들이 남긴 영광의 기록판입니다.
          </p>
        </div>
        <button
          onClick={fetchScores}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-xs font-semibold text-primary transition-all self-end md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit Progress Card */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 flex flex-col justify-between border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
          <div>
            <span className="text-[10px] text-primary uppercase font-bold tracking-widest block mb-1">YOUR ACTIVE PROGRESS</span>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-extrabold font-plus text-white">{currentScore.toLocaleString()}</span>
              <span className="text-xs text-on-surface-variant">Points</span>
            </div>

            <div className="space-y-3 font-medium text-xs text-on-surface-variant">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>난이도 (Mode)</span>
                <span className="text-white capitalize">{currentMode}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>돌파한 턴 (Turns)</span>
                <span className="text-white">{turnsPlayed} turns</span>
              </div>
              <div className="flex justify-between pb-2">
                <span>진행 일시 (Time)</span>
                <span className="text-white">Active session</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {!hasSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-xs font-semibold text-primary">당신의 이름을 기록보드에 등록하세요!</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="이름 입력 (최대 12글자)"
                    maxLength={12}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="flex-1 bg-surface-container/80 border border-white/10 focus:border-primary/50 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-0"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:scale-105 active:scale-95 transition-all outline-none"
                  >
                    등록
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-secondary-container/10 border border-secondary/20 rounded-xl text-center">
                <p className="text-xs text-secondary font-bold">리더보드 점수 등록 성공!</p>
              </div>
            )}
          </div>
        </div>

        {/* High Scores List */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden border-white/5">
          <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between text-xs text-on-surface-variant font-bold">
            <span className="w-12 text-center">Rank</span>
            <span className="flex-1 pl-4">Word Architect</span>
            <span className="w-20 text-center">Mode</span>
            <span className="w-16 text-center">Turns</span>
            <span className="w-24 text-right">Score</span>
          </div>

          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                <span className="text-xs text-on-surface-variant">명예의 전당 점수를 불러오는 중...</span>
              </div>
            ) : board.length === 0 ? (
              <div className="py-12 text-center text-xs text-on-surface-variant">
                기록된 점수가 아직 없습니다. 첫 승리를 쟁취해 보세요!
              </div>
            ) : (
              board.map((item, idx) => {
                const isTopThree = idx < 3;
                return (
                  <div
                    key={idx}
                    className={`p-4 flex items-center justify-between text-sm transition-colors hover:bg-white/5 ${
                      isTopThree ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="w-12 flex justify-center text-center">
                      {idx === 0 ? (
                        <Medal className="w-5 h-5 text-yellow-400" />
                      ) : idx === 1 ? (
                        <Medal className="w-5 h-5 text-slate-300" />
                      ) : idx === 2 ? (
                        <Medal className="w-5 h-5 text-amber-600" />
                      ) : (
                        <span className="font-mono text-xs font-bold text-on-surface-variant">#{idx + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 pl-4 flex items-center gap-2">
                      <span className="font-semibold text-white truncate max-w-[150px]">{item.name}</span>
                      {isTopThree && <Star className="w-3 h-3 text-secondary fill-secondary animate-pulse" />}
                    </div>

                    <div className="w-20 text-center">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          item.mode === 'hard'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                            : item.mode === 'easy'
                            ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {item.mode}
                      </span>
                    </div>

                    <div className="w-16 text-center font-mono text-xs text-on-surface-variant">
                      {item.turns} t
                    </div>

                    <div className="w-24 text-right font-mono font-extrabold text-primary p-1">
                      {item.score.toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
