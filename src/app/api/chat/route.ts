import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Мәтін берілмеді" }, { status: 400 });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Сен мейірімді, көңілді әрі ақылды көмекшісің. Қолданушымен ауызекі тілде, өте қысқа (1-2 сөйлем) жауап бер. Қолданушының сөзі: "${text}"`;
    
    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();
    
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat LLM Error:", err);
    return NextResponse.json({ error: err.message || "Генерация қатесі" }, { status: 500 });
  }
}
