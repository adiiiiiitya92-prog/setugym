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

const DIRECT_GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || "";
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
 * Helper to construct direct client prompt if backend fallback is triggered
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

  return `You are "Setu Coach", a friendly and motivating AI Personal Trainer on the SetuGym platform.
You are coaching member: ${profile.name}, Gender: ${profile.gender}, Weight: ${weightText}, Height: ${heightText}, BMI: ${bmiText}, Measurements: ${measurements}.
Directives:
1. Tailor every workout recommendation, exercise selection, intensity, and recovery advice to their BMI, weight, and body measurements.
2. If BMI is high or member is new, favor joint-friendly compound movements and safe progression. If leaner, focus on hypertrophy and strength.
3. Format workouts clearly with: **Exercise Name** | Sets x Reps | Rest | Form Tip.
4. Keep responses encouraging, concise, actionable, and formatted nicely with emojis and bolding for mobile screens.`;
}

/**
 * Send chat message to AI
 */
export async function sendWorkoutChatMessage(
  messages: ChatMessage[],
  profile: MemberProfileContext,
  userRole: 'member' | 'trainer' = 'member'
): Promise<string> {
  const payloadMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  // 1. Try Backend Express API first
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
    console.warn('[AI Service] Backend call returned non-OK or empty, initiating direct Groq fallback');
  } catch (err) {
    console.warn('[AI Service] Backend call failed/timed out, switching to direct Groq fallback:', err);
  }

  // 2. Direct Groq API Fallback (Guarantees responsiveness even in offline backend or device networking issues)
  try {
    const systemPrompt = buildClientSystemPrompt(profile, userRole);
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

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Groq API responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I couldn't generate a workout recommendation right now. Please try again.";
  } catch (err: any) {
    console.error('[AI Service] Both backend and direct Groq calls failed:', err);
    throw new Error(err.message || 'Unable to connect to AI Coach. Please check your internet connection.');
  }
}
