import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// "-latest" aliases often hang or 503 under load, so the pinned model goes first.
const MODELS = ["gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.5-flash"];

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

    let text = "";
    let lastErr: unknown = null;

    for (const modelName of MODELS) {
      const model = genAI.getGenerativeModel({ model: modelName }, { timeout: 15000 });
      try {
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Audio, mimeType } },
        ]);
        text = result.response.text().trim().replace(/^["'«»]+|["'«»]+$/g, "");
        lastErr = null;
        break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    if (text === "" && lastErr) throw lastErr;
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("STT Error:", err);
    return NextResponse.json({ error: err.message || "STT қатесі" }, { status: 500 });
  }
}
