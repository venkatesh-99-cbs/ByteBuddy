# denama-jeevtham

`denama-jeevtham` is a Flask-based AI software-building assistant powered by the Groq Chat Completions API. It is designed to feel closer to a modern coding assistant than a basic chatbot, with focused project-building responses, mode switching, session history, code-block copy support, and continuation handling for long answers.

## What This Project Does

This app helps users:

- plan software projects
- generate code and project files
- fix bugs
- refactor existing ideas or code structures
- continue follow-up conversations with saved chat history

The assistant currently supports four working modes:

- `Plan`
- `Code`
- `Fix`
- `Refactor`

It also stores chat sessions in the browser so older conversations can be reopened from the chat history panel.

## Features

- Clean chat-style interface
- Session-based chat history
- `New Chat` support
- Mode switching for different types of software work
- Markdown rendering for headings, lists, quotes, and code blocks
- Copy buttons for each generated code block
- Automatic continuation when the model cuts off long responses
- Beginner-friendly `How to Use` section at the end of complete project outputs
- Modular backend with separate config, prompt, message, client, and service layers

## Tech Stack

- Python
- Flask
- Groq Chat Completions API
- Requests
- HTML
- CSS
- Vanilla JavaScript
- Local browser storage for saved chat sessions

## Project Structure

```text
gemini chatbot/
|-- app.py
|-- backend/
|   |-- __init__.py
|   |-- chat_service.py
|   |-- config.py
|   |-- errors.py
|   |-- groq_client.py
|   |-- messages.py
|   `-- prompts.py
|-- requirements.txt
|-- .env.example
|-- .gitignore
|-- templates/
|   `-- index.html
`-- static/
    |-- script.js
    `-- style.css
```

## How It Works

### Backend

The backend starts in `app.py` and delegates the provider logic to the `backend/` package.

It is responsible for:

- loading validated Groq settings from environment variables
- building mode-aware chat messages
- sending Groq Chat Completions requests through a dedicated client module
- normalizing Groq API failures into friendly app errors
- receiving chat history from the frontend
- continuing the response automatically if the model stops because of token limits

### Frontend

The frontend is split between:

- `templates/index.html`
- `static/style.css`
- `static/script.js`

It is responsible for:

- rendering the chat UI
- switching modes
- creating and loading chat sessions
- showing chat history
- formatting markdown responses
- adding copy buttons to code blocks
- sending chat messages, mode, and history to the backend

## Setup

### 1. Clone or open the project

Open the project folder in your editor or terminal.

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Add your Groq API key

Create a `.env` file in the project root and add:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
GROQ_MAX_COMPLETION_TOKENS=4000
GROQ_TEMPERATURE=0.2
GROQ_TIMEOUT_SECONDS=60
```

You can use `.env.example` as the template.

Optional advanced settings:

```env
GROQ_REASONING_EFFORT=medium
GROQ_SERVICE_TIER=flex
```

### 4. Run the Flask app

```bash
python app.py
```

### 5. Open it in your browser

Visit:

```text
http://127.0.0.1:5000
```

## How To Use

### Start a new chat

Click `New Chat` to create a fresh conversation.

### Switch work mode

Use the mode buttons at the top:

- `Plan` for architecture, ideas, roadmap, and project setup
- `Code` for implementation and full file generation
- `Fix` for debugging and repair tasks
- `Refactor` for improving structure and readability

### Reopen old chats

Click `History` to view previous sessions and continue them.

### Ask better prompts

Good prompts usually include:

- what you want to build
- language or framework preference
- must-have features
- whether you want a plan, code, fix, or refactor

Example:

```text
Build a complete Flask todo app with login, SQLite, and all files.
```

## Important Notes

- This app uses Groq's OpenAI-compatible Chat Completions endpoint at `https://api.groq.com/openai/v1/chat/completions`.
- The default model is `openai/gpt-oss-120b`, which is a strong Groq-hosted coding model.
- You can switch models with `GROQ_MODEL` if you want a faster or cheaper option.
- `GROQ_REASONING_EFFORT` and `GROQ_SERVICE_TIER` are optional and are only sent when you set them.
- The `.env` file is ignored by Git for safety.

## Current Limitations

- Chat sessions are stored in browser local storage, not a database
- There is no user authentication
- Generated code should still be reviewed before production use
- Very large projects may still require follow-up prompts

## Future Improvements

- Export full generated projects as zip files
- Add per-message actions like delete or regenerate
- Add project download bundles
- Add streaming responses
- Add unit tests for the backend service modules
