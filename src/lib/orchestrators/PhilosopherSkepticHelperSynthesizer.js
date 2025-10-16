// Synthesizer: Combines philosopher, skeptic, and helper perspectives for comprehensive responses

import { geminiGenerate } from "../gemini.js";
import { PhilosopherAgent } from "../agents/philosoher.js";
import { SkepticAgent } from "../agents/skeptic.js";
import { HelperAgent } from "../agents/helper.js";

const SYNTHESIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    synthesis: { type: "STRING" },
    perspectives: {
      type: "OBJECT",
      properties: {
        philosopher: { type: "STRING" },
        skeptic: { type: "STRING" },
        helper: { type: "STRING" }
      },
      required: ["philosopher", "skeptic", "helper"]
    }
  },
  required: ["synthesis", "perspectives"]
};

export class PhilosopherSkepticHelperSynthesizer {
  constructor() {
    this.name = "philosopher_skeptic_helper_synthesizer";
    this.agents = {
      philosopher: new PhilosopherAgent(),
      skeptic: new SkepticAgent(),
      helper: new HelperAgent()
    };
  }

  async synthesize(contents) {
    // Get responses from all three agents
    const [philosopherResponse, skepticResponse, helperResponse] = await Promise.all([
      this.agents.philosopher.respond(contents),
      this.agents.skeptic.respond(contents),
      this.agents.helper.respond(contents)
    ]);

    const synthesisPrompt = `You are a wise synthesizer who combines three distinct perspectives into a coherent, helpful response.

You have received responses from three different agents:
- PHILOSOPHER: ${philosopherResponse.text}
- SKEPTIC: ${skepticResponse.text}  
- HELPER: ${helperResponse.text}

Your task is to create a unified response that:
1. Acknowledges the depth and meaning from the philosopher's perspective
2. Incorporates the critical analysis and evidence-based thinking from the skeptic
3. Provides practical, actionable guidance from the helper's perspective
4. Weaves these together into a coherent, comprehensive answer

Guidelines:
- Start with the philosophical depth and meaning
- Address any critical concerns or contradictions the skeptic raises
- End with practical, actionable steps the helper suggests
- Maintain a tone that's thoughtful yet accessible
- Don't just concatenate - truly synthesize the insights
- If perspectives conflict, acknowledge the tension and provide balanced guidance

Output your synthesis as a single, flowing response that honors all three perspectives.`;

    const result = await geminiGenerate({
      contents,
      systemPrompt: synthesisPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: SYNTHESIS_SCHEMA,
      },
    });

    let synthesis = "";
    let perspectives = {
      philosopher: philosopherResponse.text || "",
      skeptic: skepticResponse.text || "",
      helper: helperResponse.text || ""
    };

    try {
      const parsed = JSON.parse(result.text || "{}");
      if (parsed?.synthesis) synthesis = parsed.synthesis;
      if (parsed?.perspectives) perspectives = parsed.perspectives;
    } catch (_) {
      // Fallback: create a simple synthesis if JSON parsing fails
      synthesis = `From a philosophical perspective: ${perspectives.philosopher}\n\nFrom a critical standpoint: ${perspectives.skeptic}\n\nFor practical guidance: ${perspectives.helper}`;
    }

    const frameSet = {
      frames: { 
        synthesis: { 
          value: "philosopher_skeptic_helper", 
          rationale: ["Combined perspectives for comprehensive response"] 
        },
        perspectives: {
          philosopher: perspectives.philosopher,
          skeptic: perspectives.skeptic,
          helper: perspectives.helper
        }
      }
    };

    return { 
      assistantMessage: synthesis, 
      frameSet, 
      agent: "synthesizer",
      reasons: "Combined philosopher, skeptic, and helper perspectives",
      perspectives
    };
  }
}
