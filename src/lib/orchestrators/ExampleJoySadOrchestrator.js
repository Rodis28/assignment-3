// Orchestrator: single-prompt agent selection → agent respond

import { geminiGenerate } from "../gemini.js";
import { PhilosopherAgent } from "../agents/philosoher.js";
import { SkepticAgent } from "../agents/skeptic.js";
import { HelperAgent } from "../agents/helper.js";

const SELECTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    agent: { type: "STRING" },
    reasons: { type: "STRING" },
  },
  required: ["agent"],
};
export class Orchestrator {
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
    const orchestratorPrompt = `Choose exactly ONE agent to respond now.
        Think in two steps:
        1) What does the user need most (meaning, truth-testing, or practical steps)?
        2) Pick the matching agent.

        Available agents: "philosopher", "skeptic", "helper". ONLY USE ONE OF THESE AGENTS.

        Constraints:
        - Speak only through structured output. No extra text.
        - Choose agents only from the list above.
        - Prefer clarity and coherence over breadth.

        Output strictly as JSON:
        {
          "agent": "helper",
          "reasons": "User asked for actionable steps after sharing stress"
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

    const text = await this._respondWith(agent, contents);

    const frameSet = {
      frames: { persona: { value: agent, rationale: [reasons] } },
    };
    return { assistantMessage: text || "", frameSet, agent, reasons };
  }
}
