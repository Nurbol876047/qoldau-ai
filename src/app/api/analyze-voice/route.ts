import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with the provided API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const normalize = (s: string) => s.toUpperCase().replace(/Ё/g, 'Е').replace(/[^\p{L}]/gu, '');

// 0–100: letter-level Levenshtein similarity between what was heard and the target.
function similarity(heard: string, target: string): number {
  const a = normalize(heard);
  const b = normalize(target);
  if (!a || !b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return Math.round((1 - prev[b.length] / Math.max(a.length, b.length)) * 100);
}

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

    // The target word is deliberately NOT given to the model: when it knows the target,
    // it "hears" that word regardless of what was said. Grading happens below in code.
    const langName = lang === 'KZ' ? 'Kazakh' : 'Russian';
    const prompt = `
      A child is saying ONE word in ${langName}. Transcribe exactly what you hear,
      in ${langName} Cyrillic script, uppercase. Write the sounds actually pronounced —
      do not correct them into a different word you think was intended.
      If the audio is empty, silence, or just noise, return an empty string.

      Respond with ONLY this JSON (no markdown):
      { "recognizedText": "string" }
    `;

    // "-latest" aliases often hang or 503 under load, so the pinned model goes first
    // and every call is time-boxed; on any failure fall through to the next model.
    const MODELS = ["gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.5-flash"];

    let responseText = "";
    let lastErr: any = null;
    for (const modelName of MODELS) {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        },
        { timeout: 15000 },
      );
      try {
        const result = await model.generateContent([
          { inlineData: { mimeType, data: base64Audio } },
          prompt,
        ]);
        responseText = result.response.text();
        break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    if (!responseText) throw lastErr || new Error("No response from model");
    const jsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let data: { recognizedText?: string };
    try {
      data = JSON.parse(jsonStr);
    } catch {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error(`Model returned non-JSON: ${jsonStr.slice(0, 200)}`);
      data = JSON.parse(match[0]);
    }

    const recognizedText = (data.recognizedText ?? '').trim();
    const accuracy = similarity(recognizedText, targetWord);

    return NextResponse.json({
      recognizedText,
      targetWord,
      isCorrect: accuracy >= 60,
      accuracy,
    });
  } catch (error: any) {
    console.error('Gemini STT API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze audio' }, { status: 500 });
  }
}
