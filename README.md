# ByteBuddy – Your Intelligent Developer Companion

> Build Faster. Learn Better. Debug Smarter.

ByteBuddy is a production-quality AI Developer Assistant designed for software engineers. It provides a clean, enterprise-grade interface for interacting with LLMs via Ollama or OpenRouter, with features specifically tailored for developer workflows.

## Features

- **Clean Enterprise UI**: Inspired by Linear, GitHub, and Cursor.
- **Dual AI Providers**: Support for local Ollama and cloud-based OpenRouter.
- **Conversation Management**: Persistent storage, auto-generated titles, and one-click summaries.
- **Developer Focus**: Advanced Markdown support, code syntax highlighting, and copy-to-clipboard.
- **Explanation Modes**: Tailor responses for Beginner, Student, Junior/Senior Developer, or Tech Lead.
- **Smart Follow-ups**: Context-aware suggestion chips after every response.
- **Pinned Messages**: Bookmark important AI responses for quick access.
- **Responsive Design**: Fully functional on desktop and mobile.

## Architecture

The project follows a modular, layered architecture:

- **Presentation Layer**: React (Vite, TypeScript, Tailwind CSS, shadcn/ui)
- **API Layer**: Flask RESTful endpoints
- **Service Layer**: Business logic for AI interactions and data processing
- **Provider Layer**: Pluggable AI providers (Ollama, OpenRouter)
- **Repository Layer**: Data access using SQLAlchemy
- **Database**: SQLite

## Folder Structure

```text
bytebuddy/
├── backend/
│   ├── app/
│   │   ├── routes/        # API Endpoints
│   │   ├── services/      # Business Logic
│   │   ├── providers/     # AI Provider Implementations
│   │   ├── repositories/  # Database Queries
│   │   ├── models/        # SQLAlchemy Models
│   │   ├── schemas/       # Data Validation
│   │   ├── prompts/       # System Prompts
│   │   ├── middleware/    # Auth/Logging Middleware
│   │   ├── database/      # DB Initialization
│   │   ├── utils/         # Helper functions
│   │   └── config/        # Environment Configuration
├── frontend/              # Vite + React Application
├── instance/              # SQLite database file
├── docs/                  # Additional Documentation
├── docker-compose.yml
└── .env.example
```

## Setup & Installation

### Prerequisites

- Python 3.12+
- Node.js 20+
- (Optional) Ollama running locally

### Backend Setup

1. Navigate to the root directory.
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Initialize the database:
   ```bash
   export PYTHONPATH=$PYTHONPATH:.
   python3 <<EOF
   from backend.app import db, create_app
   app = create_app()
   with app.app_context():
       db.create_all()
   EOF
   ```
5. Run the Flask server:
   ```bash
   python backend/run.py
   ```

### Frontend Setup

1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Configuring AI Providers

### Ollama
- Ensure Ollama is running (`ollama serve`).
- The default URL is `http://localhost:11434`.
- Models are auto-detected.

### OpenRouter
- Get an API key from [OpenRouter](https://openrouter.ai/).
- Add `OPENROUTER_API_KEY` to your `.env` file.
- Select your preferred model in ByteBuddy settings.

## Technical Decisions

- **TanStack Query**: Used for robust server-state management and caching.
- **SQLAlchemy Repository Pattern**: Decouples business logic from data access.
- **Tailwind CSS & shadcn/ui**: Provides a consistent, accessible, and professional look with minimal overhead.
- **Explanation Modes**: Implemented via dynamic system prompting to influence LLM behavior.

## License

MIT
