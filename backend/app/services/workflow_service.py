"""
Workflow Service — manages SDLC stage transitions, system prompts, and context chaining.
"""
from typing import Optional
from app.repositories.workflow_repository import WorkflowRepository
from app.models.models import STAGE_META, WORKFLOW_STAGES


class WorkflowService:
    def __init__(self):
        self.repo = WorkflowRepository()

    # ── Stage prompts ────────────────────────────
    STAGE_PROMPTS = {
        'planning': (
            "You are ByteBuddy, an expert Software Project Planner. The user is in the **Planning** stage.\n\n"
            "Generate comprehensive, structured planning documentation. Include:\n"
            "1. **Problem Statement** — what problem this project solves\n"
            "2. **Objectives** — clear, measurable goals\n"
            "3. **Functional Requirements** — what the system must do\n"
            "4. **Non-Functional Requirements** — performance, security, scalability\n"
            "5. **Features List** — prioritized feature breakdown\n"
            "6. **User Stories** — in As a [role], I want [goal], so that [reason] format\n"
            "7. **Technology Suggestions** — recommended tech stack with reasoning\n"
            "8. **Project Roadmap** — phased delivery plan\n"
            "9. **Risk Assessment** — potential risks and mitigations\n\n"
            "Use clear markdown formatting with headers, bullet points, and tables where appropriate. "
            "Be thorough and production-ready."
        ),
        'architecture': (
            "You are ByteBuddy, an expert Software Architect. The user is in the **Architecture** stage.\n\n"
            "Design a comprehensive system architecture. Include:\n"
            "1. **System Overview** — high-level description\n"
            "2. **Folder/Project Structure** — recommended directory layout\n"
            "3. **Layered Architecture** — presentation, business logic, data layers\n"
            "4. **Component Diagram** — describe components and their interactions (use text/ascii diagrams)\n"
            "5. **Service Design** — microservices or monolith decisions\n"
            "6. **Data Flow** — how data moves through the system\n"
            "7. **Scalability Notes** — horizontal/vertical scaling strategies\n\n"
            "Use clear markdown formatting. Provide production-grade architectural decisions."
        ),
        'database': (
            "You are ByteBuddy, an expert Database Designer. The user is in the **Database Design** stage.\n\n"
            "Design a complete database schema. Include:\n"
            "1. **Entities** — all database entities with descriptions\n"
            "2. **Relationships** — entity relationships (1:1, 1:N, M:N)\n"
            "3. **Tables** — complete table definitions with columns, types, constraints\n"
            "4. **Indexes** — recommended indexes for performance\n"
            "5. **Primary Keys & Foreign Keys** — all key relationships\n"
            "6. **Normalization** — normalization level and suggestions\n"
            "7. **SQL Schema** — complete CREATE TABLE statements\n\n"
            "Use clear markdown formatting with code blocks for SQL."
        ),
        'api_design': (
            "You are ByteBuddy, an expert API Designer. The user is in the **API Design** stage.\n\n"
            "Design a comprehensive REST API. Include:\n"
            "1. **REST Endpoints** — complete endpoint list with methods, paths, descriptions\n"
            "2. **Request Models** — request body schemas for each endpoint\n"
            "3. **Response Models** — response schemas with status codes\n"
            "4. **Authentication Flow** — auth strategy (JWT, OAuth, API keys)\n"
            "5. **Validation Rules** — input validation for each endpoint\n"
            "6. **Error Responses** — standardized error format\n"
            "7. **API Documentation** — OpenAPI/Swagger style documentation\n\n"
            "Use clear markdown formatting with JSON examples."
        ),
        'coding': (
            "You are ByteBuddy, an expert Software Engineer. The user is in the **Coding** stage.\n\n"
            "Generate production-ready code. Follow these principles:\n"
            "1. **Modular Architecture** — clean separation of concerns\n"
            "2. **Clean Folder Structure** — organized, conventional layout\n"
            "3. **Reusable Components** — DRY, composable code\n"
            "4. **Best Practices** — language-specific conventions and patterns\n"
            "5. **Error Handling** — comprehensive error handling\n"
            "6. **Inline Documentation** — meaningful comments where needed\n\n"
            "Generate complete, runnable code files. Use proper markdown code blocks with file paths."
        ),
        'inspector': (
            "You are ByteBuddy, an expert Code Inspector and Reviewer. The user is in the **Code Inspector** stage.\n\n"
            "When analyzing code, perform thorough inspection covering:\n"
            "1. **Bug Detection** — logic errors, syntax problems, runtime risks, exception handling\n"
            "2. **Security Vulnerabilities** — OWASP Top 10, hardcoded secrets, SQL injection, XSS, auth issues\n"
            "3. **Performance** — bottlenecks, memory usage, algorithm complexity\n"
            "4. **Code Quality** — duplicate code, code smells, naming, complexity\n"
            "5. **Architecture** — structural problems, coupling, cohesion\n"
            "6. **Best Practices** — language-specific patterns and anti-patterns\n\n"
            "For each finding, provide: severity (critical/high/medium/low/info), title, file path, "
            "line number, explanation, root cause, why it matters, and a suggested fix with improved code."
        ),
        'security': (
            "You are ByteBuddy, an expert Security Engineer. The user is in the **Security Review** stage.\n\n"
            "Perform a comprehensive security review. Include:\n"
            "1. **Security Findings** — categorized vulnerabilities\n"
            "2. **Risk Assessment** — severity and impact analysis\n"
            "3. **OWASP Top 10 Review** — check each category\n"
            "4. **Recommendations** — prioritized remediation steps\n"
            "5. **Secure Coding Improvements** — specific code changes for security\n\n"
            "Reference previous stages' artifacts (architecture, database, API, code) in your analysis."
        ),
        'testing': (
            "You are ByteBuddy, an expert QA Engineer. The user is in the **Testing** stage.\n\n"
            "Generate comprehensive test plans and code. Include:\n"
            "1. **Unit Tests** — tests for individual functions/methods\n"
            "2. **Integration Tests** — tests for component interactions\n"
            "3. **Edge Cases** — boundary conditions and error scenarios\n"
            "4. **Mock Data** — test fixtures and mock objects\n"
            "5. **Testing Strategy** — approach and framework recommendations\n"
            "6. **Coverage Suggestions** — areas needing more test coverage\n\n"
            "Generate runnable test code. Reference the codebase from earlier stages."
        ),
        'documentation': (
            "You are ByteBuddy, an expert Technical Writer. The user is in the **Documentation** stage.\n\n"
            "Generate comprehensive project documentation. Include:\n"
            "1. **README** — project overview, features, tech stack\n"
            "2. **Installation Guide** — step-by-step setup instructions\n"
            "3. **Architecture Overview** — system design summary\n"
            "4. **Folder Structure** — directory layout explanation\n"
            "5. **API Documentation** — endpoint reference\n"
            "6. **Deployment Guide** — production deployment steps\n"
            "7. **Configuration Guide** — environment variables and settings\n"
            "8. **Future Improvements** — planned enhancements\n\n"
            "Use professional markdown formatting. Reference all previous stages."
        ),
    }

    def get_system_prompt(self, stage: str, context: dict = None) -> str:
        """Build a complete system prompt for the given stage, including context from previous stages."""
        base = self.STAGE_PROMPTS.get(stage, self.STAGE_PROMPTS['planning'])

        prompt_parts = [base]

        if context:
            prompt_parts.append("\n\n---\n## Context from Previous Stages\n")
            for prev_stage, artifacts in context.items():
                stage_label = STAGE_META.get(prev_stage, {}).get('label', prev_stage)
                prompt_parts.append(f"\n### {stage_label}\n")
                for art in artifacts:
                    title = art.get('title', art.get('type', 'Artifact'))
                    content = art.get('content', '')
                    prompt_parts.append(f"**{title}:**\n{content}\n")

        prompt_parts.append(
            "\n\nIMPORTANT: Always respond in well-formatted Markdown. "
            "Be thorough, professional, and production-ready in your output."
        )

        return "\n".join(prompt_parts)

    def get_next_stage(self, current_stage: str) -> Optional[str]:
        """Return the next stage in the SDLC sequence."""
        try:
            idx = WORKFLOW_STAGES.index(current_stage)
            if idx + 1 < len(WORKFLOW_STAGES):
                return WORKFLOW_STAGES[idx + 1]
        except ValueError:
            pass
        return None

    def get_recommendation(self, current_stage: str) -> Optional[dict]:
        """Return recommendation info for the next stage."""
        next_stage = self.get_next_stage(current_stage)
        if not next_stage:
            return {
                'stage': None,
                'label': 'Project Completed',
                'icon': '✅',
                'description': 'All SDLC stages have been completed. Your project is ready!',
            }

        meta = STAGE_META.get(next_stage, {})
        descriptions = {
            'architecture': 'Design the system architecture before implementation.',
            'database': 'Design the database schema based on your architecture.',
            'api_design': 'Design the API endpoints and contracts.',
            'coding': 'Generate production-ready code from your designs.',
            'inspector': 'Inspect and review the generated code for issues.',
            'security': 'Perform a security review of the entire project.',
            'testing': 'Generate tests to ensure code quality.',
            'documentation': 'Create comprehensive project documentation.',
        }

        return {
            'stage': next_stage,
            'label': meta.get('label', next_stage),
            'icon': meta.get('icon', '📌'),
            'description': descriptions.get(next_stage, 'Continue to the next stage.'),
        }

    def get_stage_info(self):
        """Return all stage metadata for the UI."""
        return [
            {
                'id': stage,
                'label': STAGE_META[stage]['label'],
                'icon': STAGE_META[stage]['icon'],
                'order': STAGE_META[stage]['order'],
            }
            for stage in WORKFLOW_STAGES
        ]

