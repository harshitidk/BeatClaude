/**
 * Assessment Generator — LLM-powered test generation
 *
 * Takes a parsed JD schema and generates a 12-question staged assessment
 * (3 stages × 4 questions) following progressive cognitive escalation.
 */

import { ParsedJDSchema } from './gemini';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.1-70b-instruct';

// ─── Types ──────────────────────────────────────────────

export interface GeneratedQuestion {
    question_type: 'mcq' | 'short_structured' | 'hybrid_choice_justification';
    prompt_text: string;
    options: Array<{ id: string; label: string }>;
    char_limit: number | null;
    scoring_hint: string;
    internal_intent: 'baseline' | 'application' | 'judgment' | 'depth';
}

export interface GeneratedStage {
    stage_index: number;
    questions: GeneratedQuestion[];
}

export interface GeneratedAssessment {
    assessment_meta: {
        source_schema: ParsedJDSchema;
        duration_seconds: number;
    };
    stages: GeneratedStage[];
}

// ─── Prompt ─────────────────────────────────────────────

function buildTestGenerationPrompt(schema: ParsedJDSchema): string {
    return `You are an expert assessment designer and hiring analyst. Given the parsed schema below (JSON), generate a 12-question assessment grouped into 3 stages (stage_index 1..3). Follow these rules exactly:

- Output only valid JSON matching the structure below.
- Each stage must contain exactly 4 questions.
- ENFORCE EXACT COMPOSITION: 8 MCQs and 4 short answers total.
- Stage 1 MUST contain exactly 4 MCQs.
- Stage 2 MUST contain exactly 4 MCQs.
- Stage 3 MUST contain exactly 4 short_structured questions.
- Question fields:
  - question_type: one of ["mcq","short_structured","hybrid_choice_justification"]
  - prompt_text: string
  - options: array for mcq (max 4 options, each with "id", "label", and exactly one with "is_correct": true), otherwise []
  - char_limit: integer for short_structured (300-400), null for MCQs
  - scoring_hint: 1-2 line string describing how to grade answers qualitatively
  - internal_intent: one of ["baseline","application","judgment","depth"]
- MCQ Style: Make them highly detailed, scenario-specific, and deeply technical. Never ask basic or beginner-level definition questions. Present complex real-world situational problems where the candidate must analyze the context to choose the best solution.
- Short Structured Style: Must be subjective experience-based questions rather than textbook answers.
- Keep prompts compact (do not include extra explanation).
- Do not include difficulty labels in candidate-facing prompts.
- For MCQ options, use ids like "a", "b", "c", "d".

Output JSON structure:
{
 "assessment_meta": { "source_schema": <the schema you received>, "duration_seconds": 1800 },
 "stages": [
   { "stage_index": 1, "questions": [ { "question_type": "", "prompt_text": "", "options": [], "char_limit": null, "scoring_hint": "", "internal_intent": "baseline" }, ... ] },
   { "stage_index": 2, "questions": [ ... ] },
   { "stage_index": 3, "questions": [ ... ] }
 ]
}

Parsed schema:
${JSON.stringify(schema, null, 2)}`;
}

// ─── Validation ─────────────────────────────────────────

const VALID_QUESTION_TYPES = ['mcq', 'short_structured', 'hybrid_choice_justification'];
const VALID_INTENTS = ['baseline', 'application', 'judgment', 'depth'];

export interface AssessmentValidation {
    valid: boolean;
    errors: string[];
}

export function validateGeneratedAssessment(data: GeneratedAssessment): AssessmentValidation {
    const errors: string[] = [];

    if (!data.stages || !Array.isArray(data.stages)) {
        errors.push('Missing or invalid stages array');
        return { valid: false, errors };
    }

    if (data.stages.length !== 3) {
        errors.push(`Expected 3 stages, got ${data.stages.length}`);
    }

    let totalQuestions = 0;

    for (const stage of data.stages) {
        if (!stage.questions || !Array.isArray(stage.questions)) {
            errors.push(`Stage ${stage.stage_index}: missing questions array`);
            continue;
        }

        if (stage.questions.length !== 4) {
            errors.push(`Stage ${stage.stage_index}: expected 4 questions, got ${stage.questions.length}`);
        }

        totalQuestions += stage.questions.length;

        for (let i = 0; i < stage.questions.length; i++) {
            const q = stage.questions[i];

            if (!VALID_QUESTION_TYPES.includes(q.question_type)) {
                errors.push(`Stage ${stage.stage_index} Q${i + 1}: invalid question_type "${q.question_type}"`);
            }

            if (!q.prompt_text || q.prompt_text.trim().length === 0) {
                errors.push(`Stage ${stage.stage_index} Q${i + 1}: empty prompt_text`);
            }

            if ((q.question_type === 'mcq' || q.question_type === 'hybrid_choice_justification') &&
                (!q.options || q.options.length === 0)) {
                errors.push(`Stage ${stage.stage_index} Q${i + 1}: ${q.question_type} requires options`);
            }

            if (!VALID_INTENTS.includes(q.internal_intent)) {
                errors.push(`Stage ${stage.stage_index} Q${i + 1}: invalid internal_intent "${q.internal_intent}"`);
            }
        }
    }

    if (totalQuestions !== 12) {
        errors.push(`Expected 12 total questions, got ${totalQuestions}`);
    }

    return { valid: errors.length === 0, errors };
}

// ─── API Call ───────────────────────────────────────────

export async function generateAssessment(schema: ParsedJDSchema): Promise<{
    assessment: GeneratedAssessment;
    validation: AssessmentValidation;
    rawResponse: string;
}> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        throw new Error('NVIDIA_API_KEY is not configured');
    }

    const prompt = buildTestGenerationPrompt(schema);

    const callLLM = async (): Promise<string> => {
        const response = await fetch(NVIDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                top_p: 1,
                max_tokens: 8192,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NVIDIA API error (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        const rawText = result.choices?.[0]?.message?.content;
        if (!rawText) throw new Error('No content in NVIDIA API response');
        return rawText;
    };

    // First attempt
    let rawText = await callLLM();
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let assessment: GeneratedAssessment;
    try {
        assessment = JSON.parse(jsonStr);
    } catch {
        // Retry once on parse failure
        rawText = await callLLM();
        jsonStr = rawText.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        try {
            assessment = JSON.parse(jsonStr);
        } catch {
            throw new Error(`AI returned invalid JSON after retry: ${jsonStr.slice(0, 300)}`);
        }
    }

    let validation = validateGeneratedAssessment(assessment);

    // If validation fails, retry once
    if (!validation.valid) {
        rawText = await callLLM();
        jsonStr = rawText.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        try {
            assessment = JSON.parse(jsonStr);
            validation = validateGeneratedAssessment(assessment);
        } catch {
            throw new Error(`AI returned invalid JSON on retry: ${jsonStr.slice(0, 300)}`);
        }
    }

    return { assessment, validation, rawResponse: rawText };
}

// ─── Scoring Prompt ─────────────────────────────────────

export interface StageScore {
    stage_index: number;
    score: number; // 0-10
    feedback: string;
}

export interface ScoringOutput {
    stages: StageScore[];
    overall_score: number; // 0-10
    recommendation: 'Advance' | 'Hold' | 'Reject';
    explanation: string;
}

export function buildScoringPrompt(
    stagesToScore: number[],
    questions: Array<{ id: string; stage: number; type: string; prompt: string; options: string }>,
    answers: Array<{ questionId: string; answerText: string; selectedOptionId: string }>
): string {
    const qaPairs = questions.map(q => {
        const answer = answers.find(a => a.questionId === q.id);
        return {
            stage: q.stage,
            type: q.type,
            prompt: q.prompt,
            answer: answer?.answerText || answer?.selectedOptionId || '(no answer)',
        };
    });

    return `You are a deterministic assessment scorer. Evaluate the candidate's answers as a whole and per stage.

Rules:
- Output ONLY valid JSON.
- Provide a score (0-10) and 1-sentence feedback for EACH of the following stages: ${stagesToScore.join(', ')}.
- Provide an explanation paragraph summarizing their overall strengths and weaknesses based on the provided answers.

Output JSON:
{
  "stages": [ { "stage_index": X, "score": 0.0, "feedback": "" } ],
  "explanation": ""
}

Questions and Answers:
${JSON.stringify(qaPairs, null, 2)}`;
}

export async function scoreSubmission(
    questions: Array<{ id: string; stage: number; type: string; prompt: string; options: string }>,
    answers: Array<{ questionId: string; answerText: string; selectedOptionId: string }>
): Promise<{ scoring: ScoringOutput; rawResponse: string }> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured');

    const dtStages: StageScore[] = [];
    const llmQuestions: Array<any> = [];

    // Group questions by stage
    const stages = [1, 2, 3];
    for (const s of stages) {
        const stageQs = questions.filter(q => q.stage === s);
        if (stageQs.length === 0) continue;

        // If the stage is strictly MCQs, score it deterministically
        const allMcq = stageQs.every(q => q.type === 'mcq');
        if (allMcq) {
            let correctCount = 0;
            for (const q of stageQs) {
                try {
                    const options = JSON.parse(q.options || '[]');
                    const correctOption = options.find((o: any) => o.is_correct);
                    const ans = answers.find(a => a.questionId === q.id);
                    if (correctOption && ans?.selectedOptionId === correctOption.id) {
                        correctCount++;
                    }
                } catch { }
            }
            const score = Math.round((correctCount / stageQs.length) * 10 * 10) / 10;
            dtStages.push({
                stage_index: s,
                score,
                feedback: `Candidate answered ${correctCount} out of ${stageQs.length} multiple choice questions correctly.`
            });
        } else {
            llmQuestions.push(...stageQs);
        }
    }

    const llmStagesToScore = stages.filter(s => !dtStages.find(d => d.stage_index === s) && questions.some(q => q.stage === s));

    let llmStages: StageScore[] = [];
    let explanation = "Assessment evaluated successfully based on objective multiple choice scoring.";
    let rawText = "Deterministic scoring only. No LLM call required.";

    if (llmQuestions.length > 0) {
        const prompt = buildScoringPrompt(llmStagesToScore, llmQuestions, answers);

        const response = await fetch(NVIDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                top_p: 1,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NVIDIA API error (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        rawText = result.choices?.[0]?.message?.content;
        if (!rawText) throw new Error('No content in scoring response');

        let jsonStr = rawText.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const llmScoring = JSON.parse(jsonStr);
        if (llmScoring.stages) llmStages = llmScoring.stages;
        if (llmScoring.explanation) explanation = llmScoring.explanation;
    }

    // Combine stages
    const finalStages = [...dtStages, ...llmStages].sort((a, b) => a.stage_index - b.stage_index);

    // Compute overall score & recommendation
    const sum = finalStages.reduce((acc, s) => acc + s.score, 0);
    const overall_score = Math.round((sum / Math.max(1, finalStages.length)) * 10) / 10;

    let recommendation: 'Advance' | 'Hold' | 'Reject' = 'Reject';
    if (overall_score >= 7.0) recommendation = 'Advance';
    else if (overall_score >= 5.0) recommendation = 'Hold';

    return {
        scoring: {
            stages: finalStages,
            overall_score,
            recommendation,
            explanation,
        },
        rawResponse: rawText
    };
}
