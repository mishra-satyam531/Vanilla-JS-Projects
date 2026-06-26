/**
 * options.js — Persists LLM configuration in chrome.storage.local.
 *
 * Storage keys:
 *   - provider:  "gemini" | "groq" — active provider for chat requests
 *   - geminiKey: Google Gemini API key (independent of groqKey)
 *   - groqKey:   Groq API key (independent of geminiKey)
 */

const STORAGE_KEYS = ["provider", "geminiKey", "groqKey"];

const form = document.getElementById("settings-form");
const providerSelect = document.getElementById("provider");
const geminiKeyInput = document.getElementById("gemini-key");
const groqKeyInput = document.getElementById("groq-key");
const statusEl = document.getElementById("status");

const PROVIDER_KEY_FIELDS = {
  gemini: { input: geminiKeyInput, label: "Google Gemini" },
  groq: { input: groqKeyInput, label: "Groq" },
};

/** Load saved settings when the options page opens. */
async function loadSettings() {
  const stored = await chrome.storage.local.get([...STORAGE_KEYS, "apiKey"]);

  // Default to Gemini if no provider is stored
  if (stored.provider) {
    providerSelect.value = stored.provider;
  } else {
    providerSelect.value = "gemini";
  }

  if (stored.geminiKey) {
    geminiKeyInput.value = stored.geminiKey;
  }
  if (stored.groqKey) {
    groqKeyInput.value = stored.groqKey;
  }

  // Migrate legacy single apiKey into the matching provider key if needed.
  if (stored.apiKey && !stored.geminiKey && !stored.groqKey) {
    const legacyProvider = stored.provider || "gemini";
    if (legacyProvider === "groq") {
      groqKeyInput.value = stored.apiKey;
    } else {
      geminiKeyInput.value = stored.apiKey;
    }
  }
}

/** Show a temporary status message after save. */
function showStatus(message, type = "success") {
  statusEl.textContent = message;
  statusEl.className = type;
  setTimeout(() => {
    statusEl.textContent = "";
    statusEl.className = "";
  }, 3000);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const provider = providerSelect.value;
  const geminiKey = geminiKeyInput.value.trim();
  const groqKey = groqKeyInput.value.trim();
  const activeKeyConfig = PROVIDER_KEY_FIELDS[provider];

  if (!activeKeyConfig.input.value.trim()) {
    showStatus(
      `Please enter a ${activeKeyConfig.label} API key for the selected provider.`,
      "error",
    );
    return;
  }

  // Each key is stored separately so updating one never overwrites the other.
  await chrome.storage.local.set({ provider, geminiKey, groqKey });

  // Remove legacy keys from earlier versions of the extension.
  await chrome.storage.local.remove(["apiKey", "model"]);

  showStatus("Settings saved successfully.");
});

loadSettings();
