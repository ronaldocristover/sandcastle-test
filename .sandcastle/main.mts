import { run, pi } from "@ai-hero/sandcastle";
import { seatbelt } from "@ai-hero/sandcastle/sandboxes/seatbelt";

// Simple loop: an agent that picks open issues one by one and closes them.
// Run this with: npx tsx .sandcastle/main.mts
// Or add to package.json scripts: "sandcastle": "npx tsx .sandcastle/main.mts"

await run({
  // A name for this run, shown as a prefix in log output.
  name: "worker",

  // Sandbox provider — runs the agent inside an isolated container.
  sandbox: seatbelt(),

  // The agent provider. Always use a fully-qualified provider/model id: a bare
  // id like "deepseek/deepseek-v4.1-flash" matches several providers and pi
  // fails with "Model ... is ambiguous across providers".
  //
  // The native seatbelt sandbox gets a throwaway $HOME, so pi cannot see the
  // host's ~/.pi/agent (auth.json / models.json) — a provider defined there (like
  // commandcode) only exists inside the sandbox if its config is copied in. See
  // the onSandboxReady hook below.
  agent: pi("commandcode/deepseek/deepseek-v4.1-flash"),

  // Path to the prompt file. Shell expressions inside are evaluated inside the
  // sandbox at the start of each iteration, so the agent always sees fresh data.
  promptFile: "./.sandcastle/prompt.md",

  // Maximum number of iterations (agent invocations) to run in a session.
  // Each iteration works on a single issue. Increase this to process more issues
  // per run, or set it to 1 for a single-shot mode.
  maxIterations: 5,

  // Branch strategy — merge-to-head creates a temporary branch for the agent
  // to work on, then merges the result back to HEAD when the run completes.
  // This is required when using copyToWorktree, since head mode bind-mounts
  // the host directory directly (no worktree to copy into).
  branchStrategy: { type: "merge-to-head" },

  // Copy node_modules from the host into the worktree before the sandbox
  // starts. This avoids a full npm install from scratch on every iteration.
  // The onSandboxReady hook still runs npm install as a safety net to handle
  // platform-specific binaries and any packages added since the last copy.
  copyToWorktree: ["node_modules", ".sandcastle/pi-agent"],

  // Lifecycle hooks — commands grouped by where they run (host or sandbox).
  hooks: {
    sandbox: {
      // onSandboxReady runs once after the sandbox is initialised and the repo is
      // synced in, before the agent starts. Use it to install dependencies or run
      // any other setup steps your project needs.
      onSandboxReady: [
        { command: "npm install" },
        // Install the extra pi provider config (commandcode, used by the model
        // above) into the sandbox's own config dir. The key itself is NOT in that
        // file — it is `$COMMANDCODE_API_KEY`, read from .sandcastle/.env.
        {
          command:
            'mkdir -p "$HOME/.pi/agent" && cp .sandcastle/pi-agent/models.json "$HOME/.pi/agent/models.json"',
        },
      ],
    },
  },
});
