import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;
    
    if (!audioFile) {
      return NextResponse.json({ error: "Аудио файл табылмады" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Бұл дыбыста қандай сөз айтылды? Тек қана естілген сөзді немесе сөйлемді мәтін ретінде қайтар. Басқа артық сөз қоспа.";
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Audio,
          mimeType: audioFile.type || "audio/webm"
        }
      }
    ]);
    
    const text = result.response.text().trim();
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("STT Error:", err);
    return NextResponse.json({ error: err.message || "STT қатесі" }, { status: 500 });
  }
}
