/**
 * sidepanel.js — Chat UI and conversation state.
 *
 * Message passing flow:
 *   1. User submits text → appended to `chatHistory` (role: "user").
 *   2. sidepanel sends chrome.runtime.sendMessage({ type: "CHAT", messages: chatHistory }).
 *   3. background.js reads API key from storage, prepends the DSA system prompt, calls the LLM.
 *   4. Response returns → appended to `chatHistory` (role: "assistant") and rendered.
 *
 * chatHistory is the single source of truth for LLM context on each request.
 */

const chatContainer = document.getElementById("chat-container");
const welcomeEl = document.getElementById("welcome");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-chat");
const errorBanner = document.getElementById("error-banner");

/** @type {{ role: "user" | "assistant", content: string }[]} */
let chatHistory = [];

let isLoading = false;

function hideWelcome() {
  if (welcomeEl) {
    welcomeEl.remove();
  }
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function hideError() {
  errorBanner.hidden = true;
  errorBanner.textContent = "";
}

/** Render one message bubble in the DOM (does not mutate chatHistory). */
function appendMessageToDOM(role, content, { isTyping = false } = {}) {
  hideWelcome();

  const wrapper = document.createElement("div");
  wrapper.className = `message message--${role}${isTyping ? " message--typing" : ""}`;

  const roleLabel = document.createElement("span");
  roleLabel.className = "message__role";
  roleLabel.textContent = role === "user" ? "You" : "DSA Buddy";

  const bubble = document.createElement("div");
  bubble.className = "message__bubble";
  bubble.textContent = content;

  wrapper.appendChild(roleLabel);
  wrapper.appendChild(bubble);
  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return bubble;
}

function setLoading(loading) {
  isLoading = loading;
  sendBtn.disabled = loading;
  userInput.disabled = loading;
}

async function sendMessage(text) {
  hideError();

  // Persist user turn in history before calling the service worker.
  chatHistory.push({ role: "user", content: text });
  appendMessageToDOM("user", text);

  const typingBubble = appendMessageToDOM("assistant", "Thinking...", { isTyping: true });
  setLoading(true);

  try {
    // Delegate network + system prompt assembly to background.js (has storage + fetch access).
    const response = await chrome.runtime.sendMessage({
      type: "CHAT",
      messages: chatHistory,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Unknown error from background service worker.");
    }

    const assistantText = response.content;
    chatHistory.push({ role: "assistant", content: assistantText });

    typingBubble.textContent = assistantText;
    typingBubble.closest(".message").classList.remove("message--typing");
  } catch (err) {
    // Roll back the failed user message so history stays consistent with what the LLM saw.
    chatHistory.pop();
    typingBubble.closest(".message")?.remove();
    showError(err.message || "Failed to get a response. Check your API key in extension settings.");
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isLoading) return;

  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = "";
  sendMessage(text);
});

// Shift+Enter = newline; Enter alone = send.
userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

clearBtn.addEventListener("click", () => {
  chatHistory = [];
  chatContainer.innerHTML = `
    <div class="welcome" id="welcome">
      <p>Paste a LeetCode-style problem or describe what you're stuck on.</p>
      <p class="welcome__hint">I'll guide you with progressive hints — not full code — unless you explicitly ask for the solution.</p>
    </div>
  `;
  hideError();
  userInput.focus();
});

userInput.focus();
