"""
Inspector Service — handles file uploads, language detection, and AI-powered code analysis.
"""
import os
import re
import json
import time
import zipfile
import tempfile
from typing import List, Dict, Optional
from werkzeug.utils import secure_filename
from backend.app import db
from backend.app.repositories.inspection_repository import InspectionRepository
from backend.app.models.models import InspectionReport


LANGUAGE_MAP = {
    '.py': 'python', '.pyw': 'python',
    '.java': 'java',
    '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.ts': 'typescript', '.tsx': 'typescript', '.jsx': 'javascript',
    '.html': 'html', '.htm': 'html',
    '.css': 'css', '.scss': 'css', '.sass': 'css', '.less': 'css',
    '.sql': 'sql',
    '.go': 'go',
    '.rs': 'rust',
    '.c': 'c', '.h': 'c',
    '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hpp': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin', '.kts': 'kotlin',
    '.sh': 'bash', '.bash': 'bash',
    '.yaml': 'yaml', '.yml': 'yaml',
    '.json': 'json',
    '.xml': 'xml',
    '.md': 'markdown',
    '.toml': 'toml',
    '.ini': 'ini',
    '.cfg': 'ini',
    '.env': 'dotenv',
    '.dockerfile': 'dockerfile',
    '.r': 'r',
}

IGNORED_DIRS = {
    'node_modules', '__pycache__', '.git', '.svn', '.hg',
    'venv', '.venv', 'env', '.env', 'dist', 'build',
    '.idea', '.vscode', '.DS_Store', 'target', 'bin', 'obj',
}

MAX_FILE_SIZE = 500_000  # 500KB per file for analysis


def detect_language(file_path: str) -> Optional[str]:
    _, ext = os.path.splitext(file_path.lower())
    return LANGUAGE_MAP.get(ext)


def should_skip(path: str) -> bool:
    parts = path.replace('\\', '/').split('/')
    return any(p in IGNORED_DIRS for p in parts)


class InspectorService:
    def __init__(self):
        self.repo = InspectionRepository()

    def process_uploaded_files(self, report_id: int, files: list,
                              upload_folder: str) -> List[dict]:
        """Process uploaded files and store in database."""
        processed = []
        for f in files:
            filename = secure_filename(f.filename)
            if not filename:
                continue

            content = None
            try:
                raw = f.read()
                size = len(raw)
                if size <= MAX_FILE_SIZE:
                    content = raw.decode('utf-8', errors='replace')
                f.seek(0)
            except Exception:
                size = 0

            lang = detect_language(filename)
            if lang and content:
                db_file = self.repo.add_file(
                    report_id=report_id,
                    file_path=filename,
                    language=lang,
                    content=content,
                    size_bytes=size,
                )
                processed.append(db_file.to_dict())

        return processed

    def process_zip(self, report_id: int, zip_file, upload_folder: str) -> List[dict]:
        """Extract and process a ZIP file."""
        processed = []
        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = os.path.join(tmpdir, 'upload.zip')
            zip_file.save(zip_path)

            with zipfile.ZipFile(zip_path, 'r') as zf:
                for name in zf.namelist():
                    if name.endswith('/') or should_skip(name):
                        continue

                    lang = detect_language(name)
                    if not lang:
                        continue

                    try:
                        raw = zf.read(name)
                        size = len(raw)
                        if size > MAX_FILE_SIZE:
                            continue
                        content = raw.decode('utf-8', errors='replace')
                    except Exception:
                        continue

                    db_file = self.repo.add_file(
                        report_id=report_id,
                        file_path=name,
                        language=lang,
                        content=content,
                        size_bytes=size,
                    )
                    processed.append(db_file.to_dict())

        return processed

    def process_pasted_code(self, report_id: int, code: str,
                            filename: str = 'pasted_code', language: str = None) -> dict:
        """Process pasted code."""
        if not language:
            language = self._guess_language(code)

        ext_map = {v: k for k, v in LANGUAGE_MAP.items()}
        ext = ext_map.get(language, '.txt')
        if not filename.endswith(ext):
            filename = filename + ext

        db_file = self.repo.add_file(
            report_id=report_id,
            file_path=filename,
            language=language or 'text',
            content=code,
            size_bytes=len(code.encode('utf-8')),
        )
        return db_file.to_dict()

    def _guess_language(self, code: str) -> str:
        """Simple heuristic language detection from code content."""
        indicators = {
            'python': [r'\bdef\s+\w+\(', r'\bimport\s+\w+', r'\bclass\s+\w+:', r'print\('],
            'javascript': [r'\bfunction\s+\w+', r'\bconst\s+\w+', r'\blet\s+\w+', r'=>', r'console\.log'],
            'typescript': [r'\binterface\s+\w+', r':\s*(string|number|boolean)', r'\btype\s+\w+\s*='],
            'java': [r'\bpublic\s+(class|static|void)', r'System\.out\.println', r'\bpackage\s+\w+'],
            'html': [r'<html', r'<div', r'<head', r'<!DOCTYPE'],
            'css': [r'\{[^}]*:\s*[^}]+\}', r'@media', r'\.[\w-]+\s*\{'],
            'sql': [r'\bSELECT\b', r'\bCREATE\s+TABLE\b', r'\bINSERT\s+INTO\b'],
            'go': [r'\bfunc\s+\w+', r'\bpackage\s+\w+', r':='],
            'rust': [r'\bfn\s+\w+', r'\blet\s+mut\b', r'\bimpl\s+\w+'],
            'c': [r'#include\s*<', r'\bint\s+main\s*\(', r'\bprintf\s*\('],
            'cpp': [r'#include\s*<', r'\bstd::', r'\bcout\s*<<', r'\bnamespace\b'],
            'csharp': [r'\busing\s+System', r'\bnamespace\s+\w+', r'\bpublic\s+class\b'],
        }
        scores = {}
        for lang, patterns in indicators.items():
            score = sum(1 for p in patterns if re.search(p, code, re.IGNORECASE))
            if score > 0:
                scores[lang] = score
        if scores:
            return max(scores, key=scores.get)
        return 'text'

    def run_analysis(self, report_id: int, provider, model: str = None) -> dict:
        """Run AI-powered code analysis on all files in the report."""
        report = self.repo.get_report_by_id(report_id)
        if not report:
            raise ValueError("Report not found")

        start_time = time.time()
        self.repo.update_report_status(report_id, 'analyzing')

        files = self.repo.get_files(report_id)
        if not files:
            self.repo.update_report_status(report_id, 'failed')
            raise ValueError("No files to analyze")

        # Build analysis prompt
        languages = list(set(f.language for f in files if f.language))
        file_contents = []
        for f in files:
            if f.content:
                file_contents.append(f"### File: {f.file_path} ({f.language})\n```{f.language}\n{f.content[:3000]}\n```\n")

        code_block = "\n".join(file_contents)

        analysis_prompt = (
            "You are an expert code inspector. Analyze the following codebase thoroughly.\n\n"
            "Perform analysis in these categories:\n"
            "1. **Bug Detection** — logic errors, syntax problems, runtime risks, exception handling\n"
            "2. **Security Vulnerabilities** — OWASP Top 10, hardcoded secrets, injection, XSS, auth\n"
            "3. **Performance** — bottlenecks, memory, complexity, optimization\n"
            "4. **Code Quality** — duplication, smells, naming, complexity, best practices\n"
            "5. **Architecture** — structure, coupling, cohesion, patterns\n"
            "6. **Documentation** — missing docs, unclear code, maintainability\n\n"
            f"Codebase ({len(files)} files, languages: {', '.join(languages)}):\n\n"
            f"{code_block}\n\n"
            "Respond ONLY with valid JSON in this exact format (no markdown, no extra text):\n"
            "{\n"
            '  "scores": {\n'
            '    "overall_health": <0-100>,\n'
            '    "security_score": <0-100>,\n'
            '    "maintainability_score": <0-100>,\n'
            '    "performance_score": <0-100>,\n'
            '    "readability_score": <0-100>,\n'
            '    "documentation_score": <0-100>\n'
            "  },\n"
            '  "summary": "<2-3 sentence summary of code health>",\n'
            '  "findings": [\n'
            "    {\n"
            '      "severity": "critical|high|medium|low|info",\n'
            '      "category": "bug|security|performance|quality|architecture|documentation",\n'
            '      "title": "<short title>",\n'
            '      "file_path": "<file path>",\n'
            '      "line_number": <number or null>,\n'
            '      "explanation": "<what the issue is>",\n'
            '      "root_cause": "<why this happens>",\n'
            '      "why_it_matters": "<impact if not fixed>",\n'
            '      "suggested_fix": "<how to fix it>",\n'
            '      "improved_code": "<fixed code snippet or null>"\n'
            "    }\n"
            "  ],\n"
            '  "improvements": [\n'
            '    "<prioritized improvement suggestion>"\n'
            "  ]\n"
            "}"
        )

        try:
            response = provider.chat_completion(
                [{"role": "user", "content": analysis_prompt}],
                model=model,
                temperature=0.3,
                max_tokens=4096,
            )

            # Parse the AI response
            result = self._parse_analysis_response(response)
            duration = time.time() - start_time

            # Update report scores
            scores = result.get('scores', {})
            self.repo.update_report_scores(
                report_id,
                overall_health=scores.get('overall_health'),
                security_score=scores.get('security_score'),
                maintainability_score=scores.get('maintainability_score'),
                performance_score=scores.get('performance_score'),
                readability_score=scores.get('readability_score'),
                documentation_score=scores.get('documentation_score'),
                files_scanned=len(files),
                analysis_duration=round(duration, 2),
                summary=result.get('summary', ''),
                ai_provider=report.ai_provider,
                ai_model=model or report.ai_model,
            )

            # Store languages
            report = self.repo.get_report_by_id(report_id)
            report.languages = languages
            report.improvements = result.get('improvements', [])
            db.session.commit()

            # Store findings
            for finding in result.get('findings', []):
                self.repo.add_finding(
                    report_id=report_id,
                    severity=finding.get('severity', 'info'),
                    category=finding.get('category', 'quality'),
                    title=finding.get('title', 'Untitled Finding'),
                    file_path=finding.get('file_path'),
                    line_number=finding.get('line_number'),
                    explanation=finding.get('explanation'),
                    root_cause=finding.get('root_cause'),
                    why_it_matters=finding.get('why_it_matters'),
                    suggested_fix=finding.get('suggested_fix'),
                    improved_code=finding.get('improved_code'),
                )

            self.repo.update_report_status(report_id, 'completed')
            return self.repo.get_report_by_id(report_id).to_dict()

        except Exception as e:
            self.repo.update_report_status(report_id, 'failed')
            raise Exception(f"Analysis failed: {str(e)}")

    def _parse_analysis_response(self, response: str) -> dict:
        """Parse the AI analysis response, extracting JSON."""
        # Try direct parse first
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try extracting JSON from markdown code block
        match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Try finding the outermost JSON object
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        # Fallback: return a basic structure
        return {
            'scores': {
                'overall_health': 50,
                'security_score': 50,
                'maintainability_score': 50,
                'performance_score': 50,
                'readability_score': 50,
                'documentation_score': 50,
            },
            'summary': 'Analysis completed but response could not be fully parsed.',
            'findings': [],
            'improvements': ['Review the code manually for a more thorough analysis.'],
        }

    def generate_fix(self, finding_id: int, provider, model: str = None) -> str:
        """Generate a fix for a specific finding using AI."""
        finding = self.repo.get_finding_by_id(finding_id)
        if not finding:
            raise ValueError("Finding not found")

        # Get the file content for context
        file_record = None
        if finding.file_path:
            files = self.repo.get_files(finding.report_id)
            file_record = next((f for f in files if f.file_path == finding.file_path), None)

        prompt = (
            f"Fix the following code issue:\n\n"
            f"**Issue:** {finding.title}\n"
            f"**Severity:** {finding.severity}\n"
            f"**File:** {finding.file_path or 'N/A'}\n"
            f"**Line:** {finding.line_number or 'N/A'}\n"
            f"**Explanation:** {finding.explanation or 'N/A'}\n"
        )

        if file_record and file_record.content:
            prompt += f"\n**Current Code:**\n```\n{file_record.content[:3000]}\n```\n"

        prompt += (
            "\nProvide the complete fixed code with the issue resolved. "
            "Explain what you changed and why. Use proper markdown formatting."
        )

        response = provider.chat_completion(
            [{"role": "user", "content": prompt}],
            model=model,
            temperature=0.3,
            max_tokens=4096,
        )

        return response
