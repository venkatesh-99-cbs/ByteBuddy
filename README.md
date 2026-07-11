# 🤖 ByteBuddy — Your Intelligent SDLC Developer Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![React: 18](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Docker: Supported](https://img.shields.io/badge/Docker-Supported-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Ollama: Local LLM](https://img.shields.io/badge/Ollama-Local%20LLM-black.svg)](https://ollama.com/)

> **Build Faster. Learn Better. Debug Smarter.**
> ByteBuddy is a production-quality, enterprise-grade AI Developer Assistant designed to streamline software engineering workflows. It provides a clean, professional workspace inspired by tools like Linear, GitHub, and Cursor, allowing developers to interact with local LLMs (via Ollama) or cloud-based models (via OpenRouter).

---

## 📖 Table of Contents

- [✨ Key Features](#-key-features)
- [🧩 Supported AI Providers & Models](#-supported-ai-providers--models)
- [🛠️ The 10 Workspace Modes Explained](#️-the-10-workspace-modes-explained)
- [🔄 Guided Project Workflow & Context Chaining](#-guided-project-workflow--context-chaining)
- [🔍 The Code Inspector & Upload System](#-the-code-inspector--upload-system)
- [🏗️ Tech Stack & Directory Structure](#️-tech-stack--directory-structure)
- [🚀 Quick Start (Local Development)](#-quick-start-local-development)
- [🐳 Docker Deployment (Recommended)](#-docker-deployment-recommended)
- [🔧 Environment Configuration](#-environment-configuration)
- [💡 Troubleshooting & Best Practices](#-troubleshooting--best-practices)
- [📄 License](#-license)

---

## ✨ Key Features

- **🎨 Clean Enterprise UI/UX**: Sleek, dark-mode-first look utilizing Tailwind CSS, `shadcn/ui` components, Lucide Icons, and smooth Framer Motion transitions.
- **🔌 Hybrid AI Provider Engine**: Seamlessly switch between local **Ollama** (100% offline & private) and cloud-based **OpenRouter** (for advanced models like Claude, GPT, or Gemini).
- **🔄 Interdependent SDLC Progressions**: Dynamic workspace state recommendations to guide projects smoothly from concept and design down to test creation and documentation.
- **⛓️ Intelligently Chained Context**: Generated SDLC planning documents, DB schemas, and API contracts are automatically saved as project artifacts and appended to system prompts in subsequent stages.
- **🩺 Interactive Code Inspector**: Upload directories, zip archives, or paste single snippets to run a multi-dimensional diagnostic report on code health, security, and performance.
- **💬 Smart Chat Enhancements**:
  - **Auto-Generated Titles**: Learns context from the initial turn to generate clean chat room names.
  - **Contextual Chip Suggestions**: Dynamically renders 3 follow-up question chips after every agent response.
  - **One-Click Conversation Summarizer**: Instantly digests long chats into 2-3 sentence reference summaries.
  - **Response Pinning**: Bookmark code blocks, tables, or database definitions directly onto a side cabinet.
  - **Resource Attachments**: Robust handling for documents, files, and image attachments up to 50MB.

---

## 🧩 Supported AI Providers & Models

Each chat room maintains its own local settings. Open the settings drawer or check the inline headers to set your configuration:

| Provider | API Endpoint | Model Auto-Detection | Requirements & Usage |
| :--- | :--- | :--- | :--- |
| **Ollama** | `http://localhost:11434` *(local)*<br>`http://host.docker.internal:11434` *(Docker)* | **Yes** (automated via `/api/tags`) | Start Ollama on your machine (`ollama serve`), pull any LLM (e.g., `ollama pull llama3.1` or `qwen2.5-coder`), and ByteBuddy will automatically populate them. |
| **OpenRouter** | `https://openrouter.ai/api/v1` | **Yes** (automated API fetches) | Insert your API Key via the API Key Modal. Choose highly-capable cloud configurations (e.g., `google/gemini-2.0-flash-001`, `anthropic/claude-3-haiku`, etc.). |

---

## 🛠️ The 10 Workspace Modes Explained

ByteBuddy adapts its underlying system instructions, prompt styling, and contextual behaviors based on the active **Workspace Mode**:

1. **Normal Chat (`normal`)**: General purpose assistant. Perfect for writing algorithms, quick syntax questions, or standard refactors.
2. **Planning (`planning`)**: Software Planner. Outputs user stories, product roadmaps, requirements specifications, and risk mitigation strategies.
3. **Architecture (`architecture`)**: System Architect. Recommends tier separation structures, charts ASCII flow graphs, and proposes file/folder organization.
4. **Database Design (`database`)**: Lead DBA. Generates relational structures, index plans, normalization steps, and copies SQL `CREATE TABLE` scripts.
5. **API Design (`api_design`)**: API Architect. Designs endpoints, requests/payloads, CORS setups, and full OpenAPI specifications.
6. **Coding (`coding`)**: Senior Engineer. Writes production-ready, highly DRY-compliant code blocks annotated with correct workspace file paths.
7. **Code Inspector (`inspector`)**: Systems Auditor. Analyzes code health scores and populates security & optimization remediation panels.
8. **Security Review (`security`)**: DevSecOps Expert. Tests structures against the OWASP Top 10, identifies secret leakage, and constructs mitigations.
9. **Testing (`testing`)**: QA Architect. Produces robust unit, integration, and end-to-end tests, mocking utilities, and coverage plans.
10. **Documentation (`documentation`)**: Technical Writer. Converts developer logs and milestones into elegant, clean markdown manuals and runbooks.

---

## 🔄 Guided Project Workflow & Context Chaining

With ByteBuddy, your AI isn't just a static chat partner—it acts as an active companion that understands the state of your project.

```
 [Planning] ──► [Architecture] ──► [Database] ──► [API Design] ──► [Coding] ──► [Inspector] ──► [Security] ──► [Testing] ──► [Documentation]
```

1. **Persistent Artifact Generation**: High-fidelity architectural maps, schemas, and plans are stored as persistent workflow artifacts inside the SQLite backend.
2. **Automatic Context Progression**: Moving to subsequent steps automatically carries over previous specifications, feeding them to the prompt. *For example, when writing your API contracts (`api_design`), ByteBuddy automatically instructs the LLM on your proposed SQL structures (`database`) without requiring you to copy and paste them.*
3. **Smart Workflows**: The UI displays customized recommendation prompts on top of the chat panel to suggest the next logical software development cycle step.

---

## 🔍 The Code Inspector & Upload System

ByteBuddy's **Code Inspector** dashboard provides an interactive workspace to review entire codebases:

1. **Multi-Format Uploads**: Easily upload single snippets, standard directories, or complete compressed `.zip` archives.
2. **Multi-Dimensional Metrics**: Once analyzed, ByteBuddy outputs an overall code health grade alongside breakdowns for *Security*, *Performance*, *Readability*, and *Maintainability*.
3. **Actionable Finding Feed**: Reviews issues categorized by severity (`Critical`, `High`, `Medium`, `Low`, `Info`).
4. **Interactive Diffs (Generate Fix)**: Click any reported issue to see an analysis and click **Generate Fix** to immediately output a side-by-side patch diff.
5. **Contextual Side-Chat**: Ask specific questions regarding the audit report (e.g., *"How do I fix the high-severity SQL Injection vector in my user login route?"*) within the persistent inspector sidebar.

---

## 🏗️ Tech Stack & Directory Structure

ByteBuddy uses a clean, decoupled **Layered Architecture**:
`Presentation (Frontend) ➔ API Routing Layer ➔ Service Engines ➔ AI Provider / Repository Drivers ➔ Database Model`

```
bytebuddy/
├── backend/                       # Flask REST Backend
│   ├── app/
│   │   ├── config/                # Database and System Configurations
│   │   ├── models/                # SQLAlchemy Schemas (Users, Chats, Artifacts)
│   │   ├── providers/             # LLM API Wrappers (Ollama, OpenRouter)
│   │   ├── repositories/          # SQLite Access Layer (Repository Pattern)
│   │   ├── routes/                # Flask Endpoint Blueprints (Chat, Inspector, Auth)
│   │   └── services/              # Core Business Logic & File Upload Parsers
│   ├── requirements.txt           # Python Package Dependencies
│   └── run.py                     # Backend Entry Point
├── frontend/                      # React SPA Frontend
│   ├── src/
│   │   ├── assets/                # Images & Icons
│   │   ├── components/            # Shadcn & Custom UI Modules (Inspector, Chat, etc.)
│   │   ├── hooks/                 # Custom React Hooks & Context Wrappers
│   │   ├── lib/                   # Styling & Utility Helpers (Tailwind merging)
│   │   ├── services/              # Axios API Service Definitions
│   │   └── types/                 # TypeScript Contract Definitions
│   ├── package.json               # Frontend Config & Tooling
│   └── vite.config.ts             # Vite Build Settings
├── instance/                      # SQL Database Persistence Directory
│   └── bytebuddy.db               # SQLite Database File
├── .env.example                   # Shared Environment Variables Blueprint
├── docker-compose.yml             # Orchestration for Multi-Container Services
├── backend.Dockerfile             # Multi-stage Container definition for Python Backend
└── frontend.Dockerfile            # Optimized Node Container definition for SPA Frontend
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Python 3.12+**
- **Node.js 20+** & **npm**
- **Ollama** (optional, for local offline execution)

### 1. Clone & Set Up Configuration
```bash
git clone https://github.com/your-username/bytebuddy.git
cd bytebuddy
cp .env.example .env
```

### 2. Backend Setup
Create your virtual environment, install packages, initialize schemas, and launch the API server:
```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Return to root & run migration utility to initialize SQLite
cd ..
export PYTHONPATH=$PYTHONPATH:.
python3 <<EOF
from backend.app import db, create_app
app = create_app()
with app.app_context():
    db.create_all()
EOF

# Start the Backend Server (defaults to port 5001)
python backend/run.py
```

### 3. Frontend Setup
In a new terminal shell:
```bash
cd frontend

# Install Node modules
npm install

# Run the local Vite preview server (defaults to http://localhost:5173)
npm run dev
```

---

## 🐳 Docker Deployment (Recommended)

Docker provides an instant environment setup, isolating backend Python dependencies and frontend Node environments.

### 🎥 Running via Docker Compose

Configure your `.env` variables (such as OpenRouter key and database location), then simply boot the services:

```bash
# Build and run containers in detached mode
docker-compose up --build -d
```

### ⚙️ Docker Compose Port Layout & Routing
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5001`
- **SQLite Storage**: Mounts locally on host at `./instance` for persistent data backups.

---

## 🔧 Environment Configuration

A complete `.env` file must reside in the root directory. Below are the key environment configurations:

```ini
# --- LLM Providers ---
OLLAMA_BASE_URL=http://localhost:11434               # Local development endpoint
# Note: In Docker contexts, use OLLAMA_BASE_URL=http://host.docker.internal:11434 to bridge network access
OLLAMA_MODEL=llama3.1                                # Default fallback Ollama model

OPENROUTER_API_KEY=your-openrouter-key               # Optional: OpenRouter token
OPENROUTER_MODEL=google/gemini-2.0-flash-001         # Default fallback OpenRouter model

# --- Database & App Config ---
DATABASE_URL=sqlite:///instance/bytebuddy.db        # Location of relational SQLite DB
FLASK_APP=backend/run.py
FLASK_ENV=development                                # Switch to 'production' in production environments
```

---

## 💡 Troubleshooting & Best Practices

### 🔌 Connecting Docker Backend to Local Ollama
By default, Docker containers run in isolated networks. If Ollama is running natively on your host machine (Mac/Windows/Linux), the Docker container cannot connect to `http://localhost:11434`.
- **Solution**: Set your `OLLAMA_BASE_URL` env variable in `.env` to `http://host.docker.internal:11434`.
- Ensure your local Ollama daemon is configured to listen on all interfaces. On macOS, run `launchctl setenv OLLAMA_HOST "0.0.0.0"` and restart Ollama.

### 📂 File Sizing and Context Trimming
The Code Inspector automatically prunes oversized or binary files during `.zip` and folder parsing to avoid breaking the LLM's context window. Highly complex codebases may show a warning banner noting trimmed paths to maintain optimal speed and response accuracy.

### 🧪 Frontend Types & Fast Linting
The frontend is built under TypeScript strict rules. Running `npm run build` is strictly typechecked via `tsc`.
- **Linter**: We utilize `oxlint` for lightning-fast analysis:
  ```bash
  cd frontend
  npm run lint
  ```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
