import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-3.5-flash"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob | null;

    if (!audioFile) {
      return NextResponse.json({ error: "Аудио файл табылмады" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    if (arrayBuffer.byteLength < 1200) {
      return NextResponse.json({ text: "" }); // too short = nothing said
    }
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audioFile.type || "audio/webm";

    const prompt =
      "Бұл аудиода қазақ тілінде не айтылды? Тек естілген сөздерді немесе сөйлемді " +
      "мәтін ретінде қайтар. Ешқандай артық түсініктеме, тырнақша немесе белгі қоспа. " +
      "Егер ешнәрсе анық естілмесе, бос жол қайтар.";

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let text = "";
    let lastErr: unknown = null;

    outer: for (const modelName of MODELS) {
      const model = genAI.getGenerativeModel({ model: modelName });
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Audio, mimeType } },
          ]);
          text = result.response.text().trim().replace(/^["'«»]+|["'«»]+$/g, "");
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

    if (text === "" && lastErr) throw lastErr;
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("STT Error:", err);
    return NextResponse.json({ error: err.message || "STT қатесі" }, { status: 500 });
  }
}
