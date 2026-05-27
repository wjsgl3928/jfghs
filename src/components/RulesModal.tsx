import { BookOpen, X, Info } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  const rulesMap = [
    { from: '라, 락, 란, 래', to: '아, 악, 안, 애' },
    { from: '로, 록, 론, 뢰', to: '오, 옥, 온, 외' },
    { from: '료, 룡, 류, 륙', to: '요, 용, 유, 육' },
    { from: '리, 린, 림, 립', to: '이, 인, 임, 입' },
    { from: '녀, 뇨, 뉴, 니', to: '여, 요, 유, 이' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel rounded-2xl p-6 md:p-8 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="text-secondary w-6 h-6" />
            <h2 className="font-plus font-bold text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Arena Rules & Custom Guidelines
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contents */}
        <div className="space-y-6 text-on-surface-variant text-sm md:text-base">
          {/* Rule 1 */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <h3 className="text-primary font-bold font-plus mb-2 flex items-center gap-2">
              <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
              기본 플레이 규칙 (Basic Mechanics)
            </h3>
            <p className="text-sm leading-relaxed text-on-surface/80">
              이전 어절의 <strong>마지막 글자</strong>로 시작하는 표준 한국어 명사(Noun)를 30초 내에 입력해야 합니다.
              예: 사과 → 과자 → 자전거 → 거울 ...
            </p>
          </div>

          {/* Rule 2 */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <h3 className="text-primary font-bold font-plus mb-2 flex items-center gap-2">
              <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
              두음법칙 허용 (Initial Sound Rules)
            </h3>
            <p className="text-sm leading-relaxed mb-3 text-on-surface/80">
              한국어 어초의 두음법칙을 완벽히 지원합니다. 단어 끝글자의 자음이 바뀔 수 있어 다양한 연쇄적인 어휘 콤보 플레이가 가능합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 font-mono text-xs">
              {rulesMap.map((r, idx) => (
                <div key={idx} className="flex justify-between p-2 bg-black/20 rounded border border-white/5">
                  <span className="text-secondary">{r.from}</span>
                  <span className="text-white">➔</span>
                  <span className="text-primary-fixed">{r.to}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rule 3 */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <h3 className="text-primary font-bold font-plus mb-2 flex items-center gap-2">
              <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
              게임 마스터 난이도 (Difficulty Level)
            </h3>
            <ul className="list-disc pl-5 text-sm space-y-1 text-on-surface/80">
              <li><strong>Easy Mode:</strong> 일상적인 고빈도의 어휘들을 출제합니다.</li>
              <li><strong>Normal Mode:</strong> 보편적인 난이도의 단어로 공략합니다.</li>
              <li><strong>Hard Mode:</strong> 학술 명사 및 어려운 끝글자(예: 륨, 늄, 슭 등)로 플레이어의 단어 주머니 어휘력을 극한까지 시험힙니다!</li>
            </ul>
          </div>

          {/* Info */}
          <div className="flex gap-3 p-3 bg-secondary-container/10 border border-secondary/20 rounded-xl text-xs text-secondary">
            <Info className="w-5 h-5 shrink-0" />
            <p className="leading-relaxed">
              사전에 검출되지 않거나 이미 썼던 단어는 중복 오류로 탈락됩니다. 시간 초과 시 상대방의 승리로 즉시 연쇄가 종결됩니다!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-on-surface-variant hover:text-white font-bold rounded-full hover:scale-105 active:scale-95 transition-all"
          >
            확인 및 닫기
          </button>
        </div>
        
      </div>
    </div>
  );
}
