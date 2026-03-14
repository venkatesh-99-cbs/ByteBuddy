# denama-jeevtham

`denama-jeevtham` is a Flask-based AI software-building assistant powered by the Gemini API. It is designed to feel closer to a modern coding assistant than a basic chatbot, with focused project-building responses, mode switching, session history, code-block copy support, and continuation handling for long answers.

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
- Automatic continuation when Gemini cuts off long responses
- Beginner-friendly `How to Use` section at the end of complete project outputs

## Tech Stack

- Python
- Flask
- Google Gemini API
- HTML
- CSS
- Vanilla JavaScript
- Local browser storage for saved chat sessions

## Project Structure

```text
gemini chatbot/
├── app.py
├── requirements.txt
├── .env.example
├── .gitignore
├── templates/
│   └── index.html
└── static/
    ├── script.js
    └── style.css
```

## How It Works

### Backend

The backend lives in `app.py`.

It is responsible for:

- loading the Gemini API key
- configuring the model
- applying system instructions for software-building behavior
- handling mode-specific prompt instructions
- receiving chat history from the frontend
- requesting a Gemini response
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

### 3. Add your Gemini API key

Create a `.env` file in the project root and add:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

You can use `.env.example` as the template.

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

## Example Use Cases

- "Plan an AI-powered portfolio website"
- "Build a complete snake game in Python"
- "Fix my Flask routing bug"
- "Refactor this app into cleaner modules"
- "Create an e-commerce dashboard project structure"

## Important Notes

- This app currently uses `google-generativeai`, which is deprecated upstream.
- It still works for now, but migrating to the newer `google.genai` SDK would be a good future improvement.
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
- Migrate to the newer Gemini SDK
- Add streaming responses

## Authoring Notes

This project was shaped into a more coding-assistant-style experience with:

- mode-aware prompting
- automatic long-response continuation
- saved chat sessions
- copyable code blocks
- simpler, cleaner chat UX

---

If you want, the next improvement can be a deployment-ready README section for Render, Railway, or Vercel-style hosting.
