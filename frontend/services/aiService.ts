import { API_BASE_URL } from '../utils/apiConfig';
import { Member } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface MemberProfileContext {
  id?: string;
  name: string;
  gender?: string;
  dob?: string;
  weight?: number;
  height?: number;
  bmi?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  planName?: string;
  status?: string;
  notes?: string;
}

// Gemini AI Credentials & Candidate Models (Fast & High-Intelligence)
const DIRECT_GEMINI_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || "").trim();
const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest"
];

// Fallback Groq credentials
const DIRECT_GROQ_KEY = (process.env.EXPO_PUBLIC_GROQ_API_KEY || "").trim();
const GROQ_MODEL = "openai/gpt-oss-120b";

/**
 * Extracts normalized profile context from Member object
 */
export function extractMemberProfileContext(member?: Member | null, planName?: string): MemberProfileContext {
  if (!member) {
    return {
      name: 'Gym Member',
      gender: 'Not specified',
      planName: planName || 'Standard'
    };
  }

  const latestStat = member.bodyStatsLog && member.bodyStatsLog.length > 0
    ? member.bodyStatsLog[0]
    : undefined;

  return {
    id: member.id,
    name: member.name,
    gender: member.gender || 'Not specified',
    dob: member.dob,
    weight: latestStat?.weight,
    height: latestStat?.height,
    bmi: latestStat?.bmi,
    chest: latestStat?.chest,
    waist: latestStat?.waist,
    hips: latestStat?.hips,
    planName: planName || 'Active Membership',
    status: member.status,
    notes: member.notes
  };
}

/**
 * Helper to construct direct client prompt based on role and physical parameters
 */
function buildClientSystemPrompt(profile: MemberProfileContext, userRole: 'member' | 'trainer'): string {
  const bmiText = profile.bmi ? `${profile.bmi}` : 'Not measured';
  const weightText = profile.weight ? `${profile.weight} kg` : 'Not measured';
  const heightText = profile.height ? `${profile.height} cm` : 'Not measured';
  const measurements = `Chest: ${profile.chest || 'N/A'}", Waist: ${profile.waist || 'N/A'}", Hips: ${profile.hips || 'N/A'}"`;

  if (userRole === 'trainer') {
    return `You are an elite Exercise Physiologist & Head Trainer Assistant on SetuGym.
Assisting personal trainer with client: ${profile.name}, Gender: ${profile.gender}, Weight: ${weightText}, Height: ${heightText}, BMI: ${bmiText}, Measurements: ${measurements}.
Provide trainer-grade workout splits, periodization, sets/reps, RPE, rest times, and coaching cues tailored to these stats.`;
  }

  return `You are "Setu Coach", an energetic, motivating, and science-backed AI Personal Trainer on the SetuGym platform.
You are coaching member: ${profile.name}, Gender: ${profile.gender}, Weight: ${weightText}, Height: ${heightText}, BMI: ${bmiText}, Measurements: ${measurements}.
Directives:
1. Tailor every workout recommendation, exercise selection, intensity, and recovery advice to their BMI, weight, and body measurements.
2. If BMI is high or member is new, favor joint-friendly compound movements and safe progression. If leaner, focus on hypertrophy and strength.
3. Format workouts clearly with: **Exercise Name** | Sets x Reps | Rest | Form Tip.
4. Keep responses encouraging, concise, actionable, and formatted nicely with emojis and bolding for mobile screens.`;
}

/**
 * Direct Gemini API Generator with multi-model fallback
 */
async function callDirectGemini(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  if (!DIRECT_GEMINI_KEY) {
    throw new Error('Gemini API key is not configured.');
  }

  // Map messages to Gemini contents structure
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  let lastErr = '';

  for (const model of GEMINI_CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${DIRECT_GEMINI_KEY}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        lastErr = errJson.error?.message || `Model ${model} returned HTTP ${response.status}`;
        console.warn(`[Gemini AI] Model ${model} failed, trying next candidate:`, lastErr);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (e: any) {
      lastErr = e.message || String(e);
      console.warn(`[Gemini AI] Network issue with model ${model}:`, lastErr);
    }
  }

  throw new Error(lastErr || 'All Gemini models failed to generate content.');
}

/**
 * Send chat message to AI (Gemini primary -> Backend secondary -> Groq tertiary)
 */
export async function sendWorkoutChatMessage(
  messages: ChatMessage[],
  profile: MemberProfileContext,
  userRole: 'member' | 'trainer' = 'member'
): Promise<string> {
  const systemPrompt = buildClientSystemPrompt(profile, userRole);

  // 1. Primary: Direct Google Gemini API (Instant, standalone on device without backend dependency)
  try {
    const geminiReply = await callDirectGemini(messages, systemPrompt);
    if (geminiReply) {
      return geminiReply;
    }
  } catch (err: any) {
    console.warn('[AI Service] Direct Gemini call failed, attempting backend endpoint:', err?.message || err);
  }

  // 2. Secondary: Try Backend Express API
  const payloadMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: payloadMessages,
        memberProfile: profile,
        userRole
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.message?.content) {
        return data.message.content;
      }
    }
    console.warn('[AI Service] Backend call returned non-OK or empty, initiating Groq fallback');
  } catch (err) {
    console.warn('[AI Service] Backend call failed/timed out, switching to Groq fallback:', err);
  }

  // 3. Tertiary: Direct Groq API Fallback if key available
  if (DIRECT_GROQ_KEY) {
    try {
      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...payloadMessages
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DIRECT_GROQ_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: groqMessages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply;
      }
    } catch (err) {
      console.warn('[AI Service] Groq fallback failed:', err);
    }
  }

  throw new Error('Unable to connect to Setu AI Coach. Please check your internet connection and try again.');
}
