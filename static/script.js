const appLayout = document.querySelector(".app-layout");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const sendButton = document.getElementById("send-button");
const helperText = document.getElementById("helper-text");
const modeButtons = document.querySelectorAll(".mode-button");
const newChatButton = document.getElementById("new-chat-button");
const historyButton = document.getElementById("history-button");
const historyList = document.getElementById("history-list");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const activeModeLabel = document.getElementById("active-mode-label");
const sessionCountLabel = document.getElementById("session-count-label");
const characterCount = document.getElementById("character-count");
const draftStateLabel = document.getElementById("draft-state-label");
const scrollToBottomButton = document.getElementById("scroll-to-bottom-button");
const promptShortcuts = document.querySelectorAll(".prompt-shortcut, .mini-chip");

const LEGACY_HISTORY_STORAGE_KEY = "denama-jeevtham-chat-history-v1";
const SESSIONS_STORAGE_KEY = "denama-jeevtham-chat-sessions-v1";
const ACTIVE_SESSION_STORAGE_KEY = "denama-jeevtham-active-session-v1";
const MODE_STORAGE_KEY = "denama-jeevtham-chat-mode-v1";
const MAX_HISTORY_ITEMS = 16;
const mobileSidebarQuery = window.matchMedia("(max-width: 960px)");
const SEND_ICON = "↑";

const MODE_META = {
    plan: {
        label: "Plan mode",
        helper: "Map the product, milestones, stack, and rollout before writing code.",
        placeholder: "Plan a product, workflow, or architecture...",
    },
    code: {
        label: "Code mode",
        helper: "Ask for implementation steps, files, and production-ready code.",
        placeholder: "Describe the app, stack, and features you want built...",
    },
    fix: {
        label: "Fix mode",
        helper: "Share the bug, error, or broken behavior you need to debug.",
        placeholder: "Paste the bug, error message, or broken flow...",
    },
    refactor: {
        label: "Refactor mode",
        helper: "Improve structure, readability, or performance without changing behavior.",
        placeholder: "Describe what needs cleanup or restructuring...",
    },
};

let activeMode = localStorage.getItem(MODE_STORAGE_KEY) || "code";
let chatSessions = loadChatSessions();
let activeSessionId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) || "";

function createSession(mode = activeMode) {
    return {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: "New chat",
        mode,
        updatedAt: Date.now(),
        messages: [],
    };
}

function loadChatSessions() {
    try {
        const saved = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || "[]");
        if (Array.isArray(saved) && saved.length > 0) {
            return saved;
        }
    } catch (error) {
    }

    try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_HISTORY_STORAGE_KEY) || "[]");
        if (Array.isArray(legacy) && legacy.length > 0) {
            const migratedSession = createSession("code");
            migratedSession.title = getSessionTitleFromMessages(legacy);
            migratedSession.messages = legacy;
            localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY);
            return [migratedSession];
        }
    } catch (error) {
    }

    return [createSession("code")];
}

function persistSessions() {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(chatSessions));
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
}

function getSessionTitleFromMessages(messages) {
    const firstUserMessage = messages.find((item) => item.role === "user" && item.content);
    if (!firstUserMessage) {
        return "New chat";
    }

    const trimmed = firstUserMessage.content.trim().replace(/\s+/g, " ");
    return trimmed.length > 42 ? `${trimmed.slice(0, 42)}...` : trimmed;
}

function getActiveSession() {
    return chatSessions.find((session) => session.id === activeSessionId) || null;
}

function ensureActiveSession() {
    if (!chatSessions.length) {
        const session = createSession(activeMode);
        chatSessions = [session];
        activeSessionId = session.id;
        persistSessions();
        return session;
    }

    let session = getActiveSession();
    if (!session) {
        session = chatSessions[0];
        activeSessionId = session.id;
        persistSessions();
    }
    return session;
}

function formatTimestamp(timestamp) {
    try {
        return new Date(timestamp).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    } catch (error) {
        return "";
    }
}

function isMobileSidebar() {
    return mobileSidebarQuery.matches;
}

function openSidebar() {
    if (!isMobileSidebar()) {
        return;
    }
    appLayout.classList.add("sidebar-open");
    sidebarBackdrop.hidden = false;
}

function closeSidebar() {
    if (!isMobileSidebar()) {
        sidebarBackdrop.hidden = true;
        return;
    }
    appLayout.classList.remove("sidebar-open");
    sidebarBackdrop.hidden = true;
}

function removeSession(sessionId) {
    const sessionIndex = chatSessions.findIndex((session) => session.id === sessionId);
    if (sessionIndex === -1) {
        return;
    }

    const wasActive = chatSessions[sessionIndex].id === activeSessionId;
    chatSessions.splice(sessionIndex, 1);

    if (chatSessions.length === 0) {
        const replacement = createSession(activeMode);
        chatSessions = [replacement];
        activeSessionId = replacement.id;
    } else if (wasActive) {
        activeSessionId = chatSessions[0].id;
    }

    persistSessions();
    renderHistoryList();
    renderConversation();
    updateSessionCountLabel();
    helperText.textContent = "Chat removed successfully.";
}

function renderHistoryList() {
    historyList.innerHTML = "";

    if (!chatSessions.length) {
        historyList.innerHTML = '<p class="history-empty">No saved chats yet.</p>';
        return;
    }

    const orderedSessions = [...chatSessions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    orderedSessions.forEach((session) => {
        const item = document.createElement("div");
        item.className = `history-item${session.id === activeSessionId ? " active" : ""}`;
        item.innerHTML = `
            <div class="history-item-row">
                <button type="button" class="history-item-copy">
                    <span class="history-title">${escapeHtml(session.title || "New chat")}</span>
                    <span class="history-meta">${escapeHtml((session.mode || "code").toUpperCase())} | ${escapeHtml(formatTimestamp(session.updatedAt || Date.now()))}</span>
                </button>
                <button type="button" class="history-delete-button">Delete</button>
            </div>
        `;

        const openButton = item.querySelector(".history-item-copy");
        const deleteButton = item.querySelector(".history-delete-button");

        openButton.addEventListener("click", () => {
            activeSessionId = session.id;
            setActiveMode(session.mode || "code");
            persistSessions();
            renderHistoryList();
            renderConversation();
            closeSidebar();
            helperText.textContent = "Loaded a previous chat. Enter to send, Shift+Enter for a new line.";
            userInput.focus();
        });

        deleteButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const shouldDelete = window.confirm("Delete this chat permanently?");
            if (!shouldDelete) {
                return;
            }
            removeSession(session.id);
        });

        historyList.appendChild(item);
    });
}

function updateSessionCountLabel() {
    const count = chatSessions.length;
    if (!sessionCountLabel) {
        return;
    }
    sessionCountLabel.textContent = `${count} saved chat${count === 1 ? "" : "s"}`;
}

function applyModeMeta(mode) {
    const meta = MODE_META[mode] || MODE_META.code;
    if (activeModeLabel) {
        activeModeLabel.textContent = meta.label;
    }
    userInput.placeholder = meta.placeholder;
    if (!sendButton.disabled) {
        helperText.textContent = meta.helper;
    }
}

function setActiveMode(mode) {
    activeMode = mode;
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    modeButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.mode === mode);
    });

    const session = ensureActiveSession();
    session.mode = mode;
    session.updatedAt = Date.now();
    persistSessions();
    renderHistoryList();
    updateSessionCountLabel();
    applyModeMeta(mode);
}

function autoResizeTextarea() {
    userInput.style.height = "auto";
    userInput.style.height = `${Math.min(userInput.scrollHeight, 220)}px`;
}

function updateDraftIndicators() {
    const length = userInput.value.trim().length;
    if (characterCount) {
        characterCount.textContent = `${length} chars`;
    }
    if (!draftStateLabel || sendButton.disabled) {
        return;
    }

    if (length > 0) {
        draftStateLabel.textContent = "Draft in progress";
        draftStateLabel.classList.add("is-dirty");
    } else {
        draftStateLabel.textContent = "Ready to send";
        draftStateLabel.classList.remove("is-dirty");
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function formatInline(text) {
    let html = escapeHtml(text);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return html;
}

function renderMarkdown(text) {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
        return "<p></p>";
    }

    const lines = normalized.split("\n");
    const parts = [];
    let paragraph = [];
    let listType = null;
    let listItems = [];
    let inCodeBlock = false;
    let codeLines = [];
    let codeLanguage = "";

    function flushParagraph() {
        if (!paragraph.length) {
            return;
        }
        parts.push(`<p>${formatInline(paragraph.join(" "))}</p>`);
        paragraph = [];
    }

    function flushList() {
        if (!listItems.length || !listType) {
            return;
        }
        const tag = listType === "ol" ? "ol" : "ul";
        const items = listItems.map((item) => `<li>${formatInline(item)}</li>`).join("");
        parts.push(`<${tag}>${items}</${tag}>`);
        listItems = [];
        listType = null;
    }

    function flushCodeBlock() {
        if (!inCodeBlock) {
            return;
        }
        parts.push(
            `<pre data-language="${escapeHtml(codeLanguage)}"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
        );
        inCodeBlock = false;
        codeLines = [];
        codeLanguage = "";
    }

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        if (trimmed.startsWith("```")) {
            flushParagraph();
            flushList();
            if (inCodeBlock) {
                flushCodeBlock();
            } else {
                inCodeBlock = true;
                codeLines = [];
                codeLanguage = trimmed.slice(3).trim();
            }
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }

        if (!trimmed) {
            flushParagraph();
            flushList();
            continue;
        }

        const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            flushParagraph();
            flushList();
            const level = heading[1].length;
            parts.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
            continue;
        }

        if (/^[-*]\s+/.test(trimmed)) {
            flushParagraph();
            if (listType !== "ul") {
                flushList();
                listType = "ul";
            }
            listItems.push(trimmed.replace(/^[-*]\s+/, ""));
            continue;
        }

        if (/^\d+\.\s+/.test(trimmed)) {
            flushParagraph();
            if (listType !== "ol") {
                flushList();
                listType = "ol";
            }
            listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
            continue;
        }

        if (/^>\s+/.test(trimmed)) {
            flushParagraph();
            flushList();
            parts.push(`<blockquote>${formatInline(trimmed.replace(/^>\s+/, ""))}</blockquote>`);
            continue;
        }

        paragraph.push(trimmed);
    }

    flushParagraph();
    flushList();
    flushCodeBlock();

    return parts.join("");
}

function scrollChatToBottom(force = false) {
    const nearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 160;
    if (force || nearBottom) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    updateScrollButton();
}

function updateScrollButton() {
    if (!scrollToBottomButton) {
        return;
    }
    const hasOverflow = chatBox.scrollHeight > chatBox.clientHeight + 80;
    const nearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 180;
    scrollToBottomButton.hidden = !hasOverflow || nearBottom;
}

function addCodeCopyButtons(container) {
    const codeBlocks = container.querySelectorAll("pre");
    codeBlocks.forEach((pre) => {
        const code = pre.querySelector("code");
        if (!code || pre.parentElement?.classList.contains("code-block")) {
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "code-block";

        const toolbar = document.createElement("div");
        toolbar.className = "code-toolbar";

        const label = document.createElement("span");
        label.className = "code-language";
        label.textContent = pre.dataset.language || "code";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "copy-button";
        button.textContent = "Copy";
        button.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(code.textContent || "");
                button.textContent = "Copied";
                button.classList.add("is-success");
                window.setTimeout(() => {
                    button.textContent = "Copy";
                    button.classList.remove("is-success");
                }, 1400);
            } catch (error) {
                button.textContent = "Copy failed";
            }
        });

        toolbar.appendChild(label);
        toolbar.appendChild(button);
        wrapper.appendChild(toolbar);

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
    });
}

function buildMessageContent(role, text) {
    if (role === "assistant") {
        return `<div class="message-content">${renderMarkdown(text)}</div>`;
    }
    return `<div class="message-content"><p>${formatInline(text)}</p></div>`;
}

function createMessage(role, text, options = {}) {
    const article = document.createElement("article");
    article.className = `message ${role}${options.isError ? " is-error" : ""}${options.isTyping ? " typing" : ""}`;

    const avatarText = role === "user" ? "You" : "AI";
    const labelText = role === "user" ? "You" : "denama-jeevtham";

    article.innerHTML = `
        <div class="avatar">${avatarText}</div>
        <div class="bubble">
            <p class="message-label">${labelText}</p>
            ${options.isTyping ? '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>' : buildMessageContent(role, text)}
        </div>
    `;

    if (!options.isTyping && role === "assistant") {
        const content = article.querySelector(".message-content");
        if (content) {
            addCodeCopyButtons(content);
        }
    }

    chatBox.appendChild(article);
    scrollChatToBottom(true);
    return article;
}

function getWelcomeMarkup() {
    return `
        <section class="welcome-screen">
            <div class="welcome-card">
                <h2>How can I help you build today?</h2>
                <p>
                    denama-jeevtham is tuned for planning, coding, debugging, and refactoring software projects.
                    Start with a product idea, feature request, bug, or full-stack build prompt.
                </p>
                <div class="welcome-grid">
                    <button class="welcome-chip" type="button" data-prompt="Build a modern task manager web app with Flask, SQLite, and a clean dashboard UI.">
                        <span class="welcome-chip-title">Build</span>
                        <span class="welcome-chip-copy">Create a full app with files, stack, and run steps.</span>
                    </button>
                    <button class="welcome-chip" type="button" data-prompt="Plan an AI portfolio website with sections, features, pages, and launch steps.">
                        <span class="welcome-chip-title">Plan</span>
                        <span class="welcome-chip-copy">Break down architecture, features, and roadmap.</span>
                    </button>
                    <button class="welcome-chip" type="button" data-prompt="Fix this JavaScript bug and explain the root cause clearly before changing the code.">
                        <span class="welcome-chip-title">Fix</span>
                        <span class="welcome-chip-copy">Debug problems and return exact code changes.</span>
                    </button>
                    <button class="welcome-chip" type="button" data-prompt="Refactor a Flask app into cleaner modules, services, and templates without changing behavior.">
                        <span class="welcome-chip-title">Refactor</span>
                        <span class="welcome-chip-copy">Improve structure while keeping the output stable.</span>
                    </button>
                </div>
            </div>
        </section>
    `;
}

function applyPrompt(prompt) {
    userInput.value = prompt || "";
    autoResizeTextarea();
    updateDraftIndicators();
    userInput.focus();
}

function bindPromptButtons(scope = document) {
    scope.querySelectorAll(".welcome-chip, .prompt-shortcut, .mini-chip").forEach((button) => {
        if (button.dataset.bound === "true") {
            return;
        }
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
            applyPrompt(button.dataset.prompt || "");
        });
    });
}

function renderConversation() {
    chatBox.innerHTML = "";
    const session = ensureActiveSession();

    if (!session.messages.length) {
        chatBox.innerHTML = getWelcomeMarkup();
        bindPromptButtons(chatBox);
        updateScrollButton();
        return;
    }

    session.messages.forEach((item) => {
        createMessage(item.role, item.content);
    });
    updateScrollButton();
}

function setLoadingState(isLoading) {
    sendButton.disabled = isLoading;
    sendButton.textContent = isLoading ? "..." : SEND_ICON;

    if (isLoading) {
        helperText.textContent = `Working in ${activeMode} mode...`;
        if (draftStateLabel) {
            draftStateLabel.textContent = "Generating reply";
            draftStateLabel.classList.remove("is-dirty");
        }
    } else {
        applyModeMeta(activeMode);
        updateDraftIndicators();
    }
}

function startNewChat() {
    const session = createSession(activeMode);
    chatSessions.unshift(session);
    activeSessionId = session.id;
    persistSessions();
    renderHistoryList();
    renderConversation();
    updateSessionCountLabel();
    closeSidebar();
    helperText.textContent = "Started a new chat. Enter to send, Shift+Enter for a new line.";
    userInput.value = "";
    autoResizeTextarea();
    updateDraftIndicators();
    userInput.focus();
}

async function sendMessage(message) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
        return;
    }

    const session = ensureActiveSession();
    const requestHistory = session.messages.slice(-MAX_HISTORY_ITEMS);
    const userEntry = { role: "user", content: trimmedMessage };

    session.messages.push(userEntry);
    session.title = getSessionTitleFromMessages(session.messages);
    session.mode = activeMode;
    session.updatedAt = Date.now();
    persistSessions();
    renderHistoryList();
    updateSessionCountLabel();
    if (chatBox.querySelector(".welcome-screen")) {
        chatBox.innerHTML = "";
    }
    createMessage("user", trimmedMessage);

    userInput.value = "";
    autoResizeTextarea();
    updateDraftIndicators();
    setLoadingState(true);
    closeSidebar();

    const typingMessage = createMessage("assistant", "", { isTyping: true });

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: trimmedMessage,
                mode: activeMode,
                history: requestHistory,
            }),
        });

        const data = await response.json();
        typingMessage.remove();

        if (!response.ok) {
            const errorParts = [data.error || "Something went wrong while generating the response."];
            if (data.details) {
                errorParts.push(`Details: ${data.details}`);
            }
            createMessage("assistant", errorParts.join("\n\n"), { isError: true });
            updateScrollButton();
            return;
        }

        const reply = data.reply || "I could not generate a reply yet. Please try again.";
        session.messages.push({ role: "assistant", content: reply });
        session.updatedAt = Date.now();
        persistSessions();
        renderHistoryList();
        createMessage("assistant", reply);
    } catch (error) {
        typingMessage.remove();
        createMessage(
            "assistant",
            "The request could not be completed. Check the Flask server and API configuration, then try again.",
            { isError: true },
        );
    } finally {
        setLoadingState(false);
        userInput.focus();
        updateScrollButton();
    }
}

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendMessage(userInput.value);
});

userInput.addEventListener("input", () => {
    autoResizeTextarea();
    updateDraftIndicators();
});

userInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await sendMessage(userInput.value);
    }
});

modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setActiveMode(button.dataset.mode || "code");
    });
});

newChatButton.addEventListener("click", () => {
    startNewChat();
});

historyButton.addEventListener("click", () => {
    if (appLayout.classList.contains("sidebar-open")) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

sidebarBackdrop.addEventListener("click", () => {
    closeSidebar();
});

mobileSidebarQuery.addEventListener("change", () => {
    closeSidebar();
});

chatBox.addEventListener("scroll", () => {
    updateScrollButton();
});

if (scrollToBottomButton) {
    scrollToBottomButton.addEventListener("click", () => {
        scrollChatToBottom(true);
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeSidebar();
    }
});

bindPromptButtons();

const initialSession = ensureActiveSession();
setActiveMode(initialSession.mode || activeMode);
renderHistoryList();
renderConversation();
autoResizeTextarea();
updateDraftIndicators();
updateSessionCountLabel();
closeSidebar();
