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

  // Parse content: Markdown for assistant, plain text for user
  if (role === "assistant" && typeof marked !== "undefined") {
    // First parse Markdown to HTML
    bubble.innerHTML = marked.parse(content);
    // Then render LaTeX math in the HTML
    if (typeof renderMathInElement !== "undefined") {
      renderMathInElement(bubble, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
      });
    }
  } else {
    // User messages: plain text (no Markdown or LaTeX needed)
    bubble.textContent = content;
  }

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

  // Show only the user's actual message in the chat
  appendMessageToDOM("user", text);

  const typingBubble = appendMessageToDOM("assistant", "Thinking...", {
    isTyping: true,
  });
  setLoading(true);

  try {
    // Only extract page content on the first message to prevent context explosion
    let pageContent = "";
    if (chatHistory.length === 0) {
      try {
        pageContent = await extractPageContent();
      } catch (err) {
        // Silently fail if page extraction doesn't work - user can still chat normally
        console.log("Could not extract page content:", err.message);
      }
    }

    // Build the actual message to send to LLM
    let messageToSend = text;
    if (pageContent) {
      // Limit content to avoid overwhelming the LLM
      const maxLength = 3000;
      const truncatedContent =
        pageContent.length > maxLength
          ? pageContent.substring(0, maxLength) + "..."
          : pageContent;
      messageToSend = `Here is the problem I am looking at:\n\n${truncatedContent}\n\n${text}`;
    }

    // Persist the enhanced message in history for LLM context
    chatHistory.push({ role: "user", content: messageToSend });

    // Delegate network + system prompt assembly to background.js (has storage + fetch access).
    const response = await chrome.runtime.sendMessage({
      type: "CHAT",
      messages: chatHistory,
    });

    if (!response?.ok) {
      throw new Error(
        response?.error || "Unknown error from background service worker.",
      );
    }

    const assistantText = response.content;
    chatHistory.push({ role: "assistant", content: assistantText });

    // Parse and render the assistant's response with Markdown and KaTeX
    if (typeof marked !== "undefined") {
      typingBubble.innerHTML = marked.parse(assistantText);
      if (typeof renderMathInElement !== "undefined") {
        renderMathInElement(typingBubble, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
        });
      }
    } else {
      typingBubble.textContent = assistantText;
    }
    typingBubble.closest(".message").classList.remove("message--typing");
  } catch (err) {
    // Roll back the failed user message so history stays consistent with what the LLM saw.
    chatHistory.pop();
    typingBubble.closest(".message")?.remove();
    showError(
      err.message ||
        "Failed to get a response. Check your API key in extension settings.",
    );
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

/**
 * Extract page content from the active tab.
 * For LeetCode, targets the problem description. Falls back to visible text for other sites.
 */
async function extractPageContent() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) {
      throw new Error("No active tab found");
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Check if this is a LeetCode problem page
        if (window.location.hostname.includes("leetcode.com")) {
          // Try to find the problem description element
          const problemDescEl = document.querySelector(
            '[data-cy="question-title"]',
          )?.parentElement?.parentElement;
          if (problemDescEl) {
            return problemDescEl.innerText.trim();
          }
          // Fallback to other common LeetCode selectors
          const fallbackEl =
            document.querySelector(".elfjS") ||
            document.querySelector("[data-cy='question-description']");
          if (fallbackEl) {
            return fallbackEl.innerText.trim();
          }
        }

        // For non-LeetCode sites, return the visible body text
        return document.body.innerText.trim();
      },
    });

    if (result && result[0] && result[0].result) {
      return result[0].result;
    }

    throw new Error("Failed to extract page content");
  } catch (err) {
    throw new Error(`Could not read page content: ${err.message}`);
  }
}

userInput.focus();
