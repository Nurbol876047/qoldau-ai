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

// "-latest" aliases often hang or 503 under load, so the pinned model goes first.
const MODELS = ["gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.5-flash"];

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

    let reply = "";
    let lastErr: unknown = null;

    for (const modelName of MODELS) {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          systemInstruction: SYSTEM_INSTRUCTION,
          generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
        },
        { timeout: 15000 },
      );
      try {
        const result = await model.generateContent({ contents });
        reply = result.response.text().trim();
        break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    if (!reply) throw lastErr || new Error("No response");
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat LLM Error:", err);
    return NextResponse.json({ error: err.message || "Генерация қатесі" }, { status: 500 });
  }
}
