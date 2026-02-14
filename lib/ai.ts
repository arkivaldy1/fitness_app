import Constants from 'expo-constants';

// Get API key from environment
const getApiKey = (): string | null => {
  return Constants.expoConfig?.extra?.anthropicApiKey ||
         process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
         null;
};

export interface ProgramRequest {
  goal: 'build_muscle' | 'lose_fat' | 'gain_strength' | 'general_fitness';
  daysPerWeek: number;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  sessionDuration: number; // minutes
  equipment: ('barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight')[];
  focusAreas?: string[];
  injuries?: string;
}

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
}

export interface GeneratedWorkout {
  name: string;
  dayOfWeek: string;
  targetDuration: number;
  exercises: GeneratedExercise[];
}

export interface GeneratedProgram {
  name: string;
  description: string;
  weeklySchedule: string;
  workouts: GeneratedWorkout[];
  tips: string[];
}

const SYSTEM_PROMPT = `You are an expert strength and conditioning coach with decades of experience designing effective workout programs. You create science-based, periodized programs tailored to individual goals and constraints.

When generating programs:
- Follow proven training principles (progressive overload, specificity, recovery)
- Balance push/pull/legs movements appropriately
- Include proper warm-up recommendations
- Consider exercise selection based on available equipment
- Adjust volume and intensity for experience level
- Prioritize compound movements for efficiency

Always respond with valid JSON matching the exact schema requested.`;

const buildUserPrompt = (request: ProgramRequest): string => {
  const goalDescriptions = {
    build_muscle: 'building muscle mass (hypertrophy)',
    lose_fat: 'losing fat while maintaining muscle',
    gain_strength: 'increasing maximal strength',
    general_fitness: 'improving overall fitness and health',
  };

  const equipmentList = request.equipment.join(', ');
  const focusAreasText = request.focusAreas?.length
    ? `Focus areas: ${request.focusAreas.join(', ')}.`
    : '';
  const injuriesText = request.injuries
    ? `Injuries/limitations to work around: ${request.injuries}.`
    : '';

  return `Create a ${request.daysPerWeek}-day per week workout program for someone with the following profile:

- Goal: ${goalDescriptions[request.goal]}
- Experience Level: ${request.experienceLevel}
- Available Training Days: ${request.daysPerWeek} days per week
- Session Duration: ~${request.sessionDuration} minutes per session
- Available Equipment: ${equipmentList}
${focusAreasText}
${injuriesText}

Generate a complete weekly program with specific exercises, sets, reps, and rest periods.

Respond ONLY with valid JSON in this exact format:
{
  "name": "Program Name",
  "description": "Brief 1-2 sentence description of the program",
  "weeklySchedule": "e.g., Mon/Wed/Fri or Mon/Tue/Thu/Fri",
  "workouts": [
    {
      "name": "Workout Name (e.g., Upper Body A)",
      "dayOfWeek": "Monday",
      "targetDuration": 45,
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": "8-10",
          "restSeconds": 90,
          "notes": "Optional form cue or tip"
        }
      ]
    }
  ],
  "tips": ["Tip 1 for success", "Tip 2", "Tip 3"]
}

Include 4-8 exercises per workout. Ensure the program is balanced and follows sound training principles.`;
};

// Use direct fetch instead of SDK for React Native compatibility
export const generateProgram = async (request: ProgramRequest): Promise<GeneratedProgram> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('API key not configured. Add EXPO_PUBLIC_ANTHROPIC_API_KEY to your environment.');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(request),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract text content
    const textContent = data.content?.find((block: { type: string }) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const program: GeneratedProgram = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!program.name || !program.workouts || program.workouts.length === 0) {
      throw new Error('Invalid program structure');
    }

    return program;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate program: ${error.message}`);
    }
    throw new Error('Failed to generate program');
  }
};

export const isAIConfigured = (): boolean => {
  return !!getApiKey();
};
