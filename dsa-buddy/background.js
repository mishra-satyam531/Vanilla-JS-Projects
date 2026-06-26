/**
 * background.js — MV3 service worker.
 *
 * Responsibilities:
 *   - Open the side panel when the extension action icon is clicked.
 *   - Receive CHAT messages from sidepanel.js via chrome.runtime.onMessage.
 *   - Load provider + the matching API key from chrome.storage.local (never exposed to the side panel).
 *   - Route fetch() to Google Gemini or Groq based on the saved provider.
 *   - Use fixed models per provider (see PROVIDER_MODELS below).
 *   - Embed the DSA coaching system prompt on every request.
 */

// ── Side panel: open when user clicks the toolbar icon ──────────────────────
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("sidePanel setup failed:", err));

/** Default model ID for each provider. */
const PROVIDER_MODELS = {
  gemini: "gemini-3.5-flash",
  groq: "llama-3.3-70b-versatile",
};

/**
 * SYSTEM PROMPT — core coaching constraint.
 *
 * Injected on every API call:
 *   - Gemini: via systemInstruction in the generateContent payload.
 *   - Groq:   as the first message with role "system" (OpenAI-compatible API).
 *
 * The LLM is instructed to:
 *   - Coach, not solve — progressive hints only.
 *   - Escalate hint depth over turns (approach → data structure → edge cases).
 *   - Refuse to output complete code unless the user's latest message explicitly
 *     asks with phrases like "give me the code" or "show me the solution".
 *
 * sidepanel.js never sees or edits this prompt; only background.js controls it.
 */
const DSA_SYSTEM_PROMPT = `You are DSA Buddy, a rigorous Data Structures and Algorithms interview coach.

YOUR PRIMARY RULE — NO SPOILERS:
- NEVER provide complete code, pseudocode that maps 1:1 to a full solution, or the final algorithm verbatim.
- NEVER paste LeetCode/editorial solutions unless the user EXPLICITLY requests code with phrases such as:
  "give me the code", "show me the solution", "show me the code", "write the full implementation", or equivalent.
- If the user asks vaguely ("what's the answer?", "just tell me"), treat it as NOT explicit — continue hinting.
- Do not output fenced code blocks (\`\`\`) or inline code that constitutes a full solution unless explicitly forced.

COACHING METHOD — PROGRESSIVE HINTS:
Follow this escalation across the conversation (one layer per reply unless the user is stuck on the current layer):
1. Problem understanding — restate the goal, inputs/outputs, and constraints in plain language.
2. High-level approach — suggest a strategy category (e.g., two pointers, BFS, DP) WITHOUT implementation details.
3. Data structure choice — recommend structures and why they fit, still no code.
4. Step-by-step logic — numbered logical steps a human would follow, still no code syntax.
5. Edge cases & complexity — call out tricky inputs, empty cases, overflow, and expected time/space complexity.

TONE:
- Encourage the learner. Ask one focused Socratic question when helpful.
- Be concise but precise. Use examples with small inputs when clarifying.
- If the user explicitly requests the solution code, you may then provide a clean, commented implementation and brief explanation.

Remember: your default mode is mentor, not answer key.`;

// ── Message handler: bridge between side panel and LLM APIs ───────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "CHAT") {
    return false;
  }

  handleChat(message.messages)
    .then((content) => sendResponse({ ok: true, content }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));

  // Return true to keep the message channel open for async sendResponse.
  return true;
});

/**
 * Provider routing — reads storage, selects the key for the active provider.
 *
 * @param {{ role: string, content: string }[]} messages — full conversation from sidepanel
 * @returns {Promise<string>} assistant reply text
 */
async function handleChat(messages) {
  const { provider, geminiKey, groqKey, apiKey } = await chrome.storage.local.get([
    "provider",
    "geminiKey",
    "groqKey",
    "apiKey",
  ]);

  const resolvedProvider = provider || "gemini";

  // Pick the key that matches the selected provider (geminiKey and groqKey are stored separately).
  let activeKey =
    resolvedProvider === "groq"
      ? groqKey
      : geminiKey;

  // Fallback for users who still have the legacy single apiKey in storage.
  if (!activeKey && apiKey) {
    activeKey = apiKey;
  }

  if (!activeKey) {
    const providerLabel = resolvedProvider === "groq" ? "Groq" : "Google Gemini";
    throw new Error(
      `No ${providerLabel} API key found. Open DSA Buddy settings (right-click extension icon → Options) and save your key.`
    );
  }

  if (resolvedProvider === "groq") {
    return callGroq(activeKey, messages);
  }

  if (resolvedProvider === "gemini") {
    return callGemini(activeKey, messages);
  }

  throw new Error(`Unknown provider "${resolvedProvider}". Choose Google Gemini or Groq in Options.`);
}

/**
 * Google Gemini generateContent API.
 * Model is always PROVIDER_MODELS.gemini.
 * System instruction is passed separately; conversation turns map to contents[].
 */
async function callGemini(apiKey, messages) {
  const model = PROVIDER_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const payload = {
    systemInstruction: {
      parts: [{ text: DSA_SYSTEM_PROMPT }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini API error (${response.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

/**
 * Groq Chat Completions API (OpenAI-compatible).
 * Model is always PROVIDER_MODELS.groq.
 * System prompt is the first message with role "system"; user/assistant turns follow.
 */
async function callGroq(apiKey, messages) {
  const model = PROVIDER_MODELS.groq;

  const payload = {
    model,
    messages: [
      { role: "system", content: DSA_SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
  };

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Groq API error (${response.status})`);
  }

  return data.choices[0].message.content;
}
