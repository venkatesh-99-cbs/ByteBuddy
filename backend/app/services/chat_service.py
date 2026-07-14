import json
import re
from typing import List, Optional, Generator
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.services.workflow_service import WorkflowService
from app.providers.ollama import OllamaProvider
from app.providers.openrouter import OpenRouterProvider
from app import db
from flask import current_app
from app.services.settings_service import SettingsService
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
        conv = self.repo.get_by_id(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")

        workflow = self.workflow_repo.get_state(conversation_id)
        current_stage = workflow.current_stage if workflow else 'planning'

        self.repo.add_message(conversation_id, 'user', display_content or user_content, workflow_stage=current_stage)
        messages = self.repo.get_messages(conversation_id)
        assistant_count_before_response = sum(1 for m in messages if m.role == 'assistant')

        chat_history = [{'role': m.role, 'content': m.content} for m in messages]
        if display_content:
            for item in reversed(chat_history):
                if item['role'] == 'user':
                    item['content'] = user_content
                    break

        if current_stage == 'normal':
            system_prompt = (
                "You are ByteBuddy, a professional AI assistant. Answer naturally and directly. "
                "Use Markdown when it improves clarity. Provide complete, thorough, professional responses."
            )
        else:
            context = self.workflow_repo.get_all_context(conv.id)
            system_prompt = self.workflow_service.get_system_prompt(current_stage, context)
            if current_stage == 'inspector':
                system_prompt += self._get_inspection_context(conv.id)
        
        chat_history.insert(0, {'role': 'system', 'content': system_prompt})

        provider = self.get_provider(conv.settings.provider)
        chunks = []
        full_response = ""

        try:
            for chunk in provider.chat_completion_stream(
                chat_history,
                model=conv.settings.model,
                temperature=conv.settings.temperature,
                max_tokens=max(conv.settings.max_tokens, 5000)
            ):
                chunks.append(chunk)
                full_response += chunk
        except Exception as e:
            error_text = f"\n\n**Error**: {str(e)}"
            chunks.append(error_text)
            full_response += error_text
            raise

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

            self._maybe_generate_title(
                conversation_id,
                display_content or user_content,
                full_response,
                assistant_count_before_response,
            )

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

        # Generate title only on the first exchange.
        assistant_count_before_response = sum(1 for m in messages if m.role == 'assistant')
        self._maybe_generate_title(
            conversation_id,
            display_content or user_content,
            assistant_msg.content,
            assistant_count_before_response,
        )

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

        stage = target.workflow_stage or 'planning'
        messages = self.repo.get_messages(conversation_id)
        latest_stage_assistant = next(
            (
                m for m in reversed(messages)
                if m.role == 'assistant' and (m.workflow_stage or 'planning') == stage
            ),
            None,
        )
        if not latest_stage_assistant or latest_stage_assistant.id != message_id:
            raise ValueError("Only the latest assistant response in this chat stage can be regenerated")

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
                "Use Markdown when it improves clarity. Provide complete, thorough, professional responses without truncation."
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
            max_tokens=max(conv.settings.max_tokens, 5000)
        )

        if not ai_response or ai_response.strip() == "":
            raise Exception("Provider returned empty response")

        suggestions = self._generate_suggestions(ai_response, conv.settings.provider, conv.settings.model)

        return self.repo.add_message(
            conv.id, 'assistant', ai_response,
            suggestions=suggestions,
            workflow_stage=stage,
        )

    def _maybe_generate_title(
        self,
        conversation_id: int,
        user_content: str,
        assistant_content: str,
        assistant_count_before_response: int,
    ) -> None:
        """Name a new chat after its first assistant response, for streamed and non-streamed chats."""
        if assistant_count_before_response != 0:
            return

        try:
            new_title = self._generate_title(user_content, assistant_content)
            if new_title:
                self.repo.update_title(conversation_id, new_title)
        except Exception:
            pass

    def _get_inspection_context(self, conversation_id: int) -> str:
        try:
            from app.repositories.inspection_repository import InspectionRepository

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
                model=model, max_tokens=150
            )
            match = re.search(r'\[.*\]', res.replace('\n', ''))
            if match:
                return json.loads(match.group())
            return ["Tell me more", "Show an example", "How do I test this?"]
        except Exception:
            return ["Tell me more", "Show an example", "How do I test this?"]

    def _generate_title(self, user_msg: str, ai_msg: str) -> Optional[str]:
        """Generate a readable title from the user's first message without an extra AI call."""
        user_snippet = re.sub(r'\s+', ' ', (user_msg or '')[:300]).strip()
        if not user_snippet:
            return None

        # Extract first meaningful sentence/phrase
        sentences = re.split(r'[.!?\n]', user_snippet)
        first_phrase = sentences[0].strip() if sentences else ""

        # Remove markdown syntax and URLs
        first_phrase = re.sub(r'[`*_#>\[\]{}()]+', '', first_phrase)
        first_phrase = re.sub(r'\bhttps?://\S+', '', first_phrase).strip(' :-,')

        if first_phrase:
            words = first_phrase.split()
            stop_words = {
                'what', 'how', 'why', 'when', 'where', 'can', 'you', 'help',
                'please', 'these', 'this', 'that', 'would', 'could', 'should',
                'does', 'is', 'are', 'be', 'have', 'has', 'do', 'the', 'a',
                'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                'of', 'with', 'me', 'my', 'i', 'it', 'its', 'was', 'will'
            }

            # Keep meaningful words (length > 2 and not a stop word)
            meaningful_words = [
                w for w in words
                if len(w) > 2 and w.lower() not in stop_words
            ]

            # If we have at least 2 meaningful words, build title from them
            if len(meaningful_words) >= 2:
                title = ' '.join(meaningful_words[:min(6, len(meaningful_words))]).strip(' :-,')
                if 3 < len(title) <= 80:
                    return title[:1].upper() + title[1:]

            # Fallback: use ALL words (up to 8) from first phrase if meaningful filter was too aggressive
            if len(words) >= 2:
                title = ' '.join(words[:min(7, len(words))]).strip(' :-,')
                if 3 < len(title) <= 80:
                    return title[:1].upper() + title[1:]

        # Last fallback: trim the raw snippet to 60 chars at a word boundary
        if len(user_snippet) > 1:
            trimmed = user_snippet[:60].rsplit(' ', 1)[0].strip(' :-,')
            if len(trimmed) > 1:
                return trimmed[:1].upper() + trimmed[1:]

        return None


    def generate_summary(self, conversation_id: int):
        """Generate a professional, meaningful summary of the entire conversation."""
        conv = self.repo.get_by_id(conversation_id)
        if not conv:
            return None
        
        messages = self.repo.get_messages(conversation_id)
        if len(messages) < 2:
            return "No sufficient conversation to summarize."
        
        # Build complete conversation context
        conversation_flow = []
        for i, msg in enumerate(messages):
            role = "Developer" if msg.role == "user" else "ByteBuddy"
            # Include more context
            content = msg.content[:500]
            conversation_flow.append(f"{role}: {content}")
        
        flow_text = "\n\n".join(conversation_flow)
        
        prompt = (
            f"Analyze this ENTIRE conversation and create a professional, concise summary (4-6 sentences) that explains:\n"
            f"1. What the developer asked or needed (main goal)\n"
            f"2. What ByteBuddy provided or explained (key solutions/advice)\n"
            f"3. Any alternatives or considerations discussed\n"
            f"4. The final outcome or takeaways\n\n"
            f"Write it as a brief professional summary, not a transcript. Use simple, clear language.\n"
            f"Focus on WHAT HAPPENED in the conversation, not just listing messages.\n\n"
            f"Full Conversation:\n{flow_text}\n\n"
            f"Professional Summary:"
        )
        
        try:
            provider = self.get_provider(conv.settings.provider)
            summary = provider.chat_completion(
                [{"role": "user", "content": prompt}],
                model=conv.settings.model, max_tokens=300
            )
            summary = summary.strip()
            if summary:
                conv.summary = summary
                db.session.commit()
                return summary
            return None
        except Exception:
            return None

