import json
import re
from typing import List, Optional, Generator
from backend.app.repositories.conversation_repository import ConversationRepository
from backend.app.repositories.workflow_repository import WorkflowRepository
from backend.app.services.workflow_service import WorkflowService
from backend.app.providers.ollama import OllamaProvider
from backend.app.providers.openrouter import OpenRouterProvider
from backend.app import db
from flask import current_app
from backend.app.services.settings_service import SettingsService
import os


class ChatService:
    def __init__(self):
        self.repo = ConversationRepository()
        self.workflow_repo = WorkflowRepository()
        self.workflow_service = WorkflowService()

    def _get_app_config(self, key, default=None):
        """Safely get config from current_app with fallback to env."""
        try:
            return current_app.config.get(key, default)
        except RuntimeError:
            return os.getenv(key, default)

    def get_provider(self, name: str):
        if name == 'ollama':
            ollama_url = self._get_app_config('OLLAMA_BASE_URL', 'http://localhost:11434')
            ollama_model = self._get_app_config('OLLAMA_MODEL')
            return OllamaProvider(ollama_url, ollama_model)
        elif name == 'openrouter':
            api_key = SettingsService.get_openrouter_api_key()
            model = self._get_app_config('OPENROUTER_MODEL', 'google/gemini-2.0-flash-001')
            return OpenRouterProvider(api_key, model)
        else:
            raise ValueError(f"Unknown provider: {name}")

    def stream_message(self, conversation_id: int, user_content: str, display_content: str = None):
        """
        Stream AI response. Returns a dict with all data collected within request context.
        The actual streaming happens on the frontend consuming the chunks.
        """
        # ALL database and AI operations happen HERE, within request context
        conv = self.repo.get_by_id(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")

        workflow = self.workflow_repo.get_state(conversation_id)
        current_stage = workflow.current_stage if workflow else 'planning'

        self.repo.add_message(conversation_id, 'user', display_content or user_content, workflow_stage=current_stage)
        messages = self.repo.get_messages(conversation_id)

        chat_history = [{'role': m.role, 'content': m.content} for m in messages]
        if display_content:
            for item in reversed(chat_history):
                if item['role'] == 'user':
                    item['content'] = user_content
                    break

        if current_stage == 'normal':
            system_prompt = (
                "You are ByteBuddy, a professional AI assistant. Answer naturally and directly. "
                "Use Markdown when it improves clarity. Provide complete, thorough responses."
            )
        else:
            context = self.workflow_repo.get_all_context(conv.id)
            system_prompt = self.workflow_service.get_system_prompt(current_stage, context)
            if current_stage == 'inspector':
                system_prompt += self._get_inspection_context(conv.id)
        
        chat_history.insert(0, {'role': 'system', 'content': system_prompt})

        provider = self.get_provider(conv.settings.provider)
        chunks = []  # Collect all chunks here
        full_response = ""

        # Stream from provider and collect chunks
        try:
            for chunk in provider.chat_completion_stream(
                chat_history,
                model=conv.settings.model,
                temperature=conv.settings.temperature,
                max_tokens=max(conv.settings.max_tokens, 3000)
            ):
                chunks.append(chunk)
                full_response += chunk
        except Exception as e:
            error_text = f"\n\n**Error**: {str(e)}"
            chunks.append(error_text)
            full_response += error_text
            raise

        # Persist response (still in request context)
        if full_response.strip():
            try:
                suggestions = self._generate_suggestions(full_response, conv.settings.provider, conv.settings.model)
                self.repo.add_message(
                    conv.id, 'assistant', full_response,
                    suggestions=suggestions,
                    workflow_stage=current_stage,
                )
                
                if workflow:
                    self.workflow_repo.add_artifact(
                        conversation_id=conversation_id,
                        stage=current_stage,
                        artifact_type='response',
                        title=f'{current_stage} response',
                        content=full_response,
                    )
            except Exception:
                pass

        # Return chunks that can be yielded by the route handler
        return chunks

    def send_message(self, conversation_id: int, user_content: str, display_content: str = None):
        conv = self.repo.get_by_id(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")

        workflow = self.workflow_repo.get_state(conversation_id)
        current_stage = workflow.current_stage if workflow else 'planning'

        self.repo.add_message(conversation_id, 'user', display_content or user_content, workflow_stage=current_stage)

        messages = self.repo.get_messages(conversation_id)
        try:
            assistant_msg = self._create_assistant_message(
                conv,
                messages,
                current_stage,
                current_user_content=user_content if display_content else None,
            )
        except Exception as e:
            error_msg = self.repo.add_message(
                conversation_id, 'assistant',
                f"Error generating response: {str(e)}\n\nPlease try again or check your provider settings.",
                workflow_stage=current_stage
            )
            raise Exception(f"Failed to generate response: {str(e)}")

        if workflow and assistant_msg.content:
            try:
                self.workflow_repo.add_artifact(
                    conversation_id=conversation_id,
                    stage=current_stage,
                    artifact_type='response',
                    title=f'{current_stage} response',
                    content=assistant_msg.content,
                )
            except Exception:
                pass

        if len(messages) <= 2:
            try:
                new_title = self._generate_title(
                    display_content or user_content, assistant_msg.content,
                    conv.settings.provider, conv.settings.model
                )
                if new_title:
                    self.repo.update_title(conversation_id, new_title)
            except Exception:
                pass

        return assistant_msg

    def regenerate_message(self, conversation_id: int, message_id: int):
        conv = self.repo.get_by_id(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")

        target = self.repo.get_message(message_id)
        if not target or target.conversation_id != conversation_id:
            raise ValueError("Message not found")
        if target.role != 'assistant':
            raise ValueError("Only assistant messages can be regenerated")

        messages = self.repo.get_messages(conversation_id)
        latest_assistant = next((m for m in reversed(messages) if m.role == 'assistant'), None)
        if not latest_assistant or latest_assistant.id != message_id:
            raise ValueError("Only the latest assistant response can be regenerated")

        stage = target.workflow_stage or 'planning'

        self.repo.delete_message(message_id)
        remaining_messages = self.repo.get_messages(conversation_id)
        if not any(m.role == 'user' for m in remaining_messages):
            raise ValueError("Regeneration needs a user message to answer")

        return self._create_assistant_message(conv, remaining_messages, stage)

    def _create_assistant_message(self, conv, messages, stage: str = 'planning', current_user_content: str = None):
        chat_history = [{'role': m.role, 'content': m.content} for m in messages]
        if current_user_content:
            for item in reversed(chat_history):
                if item['role'] == 'user':
                    item['content'] = current_user_content
                    break

        if stage == 'normal':
            system_prompt = (
                "You are ByteBuddy, a professional AI assistant. Answer naturally and directly. "
                "Use Markdown when it improves clarity. Provide complete, thorough responses without truncation."
            )
        else:
            context = self.workflow_repo.get_all_context(conv.id)
            system_prompt = self.workflow_service.get_system_prompt(stage, context)
            if stage == 'inspector':
                system_prompt += self._get_inspection_context(conv.id)
        
        chat_history.insert(0, {'role': 'system', 'content': system_prompt})

        provider = self.get_provider(conv.settings.provider)
        
        ai_response = provider.chat_completion(
            chat_history,
            model=conv.settings.model,
            temperature=conv.settings.temperature,
            max_tokens=max(conv.settings.max_tokens, 3000)
        )

        if not ai_response or ai_response.strip() == "":
            raise Exception("Provider returned empty response")

        suggestions = self._generate_suggestions(ai_response, conv.settings.provider, conv.settings.model)

        return self.repo.add_message(
            conv.id, 'assistant', ai_response,
            suggestions=suggestions,
            workflow_stage=stage,
        )

    def _get_inspection_context(self, conversation_id: int) -> str:
        try:
            from backend.app.repositories.inspection_repository import InspectionRepository

            inspection_repo = InspectionRepository()
            report = inspection_repo.get_report(conversation_id)
            if not report:
                return "\n\nNo inspection report is available yet."

            findings = inspection_repo.get_findings(report.id)
            files = inspection_repo.get_files(report.id)
            context = [
                "\n\n---\n## Latest Code Inspection Context",
                f"Status: {report.status}",
                f"Files scanned: {report.files_scanned or len(files)}",
                f"Languages: {', '.join(report.languages) if report.languages else 'unknown'}",
                f"Overall health: {report.overall_health if report.overall_health is not None else 'not scored'}",
                f"Security score: {report.security_score if report.security_score is not None else 'not scored'}",
                f"Maintainability score: {report.maintainability_score if report.maintainability_score is not None else 'not scored'}",
                f"Summary: {report.summary or 'No summary available.'}",
            ]

            if report.improvements:
                context.append("\nPrioritized improvements:")
                for item in report.improvements[:8]:
                    context.append(f"- {item}")

            if findings:
                context.append("\nTop findings:")
                severity_rank = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4}
                top_findings = sorted(findings, key=lambda f: severity_rank.get(f.severity, 5))[:12]
                for finding in top_findings:
                    location = finding.file_path or 'Global'
                    if finding.line_number:
                        location += f":{finding.line_number}"
                    context.append(
                        f"- [{finding.severity.upper()}] {finding.title} ({location}) — "
                        f"{finding.explanation or 'No explanation'}"
                    )

            context.append(
                "\nWhen the user asks follow-up questions, answer using this inspection context. "
                "If they ask for fixes, prioritize critical/high findings first and provide concrete code-level steps."
            )
            return "\n".join(context)
        except Exception:
            return "\n\nInspection context could not be loaded. Continue with available conversation context."

    def _generate_suggestions(self, last_response: str, provider_name: str, model: str) -> List[str]:
        prompt = (
            f"Based on this AI response, suggest 3 concise follow-up questions or actions "
            f"a developer might take. Return ONLY a JSON array of strings.\n\n"
            f"Response: {last_response[:500]}"
        )
        try:
            provider = self.get_provider(provider_name)
            res = provider.chat_completion(
                [{"role": "user", "content": prompt}],
                model=model, max_tokens=100
            )
            match = re.search(r'\[.*\]', res.replace('\n', ''))
            if match:
                return json.loads(match.group())
            return ["Tell me more", "Show an example", "How do I test this?"]
        except Exception:
            return ["Tell me more", "Show an example", "How do I test this?"]

    def _generate_title(self, user_msg: str, ai_msg: str, provider_name: str, model: str) -> Optional[str]:
        prompt = (
            f"Generate a concise (2-4 words) title for a conversation starting with: "
            f"'{user_msg[:100]}'. Return ONLY the title, no quotes."
        )
        try:
            provider = self.get_provider(provider_name)
            res = provider.chat_completion(
                [{"role": "user", "content": prompt}],
                model=model, max_tokens=20
            )
            return res.strip().strip('"').strip("'")
        except Exception:
            return None

    def generate_summary(self, conversation_id: int):
        conv = self.repo.get_by_id(conversation_id)
        if not conv:
            return None
        messages = self.repo.get_messages(conversation_id)
        history_text = "\n".join([f"{m.role}: {m.content[:200]}" for m in messages])
        prompt = f"Summarize this developer conversation in 2-3 concise sentences:\n\n{history_text}"
        try:
            provider = self.get_provider(conv.settings.provider)
            summary = provider.chat_completion(
                [{"role": "user", "content": prompt}],
                model=conv.settings.model, max_tokens=150
            )
            conv.summary = summary
            db.session.commit()
            return summary
        except Exception:
            return None
