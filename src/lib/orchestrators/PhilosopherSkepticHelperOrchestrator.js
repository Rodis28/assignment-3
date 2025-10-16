// Orchestrator: Uses synthesizer to combine philosopher, skeptic, and helper perspectives

import { PhilosopherSkepticHelperSynthesizer } from "./PhilosopherSkepticHelperSynthesizer.js";

export class PhilosopherSkepticHelperOrchestrator {
  constructor() {
    this.name = "philosopher_skeptic_helper_synthesizer_orchestrator";
    this.synthesizer = new PhilosopherSkepticHelperSynthesizer();
  }

  async orchestrate(contents) {
    // Use the synthesizer to combine all three perspectives
    return await this.synthesizer.synthesize(contents);
  }
}
