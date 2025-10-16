// Orchestrator: JSON-routed selection among philosopher | skeptic | helper
import { geminiGenerate } from "../gemini.js";
import { PhilosopherAgent } from "../agents/PhilosopherAgent.js";
import { SkepticAgent } from "../agents/SkepticAgent.js";
import { HelperAgent } from "../agents/HelperAgent.js";

const SELECTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    agent: { type: "STRING" },
    reasons: { type: "STRING" },
  },
  required: ["agent"],
};

export class RouterOrchestrator {
  constructor() {
    this.name = "philosopher_skeptic_helper_router";
    this.agentByName = {
      philosopher: new PhilosopherAgent(),
      skeptic: new SkepticAgent(),
      helper: new HelperAgent(),
    };
  }

  async _respondWith(agentName, contents) {
    const agent = this.agentByName[agentName] || this.agentByName.helper;
    const res = await agent.respond(contents);
    return res?.text || "";
  }

  async orchestrate(contents) {
    const orchestratorPrompt = `Your job is to choose exactly ONE agent to reply to the user now.

Think in two steps:
1) What does the user most need right now (depth/meaning, truth-testing, or practical support)?
2) Pick the agent whose voice best matches that need.

Available agents: "philosopher", "skeptic", "helper". USE ONLY ONE.

Routing heuristics (informative, not mandatory):
- Philosophical/values/meaning/long-term framing → philosopher
- Claims, contradictions, evidence, troubleshooting → skeptic
- Feelings, reassurance, step-by-step plan, immediate next actions → helper

Constraints:
- Output STRICTLY as JSON. No extra text.
- Prefer clarity and fit over variety.

Output shape:
{
  "agent": "helper",
  "reasons": "User asked for actionable steps after sharing stress."
}`;

    const result = await geminiGenerate({
      contents,
      systemPrompt: orchestratorPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: SELECTION_SCHEMA,
      },
    });

    let agent = "helper";
    let reasons = "Defaulted to helper";

    try {
      const parsed = JSON.parse(result.text || "{}");
      if (parsed?.agent && this.agentByName[parsed.agent]) agent = parsed.agent;
      if (parsed?.reasons) reasons = String(parsed.reasons);
    } catch (_) {}

    // Safety: heuristic fallback if model fails classification
    const lastUser = (
      contents?.at?.(contents.length - 1)?.parts?.[0]?.text || ""
    ).toLowerCase();
    if (!result?.text) {
      if (/\b(why|meaning|purpose|ethic|value|paradox)\b/.test(lastUser))
        agent = "philosopher";
      else if (
        /\b(proof|evidence|contradiction|bug|error|doesn'?t|fail|risk|test)\b/.test(
          lastUser
        )
      )
        agent = "skeptic";
      else agent = "helper";
      reasons = "Heuristic fallback";
    }

    const text = await this._respondWith(agent, contents);
    const frameSet = {
      frames: { persona: { value: agent, rationale: [reasons] } },
    };
    return { assistantMessage: text || "", frameSet, agent, reasons };
  }
}
