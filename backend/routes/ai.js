const express = require('express');
const router = express.Router();
require('dotenv').config();

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

/**
 * Calculate age helper
 */
function calculateAge(dobString) {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Determine BMI Category
 */
function getBmiCategory(bmi) {
  if (!bmi || isNaN(bmi)) return 'Not recorded';
  if (bmi < 18.5) return 'Underweight (< 18.5)';
  if (bmi < 25) return 'Normal weight (18.5 - 24.9)';
  if (bmi < 30) return 'Overweight (25 - 29.9)';
  return 'Obese (>= 30)';
}

/**
 * Build System Prompt based on Member Profile and Role
 */
function buildSystemPrompt(memberProfile = {}, userRole = 'member') {
  const age = calculateAge(memberProfile.dob);
  const bmiCat = getBmiCategory(memberProfile.bmi);

  let profileSection = `### 👤 MEMBER PROFILE & PHYSIOLOGY
- Name: ${memberProfile.name || 'Member'}
- Gender: ${memberProfile.gender || 'Not specified'}
- Age: ${age ? `${age} years old` : (memberProfile.dob || 'Not specified')}
- Weight: ${memberProfile.weight ? `${memberProfile.weight} kg` : 'Not recorded'}
- Height: ${memberProfile.height ? `${memberProfile.height} cm` : 'Not recorded'}
- Calculated BMI: ${memberProfile.bmi ? `${memberProfile.bmi} (${bmiCat})` : 'Not calculated'}
- Measurements: Chest: ${memberProfile.chest ? `${memberProfile.chest}"` : 'N/A'}, Waist: ${memberProfile.waist ? `${memberProfile.waist}"` : 'N/A'}, Hips: ${memberProfile.hips ? `${memberProfile.hips}"` : 'N/A'}
- Membership Plan: ${memberProfile.planName || 'Active Membership'}
- Notes/Status: ${memberProfile.notes || memberProfile.status || 'Active Member'}`;

  if (userRole === 'trainer') {
    return `You are an elite Strength & Conditioning Specialist, Exercise Physiologist, and Head Trainer Assistant for the SetuGym Platform.
You are assisting a Personal Trainer in designing periodized, science-backed workout plans and exercise prescriptions for their client.

${profileSection}

### 🏋️ YOUR DIRECTIVES:
1. Provide professional, trainer-grade advice: sets, rep schemes, RPE / rest periods, exercise regressions/progressions, and injury-prevention cues.
2. Align all workout volumes, intensity, and biomechanical choices with the client's current BMI, weight, and fitness parameters.
3. When providing a routine, organize it cleanly:
   - Split (e.g. Push/Pull/Legs, Upper/Lower, Full Body)
   - Exercise Name
   - Sets x Reps (e.g. 3 x 8-12)
   - Rest Interval (e.g. 60-90s)
   - Key Coaching Cue / Form Note
4. Keep the tone knowledgeable, professional, and practical for immediate gym execution.`;
  }

  // Member role
  return `You are "Setu Coach", an elite friendly AI Personal Trainer & Workout Specialist on the SetuGym Platform.
Your goal is to guide this gym member with personalized, motivating, and highly effective workout advice tailored to their exact body profile.

${profileSection}

### 🎯 YOUR DIRECTIVES:
1. Personalize all workout suggestions to their weight, height, BMI (${bmiCat}), and gender.
   - If BMI indicates overweight/obese or a beginner profile: emphasize joint-friendly compound movements, proper warmup, safe cardiovascular conditioning, and progressive overload without risking injury.
   - If BMI indicates underweight: emphasize strength building, hypertrophy (8-12 reps), compound lifts, and adequate recovery.
   - If BMI is in the normal range: tailor to their stated goals (e.g., strength, endurance, muscle tone, or athletic performance).
2. When suggesting a workout routine, format it with clear, attractive bullet points:
   - **Exercise Name** | Sets x Reps | Rest Time
   - 💡 Form tip or why it's effective for them
3. Maintain an inspiring, supportive, and energetic gym-coach vibe.
4. Keep answers concise, actionable, and formatted nicely for mobile screens with bold headers and emojis.`;
}

/**
 * POST /ai/chat
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages = [], memberProfile = {}, userRole = 'member', customPrompt } = req.body;

    const apiKey = GROQ_API_KEY || (process.env.GROQ_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({
        error: 'GROQ_API_KEY is not configured in backend environment.'
      });
    }

    const systemPrompt = customPrompt || buildSystemPrompt(memberProfile, userRole);

    // Prepare conversation messages for Groq OpenAI-compatible format
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '')
      }))
    ];

    const candidateModels = [
      GROQ_MODEL,
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b'
    ].filter((v, i, a) => a.indexOf(v) === i); // unique

    let data = null;
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: groqMessages,
            temperature: 0.7,
            max_tokens: 800
          })
        });

        const json = await response.json();
        if (response.ok && json.choices?.[0]?.message?.content) {
          data = json;
          break;
        } else {
          lastError = json.error?.message || `Model ${model} returned ${response.status}`;
          console.warn(`[Groq AI] Model ${model} failed, trying next candidate:`, lastError);
        }
      } catch (e) {
        lastError = e.message;
        console.warn(`[Groq AI] Error with model ${model}:`, e.message);
      }
    }

    if (!data) {
      return res.status(500).json({
        error: lastError || 'Failed to generate response from Groq AI',
        details: lastError
      });
    }

    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    res.json({
      success: true,
      message: {
        role: 'assistant',
        content: reply
      },
      model: data.model || GROQ_MODEL,
      usage: data.usage
    });
  } catch (err) {
    console.error('[AI Chat Endpoint Error]:', err);
    res.status(500).json({
      error: 'An internal server error occurred while processing your workout AI request.',
      message: err.message
    });
  }
});

module.exports = router;
