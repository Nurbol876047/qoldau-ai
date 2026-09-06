import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with the provided API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const targetWord = formData.get('targetWord') as string;
    const lang = formData.get('lang') as string || 'KZ';
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = audioFile.type || 'audio/webm';

    const langName = lang === 'KZ' ? 'Kazakh' : 'Russian';
    const prompt = `
      You are an expert speech-language pathologist assessing a CHILD who is learning to
      pronounce a single word in ${langName}.
      Target word: "${targetWord}".

      Listen to the audio and:
      1. Transcribe exactly what the child said (in ${langName} script, uppercase).
      2. Decide whether the child said the target word and how clearly.
      3. Be encouraging but honest: minor accent/childish softness is still "correct";
         a clearly different word or missing key sounds is "incorrect".
      4. If the audio is empty, silence, or just noise, set recognizedText to "" and accuracy 0.

      Respond with ONLY this JSON (no markdown):
      {
        "recognizedText": "string",
        "isCorrect": boolean,
        "accuracy": number  // 0-100, how close the pronunciation is to the target
      }
    `;

    // Try a few models with retry/backoff — Gemini free tier returns 503 under load.
    const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-lite-latest"];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let responseText = "";
    let lastErr: any = null;
    outer: for (const modelName of MODELS) {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      });
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await model.generateContent([
            { inlineData: { mimeType, data: base64Audio } },
            prompt,
          ]);
          responseText = result.response.text();
          break outer;
        } catch (err: any) {
          lastErr = err;
          const status = err?.status ?? 0;
          if (status === 503 || status === 429 || status === 500) {
            await sleep(600 * (attempt + 1));
            continue;
          }
          break; // non-retryable — move to next model
        }
      }
    }

    if (!responseText) throw lastErr || new Error("No response from model");
    const jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let data: { recognizedText?: string; isCorrect?: boolean; accuracy?: number };
    try {
      data = JSON.parse(jsonStr);
    } catch {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error(`Model returned non-JSON: ${jsonStr.slice(0, 200)}`);
      data = JSON.parse(match[0]);
    }

    const accuracy = Math.max(0, Math.min(100, Number(data.accuracy) || 0));

    return NextResponse.json({
      recognizedText: data.recognizedText ?? '',
      targetWord,
      isCorrect: data.isCorrect ?? accuracy >= 60,
      accuracy,
    });
  } catch (error: any) {
    console.error('Gemini STT API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze audio' }, { status: 500 });
  }
}
