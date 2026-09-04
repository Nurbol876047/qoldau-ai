import { NextRequest, NextResponse } from "next/server";
import { EdgeTTS } from 'edge-tts-universal';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Мәтін берілмеді" }, { status: 400 });
    }
    
    // 'kk-KZ-AigulNeural' (Female) or 'kk-KZ-DauletNeural' (Male)
    const tts = new EdgeTTS(text, 'kk-KZ-AigulNeural'); 
    const result = await tts.synthesize();
    const arrayBuffer = await result.audio.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache"
      }
    });
  } catch (err: any) {
    console.error("TTS Error:", err);
    return NextResponse.json({ error: err.message || "TTS қатесі" }, { status: 500 });
  }
}
