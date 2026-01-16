import React, { useState, useRef } from "react";
import { GoogleGenerativeAI } from "@google/genai";

/* =====================
   型定義（types.ts を統合）
===================== */

type Mode = "week" | "five";

type BentoItem = {
  name: string;
  recipeUrl: string;
};

type AppState = {
  mode: Mode;
  ingredients: string;
  grandma_vegetables: string;
  usual_ingredients: string;
  loading: boolean;
  result: ApiResponse | null;
  error: string | null;
};

type ApiResponse = {
  weekData?: {
    days: {
      day: string;
      point: string;
      mains: BentoItem[];
      sides: BentoItem[];
    }[];
    shoppingList: string[];
    prepList: string[];
  };
  fiveData?: {
    name: string;
    description: string;
    makeAhead: string;
    point: string;
    mains: BentoItem[];
    sides: BentoItem[];
  }[];
};

/* =====================
   Gemini API 設定
===================== */

const genAI = new GoogleGenerativeAI(
  "YOUR_API_KEY_HERE" // ← ここにAPIキー
);

async function generateBentoMenu(
  mode: Mode,
  ingredients: string,
  grandma: string,
  usual: string
): Promise<ApiResponse> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `
あなたは日本の家庭料理に詳しい管理栄養士です。

条件:
- モード: ${mode}
- 手元の食材: ${ingredients || "未入力"}
- もらった野菜: ${grandma || "未入力"}
- 常備食材: ${usual}

JSON形式で以下を厳密に出力してください。
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return JSON.parse(text);
}

async function analyzeImage(
  base64: string,
  mimeType: string,
  mode: "receipt" | "food"
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-vision" });

  const prompt =
    mode === "receipt"
      ? "このレシートから食材名だけを日本語で列挙してください"
      : "この画像に写っている食材を日本語で列挙してください";

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
  ]);

  return result.response.text();
}

/* =====================
   App 本体
===================== */

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    mode: "week",
    ingredients: "",
    grandma_vegetables: "",
    usual_ingredients: "卵, 醤油, 酒, みりん, 砂糖, 油",
    loading: false,
    result: null,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFieldRef = useRef<"ingredients" | "grandma_vegetables" | null>(null);

  const handleGenerate = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await generateBentoMenu(
        state.mode,
        state.ingredients,
        state.grandma_vegetables,
        state.usual_ingredients
      );
      setState((s) => ({ ...s, result, loading: false }));
    } catch (e) {
      console.error(e);
      setState((s) => ({
        ...s,
        error: "献立の生成に失敗しました",
        loading: false,
      }));
    }
  };

  const onCameraClick = (field: "ingredients" | "grandma_vegetables") => {
    activeFieldRef.current = field;
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const field = activeFieldRef.current;
    if (!file || !field) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const result = await analyzeImage(
          base64,
          file.type,
          field === "ingredients" ? "receipt" : "food"
        );
        setState((s) => ({
          ...s,
          [field]: s[field] ? `${s[field]}, ${result}` : result,
        }));
      } catch {
        alert("画像解析に失敗しました");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleImageChange}
      />

      <h1 className="text-3xl font-bold text-orange-700 mb-6">
        お弁当献立アシスタント
      </h1>

      <textarea
        className="w-full p-3 border rounded mb-3"
        placeholder="手元にある食材"
        value={state.ingredients}
        onChange={(e) =>
          setState((s) => ({ ...s, ingredients: e.target.value }))
        }
      />

      <textarea
        className="w-full p-3 border rounded mb-3"
        placeholder="おばあちゃんの野菜"
        value={state.grandma_vegetables}
        onChange={(e) =>
          setState((s) => ({ ...s, grandma_vegetables: e.target.value }))
        }
      />

      <button
        onClick={handleGenerate}
        disabled={state.loading}
        className="w-full bg-orange-500 text-white py-3 rounded font-bold"
      >
        {state.loading ? "生成中..." : "献立を作る"}
      </button>

      {state.error && (
        <p className="text-red-500 mt-4">{state.error}</p>
      )}

      {state.result && (
        <pre className="mt-6 bg-gray-100 p-4 rounded text-xs overflow-auto">
          {JSON.stringify(state.result, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default App;
