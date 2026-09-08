# Deck plan — AI coding agents: the basics

Decided 2026-09-07 (grill-me session). Ten slides. Block 1 = slides 1–5, block 2 = slides 6–10.
Visual grammar everywhere: context window on the left, talking points on the right.
Colors: harness grey, human light-blue, model violet, tool result light-green; meter zones green / yellow (orange) / red are reserved for "quality zone".

Runtime prerequisite: **steps**. A slide declares `viewports: Viewport[]`; → advances step-by-step, then slide; ← reverse; pill shows `n / N · s/S`; hash carries the step; `S` refits the current step.

## 1. Title (exists)

## 2. Glossary (exists, short)

## 3. The context window — 1 step
Left: the window wrapper drawn as an LED meter, ~20 thin full-color bars: 20% green (top), 30% yellow (lowest two orange), 50% red. Solid line = hard limit at the bottom. Dashed line at the yellow/red boundary, cutting through the meter and extending far to the right. Big labels "Smart zone" above / "Dumb zone" below the dashed line, in the gap on the right.
Right, bullets:
1. **Quality drops way before the hard limit.** A 1M-token window does not help if half of it is the dumb zone.
2. **The dumb zone is expensive.** As the window fills, every request costs more and comes back worse. The worst deal in the whole business.
3. **The line moves: think of an instruction budget.** One clear task over a big file stretches the smart zone. A long chat with ten topics, conflicting instructions and vague asks shrinks it. Size is not the only thing that fills the window, confusion does too.
4. **Every token counts.** Staying in the smart zone all the time is the skill; everything in this course is a technique for it.

## 4. The agent loop — 3 steps, stacked vertically
Task: "The login test is failing. Fix it."
Tool call format: violet block, `▶ ToolName { key: value }` one line, not real JSON. Tool result: teal block, raw output, mono font.

**Step 1 — one request.** Near scale. Window: system prompt (grey, 2–3 readable lines), tools (lighter grey, list of names), zigzag axis break, user prompt (blue), dashed violet response: "Let me find the test first." ▶ Glob { pattern: "**/*login*.test.ts" }.
Bullets:
1. Your first message isn't the start of the conversation. The harness adds a system message, descriptions of all the available tools and other things before you write your first word.
2. The response is always text. The model cannot run anything; it writes "call this tool with these arguments" and stops.
3. The harness runs the tool. It executes the tool call and sticks the agent message together with the tool result into the conversation history to construct the next request.

**Step 2 — the loop.** Three near-scale windows side by side (requests 2–4). Only the system prompt + tools line and the task are collapsed; every turn is readable, so each window is visibly taller than the one before. Windows 3 and 4 grow past the bottom of the stage on purpose (pan to see the rest; step 3 sits one extra gap lower to make room). A response is always one box: sentence in the draw font, tool call in mono; solid once it is history, dashed while fresh. Caption above the row: "Each window is a complete, fresh request. The model reads all of it, every time."
| window | previous response (solid violet) | tool result in (teal) | response (dashed violet) |
|---|---|---|---|
| 2 | "Let me read the test first." ▶ Read { path: "src/auth/login.test.ts" } | the test file, ~7 lines, `exp` in unix seconds (Read just reads the file, no test output) | "The check compares seconds to milliseconds." ▶ Edit { path: "src/auth/login.ts", old: "exp < Date.now()", new: "exp * 1000 < Date.now()" } |
| 3 | the Edit response | "OK, 1 replacement" | "Running the tests." ▶ Bash { command: "pnpm test login" } |
| 4 | the Bash response | `✓ 4 tests passed` | "Fixed. The token expiry was in seconds but compared to milliseconds. Tests pass." (no tool call) |

**Step 3 — the next prompt.** Near scale, no axis break (honest scale). Window holds the whole first conversation as solid compressed strips, then a fresh blue prompt ("Great, now also add a test for expired tokens."), dashed violet at the bottom. Thin meter on the right edge, fill just below the dashed line.
Bullets:
1. **Your second message lands on top of everything.** The whole first task, every tool result, every intermediate answer, is still in the window. Nothing was cleaned up.
2. **Check the level before you type.** Every harness shows it somewhere: a percentage, a token count, a bar. If you are already near the dashed line, think twice before sending another prompt in this thread.

## 5. Managing context — 5 steps
Step 1: overview — slide title above a 2×2 grid, quadrant titles big enough to read zoomed out. Steps 2–5: one quadrant each. Grammar: full window on the left, what you do about it on the right.

**Task sizing.** Window with meter tint; three task bars: "rename a function" (small), "fix the login test" (medium), "migrate auth to the new library" (taller than the smart zone).
1. **Size the task to the smart zone, not to the window.** If the work plus the files it needs plus the back-and-forth will not fit above the dashed line, it is too big for one thread.
2. **Cut before you start.** Split by file, by layer, by step. Ten small threads beat one long one, every time.

**Compaction.** Full window → arrow → nearly empty window with one grey "summary" block. Crossed-out strips beside it: exact file contents, the rejected approach, the constraint mentioned once.
1. **The harness does this when the bar gets close.** It replaces the conversation with a summary written by the model and keeps going as if nothing happened.
2. **You do not choose what survives.** Exact file contents, the approach it rejected, the constraint you mentioned once — first to go. Then the model repeats the mistake it already fixed.

**Handoff file.** Same shape as compaction, but the crossing block is a blue-bordered file "PLAN.md: goal, done, next, gotchas"; arrow goes through the disk, not the model.
1. **Compaction on your terms.** Before the window gets full, have the agent write down the goal, what is done, what is next, and the gotchas, into a file.
2. **Then start fresh.** New window, the file goes in first. You keep what matters and drop the noise, and you can read the file yourself.

**Subagents.** Main window in the smart zone; three small windows hanging off it doing noisy work; only a thin block returns.
1. **Noise happens somewhere else.** Searching, reading twenty files, running a long test suite fill a window fast. Send that to a subagent with its own window.
2. **Only the answer comes back.** The main window pays for one small block instead of the whole exploration, and stays in the smart zone longer.

## 6. AGENTS.md — 1 step
Visual: near-scale window with harness blocks; AGENTS.md block highlighted, callout "in every request, whether you need it or not".
1. **It is the one block you control in the harness section.** Read at the start of every thread, and in every request after that.
2. **Every line is a permanent tax.** Keep what every task needs: how to build, test and run, the two or three house rules, where things live. Nothing else.
3. **It is not a wish list.** A long AGENTS.md is a bad prompt on every request. Tighten it like code.

## 7. Skills — 1 step
Visual: same window, AGENTS.md small; a stack of skill files off to the side, one pulled in with an arrow "only when the task needs it".
1. **Instructions that load on demand.** A skill is a file with a one-line description in the window, and the full text pulled in only when the task matches.
2. **Put the long stuff here.** Release process, how to write a migration, the deploy checklist. Detailed, rare, and free until used.
3. **Rule of thumb:** if it is needed every time, AGENTS.md. If it is needed sometimes, a skill.

## 8. MCP vs CLI — 1 step
Visual: two windows side by side. Left: thick grey stack of tool descriptions (thirty tools from three MCP servers) above the prompt. Right: one thin grey strip "run_command", same job via CLI.
1. **Every tool description sits in the window before you type.** Thirty tools is thousands of tokens on every request, whether you use them or not.
2. **MCP is convenient, not free.** Connect the servers the task needs and remove the ones it does not.
3. **A CLI the model already knows costs one tool.** gh, git, psql, curl: the model knows how to use them and the description is a single line.

## 9. Deterministic tooling — 1 step
Visual: the loop compressed to a ring, teal block "tests / linter / typecheck" closing the ring.
1. **The model guesses, the tool knows.** A test result or a type error is the only thing in the window that is not an opinion.
2. **Give it a fast, loud feedback loop.** A one-command check that fails clearly is worth more than a page of instructions.
3. **Make the check the definition of done.** Ask for "tests pass", not for "looks right".

## 10. Rules of thumb — 1 step (full glossary parked off-screen below, if ever needed)
1. Every token counts
2. Stay in the smart zone
3. CLIs/code for power, MCPs for control
4. Deterministic wherever possible

## Build order
1. Runtime: steps (viewports[] in page meta, step index in hash, pill `n / N · s/S`, S refits step).
2. Slide 3, then 4, then 5 (the three heavy visuals); then 6–10; then `pnpm build`.
