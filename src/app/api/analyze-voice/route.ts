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

    // Use Gemini 1.5 Flash for fast multimodal processing
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert speech-language pathologist evaluating a user pronouncing a word.
      The user is trying to pronounce the target word: "${targetWord}" in ${lang === 'KZ' ? 'Kazakh' : 'Russian'}.
      Listen to the audio carefully. Transcribe what the user actually said.
      Evaluate if they pronounced the target word correctly.
      Return the result strictly as a JSON object with this exact structure:
      {
        "recognizedText": "what you heard",
        "isCorrect": true/false,
        "accuracy": a number from 0 to 100 representing how close the pronunciation is
      }
      Do not include any other text, markdown formatting, or explanation. Just the raw JSON.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio
        }
      },
      prompt
    ]);

    const responseText = result.response.text();
    // Clean the response text to ensure it's just JSON
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json({
      recognizedText: data.recognizedText,
      targetWord,
      isCorrect: data.isCorrect,
      accuracy: data.accuracy
    });
  } catch (error) {
    console.error('Gemini STT API Error:', error);
    return NextResponse.json({ error: 'Failed to analyze audio' }, { status: 500 });
  }
}
