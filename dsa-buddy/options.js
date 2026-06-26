/**
 * options.js — Persists LLM configuration in chrome.storage.local.
 *
 * Storage keys:
 *   - provider:  "gemini" | "groq" — active provider for chat requests
 *   - geminiKey: Google Gemini API key (independent of groqKey)
 *   - groqKey:   Groq API key (independent of geminiKey)
 */

const form = document.getElementById("settings-form");
const providerSelect = document.getElementById("provider");
const geminiKeyInput = document.getElementById("gemini-key");
const groqKeyInput = document.getElementById("groq-key");
const statusEl = document.getElementById("status");

/**
 * Load saved settings when the options page opens.
 * Fetches provider, geminiKey, and groqKey from chrome.storage.local
 * and populates the form fields with these values if they exist.
 */
async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get([
      "provider",
      "geminiKey",
      "groqKey",
    ]);

    // Default to Gemini if no provider is stored
    if (stored.provider) {
      providerSelect.value = stored.provider;
    } else {
      providerSelect.value = "gemini";
    }

    // Populate API key fields if they exist in storage
    if (stored.geminiKey) {
      geminiKeyInput.value = stored.geminiKey;
    }
    if (stored.groqKey) {
      groqKeyInput.value = stored.groqKey;
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
    showStatus("Failed to load settings. Please refresh the page.", "error");
  }
}

/**
 * Show a temporary status message in the #status element.
 * Displays for 3 seconds, then clears the message.
 * @param {string} message - The message to display
 * @param {string} type - Either "success" or "error"
 */
function showStatus(message, type = "success") {
  statusEl.textContent = message;
  statusEl.className = type;
  setTimeout(() => {
    statusEl.textContent = "";
    statusEl.className = "";
  }, 3000);
}

/**
 * Save settings when the user clicks the "Save Settings" button.
 * Validates that at least one API key is provided, then saves
 * provider, geminiKey, and groqKey to chrome.storage.local.
 */
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const provider = providerSelect.value;
  const geminiKey = geminiKeyInput.value.trim();
  const groqKey = groqKeyInput.value.trim();

  // Validate that at least one API key is provided
  if (!geminiKey && !groqKey) {
    showStatus("Please enter at least one API key.", "error");
    return;
  }

  try {
    // Save the form data to chrome.storage.local
    await chrome.storage.local.set({ provider, geminiKey, groqKey });

    // Display success message for 3 seconds
    showStatus("Settings saved successfully.");
  } catch (err) {
    console.error("Failed to save settings:", err);
    // Display error message in red
    showStatus("Failed to save settings. Please try again.", "error");
  }
});

// Initialize settings when the page loads
loadSettings();
