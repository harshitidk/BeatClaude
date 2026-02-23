/**
 * AI Client — JD Dissection Pipeline (NVIDIA API)
 *
 * 3-Layer Reduction:
 * 1. Role Classification (function, seniority, decision style)
 * 2. Competency Extraction (4-6 weighted competencies)
 * 3. Tooling & Constraints (context, not signal)
 */

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.1-70b-instruct';

// ─── Canonical JD Schema ────────────────────────────────

export interface ParsedJDSchema {
    function: string;
    role_family: string;
    seniority: string;
    decision_context: string;
    core_competencies: Array<{ name: string; weight: number }>;
    tools: string[];
    constraints: string[];
    confidence_score: number;
}

// ─── Production Prompt ──────────────────────────────────

function buildPrompt(jd: string): string {
    return `You are an expert hiring analyst.

Your task is to dissect the following job description into a structured hiring schema.

Rules:
- Ignore generic HR fluff and cultural statements.
- Focus on what would differentiate a strong candidate from a weak one.
- Limit core competencies to a maximum of 5.
- Assign weights that sum to 1.0.
- Be decisive. Do not hedge.
- "function" must be one of: "Marketing", "Finance", "HR", "Operations", "Engineering", "Design", "Sales", "Other"
- "seniority" must be one of: "Entry", "Mid", "Senior"
- confidence_score should be between 0 and 1

Output ONLY valid JSON in the following schema (no markdown, no explanation, no text before or after):
{
  "function": "",
  "role_family": "",
  "seniority": "",
  "decision_context": "",
  "core_competencies": [
    { "name": "", "weight": 0 }
  ],
  "tools": [],
  "constraints": [],
  "confidence_score": 0
}

Job Description:
${jd}`;
}

// ─── Validation Layer ───────────────────────────────────

const VALID_FUNCTIONS = [
    'Marketing', 'Finance', 'HR', 'Operations',
    'Engineering', 'Design', 'Sales', 'Other',
];
const VALID_SENIORITY = ['Entry', 'Mid', 'Senior'];

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateParsedJD(data: ParsedJDSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check function enum
    if (!VALID_FUNCTIONS.includes(data.function)) {
        errors.push(`Invalid function "${data.function}". Must be one of: ${VALID_FUNCTIONS.join(', ')}`);
    }

    // Check seniority enum
    if (!VALID_SENIORITY.includes(data.seniority)) {
        errors.push(`Invalid seniority "${data.seniority}". Must be one of: ${VALID_SENIORITY.join(', ')}`);
    }

    // Check competencies count
    if (!data.core_competencies || data.core_competencies.length === 0) {
        errors.push('No competencies extracted');
    } else if (data.core_competencies.length > 5) {
        errors.push(`Too many competencies (${data.core_competencies.length}). Maximum is 5`);
    }

    // Check weights sum to 1.0
    if (data.core_competencies && data.core_competencies.length > 0) {
        const weightSum = data.core_competencies.reduce((sum, c) => sum + c.weight, 0);
        if (Math.abs(weightSum - 1.0) > 0.05) {
            errors.push(`Competency weights sum to ${weightSum.toFixed(2)}, not 1.0`);
        }
    }

    // Check competencies are abstract (not tools)
    const toolLikePatterns = /^(excel|word|figma|slack|jira|asana|notion|python|javascript|sql|react|node)/i;
    for (const comp of data.core_competencies || []) {
        if (toolLikePatterns.test(comp.name)) {
            warnings.push(`"${comp.name}" looks like a tool, not a competency`);
        }
    }

    // Check confidence score
    if (data.confidence_score < 0 || data.confidence_score > 1) {
        warnings.push(`Confidence score ${data.confidence_score} is outside [0, 1]`);
    }

    // Check required fields
    if (!data.role_family) warnings.push('Missing role_family');
    if (!data.decision_context) warnings.push('Missing decision_context');

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// ─── API Call ───────────────────────────────────────────

export async function dissectJD(rawJD: string): Promise<{
    parsed: ParsedJDSchema;
    validation: ValidationResult;
    rawResponse: string;
}> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        throw new Error('NVIDIA_API_KEY is not configured');
    }

    const response = await fetch(NVIDIA_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: 'user',
                    content: buildPrompt(rawJD),
                },
            ],
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

    // Extract text from OpenAI-compatible response
    const rawText = result.choices?.[0]?.message?.content;
    if (!rawText) {
        throw new Error('No content in NVIDIA API response');
    }

    // Parse JSON — handle markdown code blocks
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed: ParsedJDSchema;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        throw new Error(`AI returned invalid JSON: ${jsonStr.slice(0, 200)}`);
    }

    // Validate
    const validation = validateParsedJD(parsed);

    return { parsed, validation, rawResponse: rawText };
}
