# ByteBuddy – Your Intelligent Developer Companion

> Build Faster. Learn Better. Debug Smarter.

ByteBuddy is a production-quality, enterprise-grade AI Developer Assistant designed to streamline software engineering workflows. It provides a clean, professional workspace inspired by tools like Linear, GitHub, and Cursor, allowing developers to interact with local LLMs (via Ollama) or cloud-based models (via OpenRouter).

At its core, ByteBuddy features a continuous **Software Development Life Cycle (SDLC) Project Flow** that chains context across multiple development stages, alongside a comprehensive **Code Inspector** that lets you upload, analyze, and remediate codebases directly.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Supported Providers & Configuration](#supported-providers--configuration)
3. [The 10 Workspace Modes Explained](#the-10-workspace-modes-explained)
4. [Guided Project Workflow & Context Chaining](#guided-project-workflow--context-chaining)
5. [The Code Inspector & Upload System](#the-code-inspector--upload-system)
6. [Tech Stack & Architecture](#tech-stack--architecture)
7. [Getting Started & Installation](#getting-started--installation)
8. [Usage Guide](#usage-guide)
9. [Technical Decisions & Best Practices](#technical-decisions--best-practices)

---

## Key Features

- **Clean Enterprise UI**: Designed with a sleek, dark-mode-first look using Tailwind CSS, shadcn/ui components, and Framer Motion transitions.
- **Dual AI Providers**: Dynamic toggle between local Ollama (offline, private) and cloud-based OpenRouter (cutting-edge models like Gemini, Claude, or GPT).
- **Interactive Multi-Stage SDLC Workflow**: Move projects from initial planning to final documentation with an interactive progress bar and automatic next-stage recommendations.
- **Context Chaining**: Outputs generated in earlier stages (e.g., database schemas or API contracts) are automatically injected as system prompt context in subsequent stages.
- **Full Code Inspector**: Upload directories, zip archives, or paste single snippets to run a multi-dimensional analysis on code health, security, and performance.
- **Smart Conversation Features**:
  - **Auto-Generated Titles**: Automatically generates concise, relevant conversation titles after the first exchange.
  - **Dynamic Follow-Up Suggestions**: Generates 3 contextual, high-quality question chips after every AI response.
  - **One-Click Summarizer**: Leverages AI to synthesize chat transcripts into 2-3 sentence summaries.
  - **Pinned Messages**: Bookmark critical AI responses, code snippets, or schemas to the sidebar for instant retrieval.
  - **File & Image Attachments**: Drag and drop or attach files and images (up to 50MB); text contents are read and injected into the context, while images have metadata parsed.
- **Responsive Adaptive Layout**: Perfectly optimized for large-screen development monitors and mobile screens alike.

---

## Supported Providers & Configuration

ByteBuddy supports pluggable providers. Each conversation maintains its own settings (accessible via the Settings Drawer or the inline toolbar):

| Provider | Default URL / Settings | Model Auto-Detection | Configuration Steps |
|---|---|---|---|
| **Ollama** | `http://localhost:11434` | Yes (automatic via `/api/tags`) | Start Ollama (`ollama serve`), pull any model (e.g., `ollama pull llama3.1`), and ByteBuddy will automatically list and detect it. |
| **OpenRouter** | `https://openrouter.ai` | Yes (automatic) | Save your API key via the secure in-app API Key modal. Select your preferred cloud model directly in the dropdown. |

---

## The 10 Workspace Modes Explained

ByteBuddy features **10 distinct modes** (accessible via the chat bar's Mode Selector). Switching modes updates the system prompt, AI role, and context parsing:

### 1. Normal Chat (`normal`)
- **Role**: General-purpose software assistant.
- **How to Use**: Best for general programming questions, debugging quick snippets, explaining algorithms, or discussing design patterns without a structured project timeline.
- **Prompt Focus**: Answers naturally and directly without forcing software lifecycle sections.

### 2. Planning (`planning`)
- **Role**: Software Project Planner.
- **How to Use**: Starting point for new applications. Provide high-level ideas, and ByteBuddy will draft project blueprints.
- **Outputs**: Generates Problem Statements, Objectives, Functional/Non-Functional Requirements, User Stories, Tech Stack Suggestions, Roadmaps, and Risk Assessments.

### 3. Architecture (`architecture`)
- **Role**: System Architect.
- **How to Use**: Use this mode to map your system boundaries, folder structures, and high-level architecture.
- **Outputs**: Recommends directory layouts, designs tiered boundaries (Presentation, Business, Data layers), drafts ASCII component diagrams, and outlines data flows.

### 4. Database Design (`database`)
- **Role**: Lead Database Administrator / Designer.
- **How to Use**: Detail your entity models. Injects context from your *Planning* and *Architecture* stages.
- **Outputs**: Entity-relationship maps, schema definitions (primary/foreign keys, indices), database normalization levels, and complete, copyable SQL `CREATE TABLE` scripts.

### 5. API Design (`api_design`)
- **Role**: API Architect.
- **How to Use**: Design endpoints, payload contracts, and authentication protocols.
- **Outputs**: Full REST/GraphQL endpoint paths, JSON Request/Response models, HTTP status codes, validation rules, authentication flows (JWT/OAuth), and OpenAPI-compatible specs.

### 6. Coding (`coding`)
- **Role**: Senior Software Engineer.
- **How to Use**: Prompt the assistant to write files, modules, or services.
- **Outputs**: Produces clean, highly modular, runnable, production-ready code blocks annotated with file paths, conforming to language conventions and DRY principles.

### 7. Code Inspector (`inspector`)
- **Role**: Expert Code Inspector and Security Auditor.
- **How to Use**: Opens a specialized interactive split-view interface. Upload your project folder or paste your code.
- **Outputs**: A multi-dimensional diagnostic dashboard (scanned metrics, files, overall health score) alongside categorized findings (critical, high, medium, low, info) and code remediation recommendations.

### 8. Security Review (`security`)
- **Role**: DevSecOps / Security Specialist.
- **How to Use**: Perform security reviews of your architecture, APIs, databases, or code.
- **Outputs**: Analyzes security risks, maps findings against the OWASP Top 10, identifies hardcoded secrets, SQL injection vectors, or cross-site scripting risks, and gives a prioritized mitigation roadmap.

### 9. Testing (`testing`)
- **Role**: QA Automation Architect.
- **How to Use**: Request test suite generation for any portion of your codebase or architecture.
- **Outputs**: Complete unit, integration, and end-to-end tests, edge case assertions, mock data/fixtures, and recommendations on test coverage tools.

### 10. Documentation (`documentation`)
- **Role**: Principal Technical Writer.
- **How to Use**: Compile your finalized project artifacts.
- **Outputs**: Generates enterprise-ready `README.md` files, installation guides, configuration matrices, deployment runbooks (Docker/Cloud), and developer handbooks.

---

## Guided Project Workflow & Context Chaining

ByteBuddy's signature feature is the **Guided Project Workflow**. It turns the AI assistant into a continuous collaborator:

```text
[Planning] ──> [Architecture] ──> [Database] ──> [API Design] ──> [Coding] ──> [Inspector] ──> [Security] ──> [Testing] ──> [Documentation]
```

1. **Continuous Chaining**: When you interact with the AI in any SDLC stage (e.g., *Database Design*), ByteBuddy saves your generated plans and schemas to the database as **Workflow Artifacts**.
2. **Context Injection**: When you move to the next stage (e.g., *API Design*), ByteBuddy automatically queries all previously completed artifacts for that conversation and injects them into the LLM system instructions. The model understands the entire architecture and database schema without you having to re-paste context.
3. **Recommendations**: After a stage completes, ByteBuddy displays a prominent recommendation card prompting you to continue to the logical next stage in the pipeline.

---

## The Code Inspector & Upload System

The Code Inspector stage operates through a custom-built, file-based interactive UI:

### How to use the Inspector:
1. **Upload Files**: Drag and drop file sets, click the upload box, upload a `.zip` archive of your codebase, or paste code directly into the text editor.
2. **Trigger Analysis**: ByteBuddy's backend parses the files, analyzes code paths, and feeds the content to your selected AI provider (Ollama or OpenRouter).
3. **Analyze Dashboard**: View your overall code score, files scanned, language breakdowns, maintainability, performance, security, and readability metrics.
4. **Interactive Remediation**:
   - Scroll through categorized findings.
   - Click any finding to inspect the detailed explanation, root cause, and why it matters.
   - Click **Generate Fix** to receive an AI-generated diff with improved, secure code.
   - Toggle finding statuses between `Open`, `Resolved`, or `Ignored`.
5. **Contextual Chat**: Use the embedded Inspector sidebar to ask follow-up questions specifically about the scan report (e.g., *"How do I fix the high-severity SQL injection finding in my user routes?"*).

---

## Tech Stack & Architecture

ByteBuddy uses a clean, decoupled **Layered Architecture**:

```text
       ┌────────────────────────────────────────────────────────┐
       │                 Presentation (Frontend)                │
       │           React / Vite / TypeScript / Tailwind         │
       └───────────────────────────┬────────────────────────────┘
                                   │  HTTP / multipart-form
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                       API Layer                        │
       │                   Flask REST Routes                    │
       └───────────────────────────┬────────────────────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                     Service Layer                      │
       │      Business Logic, Workflows, Inspector, Settings    │
       └───────────────────────────┬────────────────────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                Provider / Repository Layer             │
       │          Ollama & OpenRouter APIs / SQL Repositories   │
       └───────────────────────────┬────────────────────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                    Database Layer                      │
       │                 SQLite / SQLAlchemy                    │
       └────────────────────────────────────────────────────────┘
```

- **Frontend**:
  - **Framework**: React 18, Vite, TypeScript.
  - **Styling**: Tailwind CSS, shadcn/ui components, Lucide Icons.
  - **State Management & Caching**: TanStack Query (React Query) for robust server state.
  - **UI Additions**: React Markdown, Prism Syntax Highlighter (one-dark), Framer Motion.
- **Backend**:
  - **Framework**: Python 3.12, Flask, Flask-SQLAlchemy, Flask-CORS, Flask-Migrate.
  - **Database**: SQLite (stored locally at `instance/bytebuddy.db`).
  - **Third-Party Integrations**: Requests, Pydantic, python-dotenv.

---

## Getting Started & Installation

### Prerequisites

- **Python 3.12+**
- **Node.js 20+**
- **Ollama** (optional, for local model execution)

---

### Step-by-Step Installation

#### 1. Clone & Environment Configuration
Clone the repository and set up your environment variables:
```bash
cp .env.example .env
```
Open `.env` and verify your settings (Ollama URL, optional OpenRouter API Key, database config, etc.).

#### 2. Backend Setup
Create your database and launch the API server:
```bash
# Navigate to the backend directory
cd backend

# Install python dependencies
pip install -r requirements.txt

# Return to root directory and initialize database
cd ..
export PYTHONPATH=$PYTHONPATH:.
python3 <<EOF
from backend.app import db, create_app
app = create_app()
with app.app_context():
    db.create_all()
EOF

# Start the Flask backend server (defaults to port 5001)
python backend/run.py
```

#### 3. Frontend Setup
In a new terminal window, configure the presentation layer:
```bash
# Navigate to the frontend directory
cd frontend

# Install node dependencies
npm install

# Start the local development server (defaults to http://localhost:5173)
npm run dev
```

---

## Usage Guide

### Starting a Guided Project
1. Open ByteBuddy in your browser (`http://localhost:5173`).
2. Click **New Chat** or choose **Project Flow** from the Welcome Screen.
3. Your progress bar will light up, indicating you are in the **Planning** stage.
4. Prompt the AI: *"I want to build a real-time task manager app in React and Go."*
5. Once ByteBuddy responds, review the planning artifacts. You'll see automatic follow-up chips at the bottom.
6. Click the recommendation card at the top or use the **Mode Selector** to proceed to the **Architecture** stage. Your planning goals will follow you automatically!

### Using the Code Inspector
1. Switch to **Code Inspector** mode in the composer dropdown.
2. Upload a folder containing your source code or drop a ZIP archive of your repository.
3. Once the files upload, click **Analyze**.
4. Review the health percentages, scanned languages, and detailed security/quality warnings.
5. In the findings tab, click **Generate Fix** on a finding to review code corrections, then implement them directly in your workspace.
6. Ask the inspector chat sidebar: *"Where is the potential memory bottleneck?"* to dig deeper.

---

## Technical Decisions & Best Practices

- **TanStack Query Caching**: Seamless UI updates, optimistic states, and instant navigation between multiple chat sessions without unnecessary backend API refetches.
- **SQLAlchemy Repository Pattern**: Clean decoupling of raw SQLAlchemy queries from route controllers and business services, keeping route definitions legible and testable.
- **Strict Linting**: The frontend workspace incorporates `oxlint` for lightning-fast analysis and compliance with React/TypeScript guidelines (`npm run lint`).
- **Dynamic Context Length Limiting**: Automatic text file clipping prevents LLM context exhaustion by trimming files to strict char ceilings while notifying the user of the omission.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
