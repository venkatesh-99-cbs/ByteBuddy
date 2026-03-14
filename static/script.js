const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const sendButton = document.getElementById("send-button");
const helperText = document.getElementById("helper-text");
const modeButtons = document.querySelectorAll(".mode-button");
const newChatButton = document.getElementById("new-chat-button");
const historyButton = document.getElementById("history-button");
const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");

const LEGACY_HISTORY_STORAGE_KEY = "denama-jeevtham-chat-history-v1";
const SESSIONS_STORAGE_KEY = "denama-jeevtham-chat-sessions-v1";
const ACTIVE_SESSION_STORAGE_KEY = "denama-jeevtham-active-session-v1";
const MODE_STORAGE_KEY = "denama-jeevtham-chat-mode-v1";
const MAX_HISTORY_ITEMS = 16;

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
                    <span class="history-meta">${escapeHtml((session.mode || "code").toUpperCase())} - ${escapeHtml(formatTimestamp(session.updatedAt || Date.now()))}</span>
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
            historyPanel.hidden = true;
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
}

function autoResizeTextarea() {
    userInput.style.height = "auto";
    userInput.style.height = `${Math.min(userInput.scrollHeight, 220)}px`;
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

function scrollChatToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addCodeCopyButtons(container) {
    const codeBlocks = container.querySelectorAll("pre");
    codeBlocks.forEach((pre) => {
        const code = pre.querySelector("code");
        if (!code) {
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

    const avatarText = role === "user" ? "You" : "LC";
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
    scrollChatToBottom();
    return article;
}

function getWelcomeMessage() {
    return [
        "Describe what you want to build.",
        "",
        "denama-jeevtham can help with apps, websites, games, tools, APIs, dashboards, debugging, and refactoring.",
    ].join("\n");
}

function renderConversation() {
    chatBox.innerHTML = "";
    const session = ensureActiveSession();

    if (!session.messages.length) {
        createMessage("assistant", getWelcomeMessage());
        return;
    }

    session.messages.forEach((item) => {
        createMessage(item.role, item.content);
    });
}

function setLoadingState(isLoading) {
    sendButton.disabled = isLoading;
    sendButton.textContent = isLoading ? "Thinking..." : "Send";
    helperText.textContent = isLoading
        ? `Working in ${activeMode} mode...`
        : "Enter to send, Shift+Enter for a new line.";
}

function startNewChat() {
    const session = createSession(activeMode);
    chatSessions.unshift(session);
    activeSessionId = session.id;
    persistSessions();
    renderHistoryList();
    renderConversation();
    historyPanel.hidden = true;
    helperText.textContent = "Started a new chat. Enter to send, Shift+Enter for a new line.";
    userInput.value = "";
    autoResizeTextarea();
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
    createMessage("user", trimmedMessage);

    userInput.value = "";
    autoResizeTextarea();
    setLoadingState(true);

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
            createMessage("assistant", data.error || "Something went wrong while generating the response.", { isError: true });
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
            "The request could not be completed. Check the Flask server and Gemini API configuration, then try again.",
            { isError: true },
        );
    } finally {
        setLoadingState(false);
        userInput.focus();
    }
}

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendMessage(userInput.value);
});

userInput.addEventListener("input", autoResizeTextarea);

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
    historyPanel.hidden = !historyPanel.hidden;
});

const initialSession = ensureActiveSession();
setActiveMode(initialSession.mode || activeMode);
renderHistoryList();
renderConversation();
autoResizeTextarea();
