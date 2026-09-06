import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_INSTRUCTION = `
Сен — "Қолдау" деген атпен танылатын мейірімді досың. Сен 5-10 жас аралығындағы
баламен қазақ тілінде сөйлеу дағдысын жаттықтырасың.

Ережелер:
- Әрдайым қысқа сөйле: 1-2 қарапайым сөйлем.
- Баланы көбірек сөйлеуге ынталандыр: жауабыңды үнемі бір қарапайым сұрақпен аяқта.
- Мейірімді, көңілді бол. Баланы мадақта ("Жарайсың!", "Керемет айттың!").
- Егер бала қатемен сөйлесе, ұрыспа. Дұрыс нұсқасын жайлап қайталап көрсет.
- Тек ауызекі, түсінікті сөздер қолдан. Эмодзи қоспа, таза мәтін жаз.
- Ешқашан ұзақ лекция оқыма.
`;

const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-3.5-flash"];

export async function POST(req: NextRequest) {
  try {
    const { text, history } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Мәтін берілмеді" }, { status: 400 });
    }

    const contents: Content[] = Array.isArray(history)
      ? history
          .filter((m: any) => m && typeof m.text === "string")
          .slice(-10)
          .map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.text }],
          }))
      : [];
    contents.push({ role: "user", parts: [{ text }] });

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let reply = "";
    let lastErr: unknown = null;

    outer: for (const modelName of MODELS) {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
      });
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await model.generateContent({ contents });
          reply = result.response.text().trim();
          break outer;
        } catch (err: any) {
          lastErr = err;
          const status = err?.status ?? 0;
          if (status === 503 || status === 429 || status === 500) {
            await sleep(500 * (attempt + 1));
            continue;
          }
          break;
        }
      }
    }

    if (!reply) throw lastErr || new Error("No response");
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat LLM Error:", err);
    return NextResponse.json({ error: err.message || "Генерация қатесі" }, { status: 500 });
  }
}
