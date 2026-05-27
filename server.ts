import express from "express";
import path from "path";
import serverless from "serverless-http"; // Netlify 지원을 위해 추가
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Gemini Client Lazily/Safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables. Gemini features will be degraded.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Memory Database for leaderboard & sessions
interface HighScore {
  name: string;
  score: number;
  mode: string;
  turns: number;
  date: string;
}

const leaderboard: HighScore[] = [
  { name: "AlphaWord", score: 2800, mode: "hard", turns: 24, date: "2026-05-26" },
  { name: "LexiQueen", score: 1850, mode: "normal", turns: 18, date: "2026-05-27" },
  { name: "KoreanHero", score: 1420, mode: "normal", turns: 14, date: "2026-05-27" },
  { name: "WordArchitect", score: 1240, mode: "normal", turns: 12, date: "2026-05-27" },
  { name: "Beginner1", score: 450, mode: "easy", turns: 6, date: "2026-05-25" }
];

// Helper to check standard initial sound rules (두음법칙)
function checkInitialSoundRule(lastChar: string, firstChar: string): boolean {
  if (lastChar === firstChar) return true;
  const rules: Record<string, string[]> = {
    '라': ['아'], '락': ['악'], '란': ['안'], '래': ['애'], '랭': ['앵'],
    '랴': ['야'], '략': ['약'], '량': ['양'], '려': ['여'], '력': ['역'],
    '련': ['연'], '렬': ['열'], '렴': ['염'], '렵': ['엽'], '령': ['영'],
    '례': ['예'], '로': ['오'], '록': ['옥'], '론': ['온'], '롱': ['옹'],
    '뢰': ['외'], '료': ['요'], '룡': ['용'], '루': ['우'], '류': ['유'],
    '륙': ['육'], '륜': ['윤'], '률': ['율'], '륭': ['융'], '르': ['으'],
    '른': ['은'], '름': ['음'], '릉': ['응'], '리': ['이'], '린': ['인'],
    '림': ['임'], '립': ['입'], '링': ['잉'],
    '녀': ['여'], '뇨': ['요'], '뉴': ['유'], '니': ['이']
  };
  if (rules[lastChar] && rules[lastChar].includes(firstChar)) {
    return true;
  }
  return false;
}

// Static Fallbacks if Gemini API is unavailable or fails
const fallbacks: Record<string, { start: string, matches: Record<string, {word: string, eng: string, def: string}[]> }> = {
  'easy': {
    start: "사과",
    matches: {
      '사': [{ word: "사자", eng: "Lion", def: "고양이과의 대표적인 야생 동물" }],
      '과': [{ word: "과자", eng: "Snack", def: "밀가루 등으로 조리한 비스킷류 간식" }],
      '자': [{ word: "자전거", eng: "Bicycle", def: "두 바퀴로 움직이는 인력 탈것" }],
      '거': [{ word: "거울", eng: "Mirror", def: "빛을 반사해 사람이나 사물을 비춰 보는 물체" }],
      '울': [{ word: "울릉도", eng: "Ulleungdo", def: "동해에 위치한 대한민국의 아름다운 섬" }],
      '도': [{ word: "도시락", eng: "Lunchbox", def: "외부에서 먹을 수 있도록 준비해 담은 밥과 반찬" }],
      '락': [{ word: "악기", eng: "Musical Instrument", def: "소리를 내어 음악을 연주하는 데 쓰는 기구" }],
      '기': [{ word: "기차", eng: "Train", def: "궤도 위를 달리는 승객과 화물 수송 장치" }],
    }
  },
  'normal': {
    start: "사과",
    matches: {
      '사': [{ word: "사자", eng: "Lion", def: "백수의 왕이라 불리는 포식마냥 생긴 야생 동물" }],
      '과': [{ word: "과자", eng: "Snack", def: "밀가루 등으로 만든 바삭한 식용 간식" }],
      '자': [{ word: "자전거", eng: "Bicycle", def: "양발로 추진하는 두 바퀴 이동기구" }],
      '거': [{ word: "거울", eng: "Mirror", def: "자신의 면모를 반사하여 주는 정밀한 도구" }],
      '울': [{ word: "울타리", eng: "Fence", def: "경계를 짓기 위해 나무나 철망을 엮어 세운 구조물" }],
      '리': [{ word: "이발소", eng: "Barbershop", def: "머리나 머리털을 깎고 다듬는 전문 시설" }],
      '소': [{ word: "소나무", eng: "Pine Tree", def: "사철 푸른 바늘잎을 가진 대표적인 상록수" }],
      '무': [{ word: "무지개", eng: "Rainbow", def: "대기 중에 떠 있는 물방울에 햇빛이 반사되어 생기는 일곱 빛깔의 호" }]
    }
  },
  'hard': {
    start: "원소",
    matches: {
      '소': [{ word: "소라껍데기", eng: "Conch Shell", def: "소라의 몸을 둘러싸고 있는 딱딱한 석회 물질의 껍질" }],
      '기': [{ word: "기형학", eng: "Teratology", def: "생물의 발육 이상과 형태적 이상을 연구하는 기초 의학" }]
    }
  }
};

// API: Start a Word Chain Match
app.get("/api/game/starter-word", async (req, res) => {
  const mode = (req.query.mode || "normal") as string;
  const wordPool = ["사과", "지구", "우주", "한글", "노래", "원소"];
  const randomWord = wordPool[Math.floor(Math.random() * wordPool.length)];
  
  if (!process.env.GEMINI_API_KEY) {
    res.json({
      word: randomWord,
      english: randomWord === "사과" ? "Apple" : randomWord === "지구" ? "Earth" : "Universe",
      definition: "끝말잇기의 흥미로운 시작 단어입니다.",
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    });
    return;
  }

  try {
    const ai = getGeminiClient();
    const prompt = `Choose one beautiful, standard Korean noun that is high quality and fun to start a word chain game. Returns its English translation and Korean short definition. Follow the schema strictly. Chosen mode is ${mode}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING, description: "A simple, neat Korean noun to start the game" },
            english: { type: Type.STRING, description: "English translation of the word" },
            definition: { type: Type.STRING, description: "A brief, charming 1-sentence definition of it in Korean" }
          },
          required: ["word", "english", "definition"]
        }
      }
    });

    const body = JSON.parse(response.text || "{}");
    res.json({
      word: body.word || "사과",
      english: body.english || "Apple",
      definition: body.definition || "끝말잇기의 시작단어",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    });
  } catch (error) {
    console.error("Gemini Starter Word error:", error);
    res.json({
      word: "사과",
      english: "Apple",
      definition: "붉고 맛있는 과일 맛과 비타민이 가득한 대표 가을 과일",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    });
  }
});

// API: Submit User Word & Receive AI Counter-word
app.post("/api/game/play-turn", async (req, res) => {
  const { previousWord, userWord, history, mode } = req.body;
  const historyList = (history || []) as string[];

  if (!userWord || userWord.trim() === "") {
    return res.status(400).json({ error: "단어를 입력해주세요." });
  }

  const trimmedUserWord = userWord.trim();
  const firstChar = trimmedUserWord.charAt(0);
  const lastCharPreceding = previousWord ? previousWord.charAt(previousWord.length - 1) : "";

  let matchRule = true;
  if (lastCharPreceding) {
    matchRule = checkInitialSoundRule(lastCharPreceding, firstChar);
  }

  if (!matchRule) {
    return res.json({
      isValid: false,
      reason: `'${lastCharPreceding}'로 시작해야 합니다. (두음법칙 허용)`,
      userWordTranslation: "",
      userWordDefinition: "",
      aiWord: null,
      aiWordTranslation: null,
      aiWordDefinition: null
    });
  }

  if (historyList.some(w => w.trim() === trimmedUserWord)) {
    return res.json({
      isValid: false,
      reason: "이미 사용된 단어입니다.",
      userWordTranslation: "",
      userWordDefinition: "",
      aiWord: null,
      aiWordTranslation: null,
      aiWordDefinition: null
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    const lastCharUser = trimmedUserWord.charAt(trimmedUserWord.length - 1);
    const modeConfig = fallbacks[mode as 'easy' | 'normal' | 'hard'] || fallbacks['normal'];
    const candidates = modeConfig.matches[lastCharUser] || [];
    const validCandidate = candidates.find(c => !historyList.includes(c.word));

    if (validCandidate) {
      return res.json({
        isValid: true,
        reason: "",
        userWordTranslation: "Custom Word",
        userWordDefinition: "유저가 입력한 멋진 단어",
        aiWord: validCandidate.word,
        aiWordTranslation: validCandidate.eng,
        aiWordDefinition: validCandidate.def
      });
    } else {
      const fallbackWord = lastCharUser + "점";
      return res.json({
        isValid: true,
        reason: "",
        userWordTranslation: "User Entry",
        userWordDefinition: "게임 플레이어가 제안한 어휘",
        aiWord: fallbackWord,
        aiWordTranslation: "AI Counterpoint",
        aiWordDefinition: "안락한 AI 카운터 어휘 기법"
      });
    }
  }

  try {
    const ai = getGeminiClient();
    const historyString = historyList.join(", ");
    
    const prompt = `
      Current Game Mode: ${mode}
      Preceding Word: ${previousWord}
      User Word: ${trimmedUserWord}
      Already Used Words: [${historyString}]

      Instructions:
      1. Check if user's word "${trimmedUserWord}" is a valid Korean real noun (명사) present in the dictionaries and does not violate word chain rules.
      2. If invalid (e.g. not a noun, doesn't exist, isn't Korean, or is a slang/proper noun not registered as a standard dictionary word), return isValid: false with the exact Korean reason.
      3. If valid, set isValid: true.
      4. Provide the correct English translation & meaning for the user's word in 'userWordTranslation' and a brief Korean definition in 'userWordDefinition'.
      5. Next, generate a counter-word for AI ('aiWord') starting with the last character of "${trimmedUserWord}".
         - YOU CAN leverage Standard Initial Sound Laws (두음법칙).
         - AI Word must be a valid Korean real noun.
         - AI Word MUST NOT be in already used list: [${historyString}].
         - Tailor AI Word's rarity to difficulty: Easy (simple), Normal (moderate), Hard (rare endings like "륨", "늄").
      6. Provide correct 'aiWordTranslation' and 'aiWordDefinition' for the selected AI word.

      Follow the response schema strictly. Return only pure JSON content.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            userWordTranslation: { type: Type.STRING },
            userWordDefinition: { type: Type.STRING },
            aiWord: { type: Type.STRING },
            aiWordTranslation: { type: Type.STRING },
            aiWordDefinition: { type: Type.STRING }
          },
          required: ["isValid", "reason", "userWordTranslation", "userWordDefinition", "aiWord", "aiWordTranslation", "aiWordDefinition"]
        }
      }
    });

    const body = JSON.parse(response.text || "{}");
    res.json(body);
  } catch (error) {
    console.error("Gemini Validation Turn error:", error);
    const lastCharUser = trimmedUserWord.charAt(trimmedUserWord.length - 1);
    res.json({
      isValid: true,
      reason: "",
      userWordTranslation: "User Word",
      userWordDefinition: "플레이어가 제시한 건강한 한글 단어입니다.",
      aiWord: lastCharUser + "품",
      aiWordTranslation: "Item",
      aiWordDefinition: "그 글자로 끝나는 단어가 있어 임시로 구성한 단어입니다."
    });
  }
});

// API: Highscores List
app.get("/api/leaderboard", (req, res) => {
  res.json(leaderboard.sort((a, b) => b.score - a.score));
});

// API: Post Highscore
app.post("/api/leaderboard", (req, res) => {
  const { name, score, mode, turns } = req.body;
  if (!name || typeof score !== "number") {
    return res.status(400).json({ error: "올바른 형식이 아닙니다." });
  }
  const newEntry: HighScore = {
    name: name.trim().slice(0, 15) || "Unidentified User",
    score,
    mode: mode || "normal",
    turns: turns || 1,
    date: new Date().toISOString().split('T')[0]
  };
  leaderboard.push(newEntry);
  res.json({ success: true, updatedLeaderboard: leaderboard.sort((a, b) => b.score - a.score) });
});

//
