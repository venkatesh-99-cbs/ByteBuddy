from datetime import datetime
from backend.app import db
import json


class Conversation(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False, default='New Conversation')
    summary = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship('Message', backref='conversation', lazy=True, cascade="all, delete-orphan")
    settings = db.relationship('ConversationSettings', backref='conversation', uselist=False, cascade="all, delete-orphan")
    workflow = db.relationship('WorkflowState', backref='conversation', uselist=False, cascade="all, delete-orphan")
    artifacts = db.relationship('WorkflowArtifact', backref='conversation', lazy=True, cascade="all, delete-orphan")
    inspection_reports = db.relationship('InspectionReport', backref='conversation', lazy=True, cascade="all, delete-orphan")


class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    is_pinned = db.Column(db.Boolean, default=False)
    suggestions = db.Column(db.JSON, nullable=True)
    workflow_stage = db.Column(db.String(50), nullable=True)  # which stage generated this message
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ConversationSettings(db.Model):
    __tablename__ = 'conversation_settings'
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    provider = db.Column(db.String(50), default='ollama')
    model = db.Column(db.String(100))
    temperature = db.Column(db.Float, default=0.7)
    max_tokens = db.Column(db.Integer, default=4096)
    workflow_mode = db.Column(db.String(50), default='planning')


class AppSettings(db.Model):
    __tablename__ = 'app_settings'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(255))


# ──────────────────────────────────────────────
# Workflow Models
# ──────────────────────────────────────────────

WORKFLOW_STAGES = [
    'planning',
    'architecture',
    'database',
    'api_design',
    'coding',
    'inspector',
    'security',
    'testing',
    'documentation',
]

STAGE_META = {
    'planning':      {'icon': '📋', 'label': 'Planning',       'order': 0},
    'architecture':  {'icon': '🏗',  'label': 'Architecture',   'order': 1},
    'database':      {'icon': '🗄',  'label': 'Database',       'order': 2},
    'api_design':    {'icon': '🌐', 'label': 'API Design',     'order': 3},
    'coding':        {'icon': '💻', 'label': 'Coding',         'order': 4},
    'inspector':     {'icon': '🛠',  'label': 'Code Inspector', 'order': 5},
    'security':      {'icon': '🔒', 'label': 'Security Review','order': 6},
    'testing':       {'icon': '🧪', 'label': 'Testing',        'order': 7},
    'documentation': {'icon': '📄', 'label': 'Documentation',  'order': 8},
}


class WorkflowState(db.Model):
    __tablename__ = 'workflow_states'
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False, unique=True)
    current_stage = db.Column(db.String(50), default='planning')
    completed_stages_json = db.Column(db.Text, default='[]')  # JSON array
    project_name = db.Column(db.String(255), nullable=True)
    tech_stack = db.Column(db.Text, nullable=True)  # JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def completed_stages(self):
        try:
            return json.loads(self.completed_stages_json or '[]')
        except (json.JSONDecodeError, TypeError):
            return []

    @completed_stages.setter
    def completed_stages(self, value):
        self.completed_stages_json = json.dumps(value)

    @property
    def is_completed(self):
        return set(WORKFLOW_STAGES).issubset(set(self.completed_stages))

    def next_stage(self):
        """Return the next recommended stage, or None if all complete."""
        for stage in WORKFLOW_STAGES:
            if stage not in self.completed_stages:
                return stage
        return None

    def mark_complete(self, stage):
        completed = self.completed_stages
        if stage not in completed:
            completed.append(stage)
            self.completed_stages = completed

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'current_stage': self.current_stage,
            'completed_stages': self.completed_stages,
            'project_name': self.project_name,
            'tech_stack': self.tech_stack,
            'is_completed': self.is_completed,
            'next_recommended': self.next_stage(),
        }


class WorkflowArtifact(db.Model):
    __tablename__ = 'workflow_artifacts'
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    stage = db.Column(db.String(50), nullable=False)
    artifact_type = db.Column(db.String(50), nullable=False)  # e.g. 'requirements', 'schema', 'code', 'report'
    title = db.Column(db.String(255), nullable=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'stage': self.stage,
            'artifact_type': self.artifact_type,
            'title': self.title,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
        }


# ──────────────────────────────────────────────
# Code Inspector Models
# ──────────────────────────────────────────────

class InspectionReport(db.Model):
    __tablename__ = 'inspection_reports'
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    status = db.Column(db.String(30), default='pending')  # pending, analyzing, completed, failed
    overall_health = db.Column(db.Float, nullable=True)
    security_score = db.Column(db.Float, nullable=True)
    maintainability_score = db.Column(db.Float, nullable=True)
    performance_score = db.Column(db.Float, nullable=True)
    readability_score = db.Column(db.Float, nullable=True)
    documentation_score = db.Column(db.Float, nullable=True)
    files_scanned = db.Column(db.Integer, default=0)
    languages_json = db.Column(db.Text, default='[]')
    analysis_duration = db.Column(db.Float, nullable=True)  # seconds
    ai_provider = db.Column(db.String(50), nullable=True)
    ai_model = db.Column(db.String(100), nullable=True)
    summary = db.Column(db.Text, nullable=True)
    improvements_json = db.Column(db.Text, default='[]')  # prioritized roadmap
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    files = db.relationship('InspectionFile', backref='report', lazy=True, cascade="all, delete-orphan")
    findings = db.relationship('InspectionFinding', backref='report', lazy=True, cascade="all, delete-orphan")

    @property
    def languages(self):
        try:
            return json.loads(self.languages_json or '[]')
        except (json.JSONDecodeError, TypeError):
            return []

    @languages.setter
    def languages(self, value):
        self.languages_json = json.dumps(value)

    @property
    def improvements(self):
        try:
            return json.loads(self.improvements_json or '[]')
        except (json.JSONDecodeError, TypeError):
            return []

    @improvements.setter
    def improvements(self, value):
        self.improvements_json = json.dumps(value)

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'status': self.status,
            'overall_health': self.overall_health,
            'security_score': self.security_score,
            'maintainability_score': self.maintainability_score,
            'performance_score': self.performance_score,
            'readability_score': self.readability_score,
            'documentation_score': self.documentation_score,
            'files_scanned': self.files_scanned,
            'languages': self.languages,
            'analysis_duration': self.analysis_duration,
            'ai_provider': self.ai_provider,
            'ai_model': self.ai_model,
            'summary': self.summary,
            'improvements': self.improvements,
            'created_at': self.created_at.isoformat(),
            'findings_count': {
                'critical': len([f for f in self.findings if f.severity == 'critical']),
                'high': len([f for f in self.findings if f.severity == 'high']),
                'medium': len([f for f in self.findings if f.severity == 'medium']),
                'low': len([f for f in self.findings if f.severity == 'low']),
                'info': len([f for f in self.findings if f.severity == 'info']),
            },
        }


class InspectionFile(db.Model):
    __tablename__ = 'inspection_files'
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('inspection_reports.id'), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)  # relative path in uploaded project
    language = db.Column(db.String(50), nullable=True)
    content = db.Column(db.Text, nullable=True)
    size_bytes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'report_id': self.report_id,
            'file_path': self.file_path,
            'language': self.language,
            'size_bytes': self.size_bytes,
            'issue_count': len([f for f in self.report.findings if f.file_path == self.file_path]),
            'created_at': self.created_at.isoformat(),
        }


class InspectionFinding(db.Model):
    __tablename__ = 'inspection_findings'
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('inspection_reports.id'), nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # critical, high, medium, low, info
    category = db.Column(db.String(50), nullable=False)  # bug, security, performance, quality, etc.
    title = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=True)
    line_number = db.Column(db.Integer, nullable=True)
    explanation = db.Column(db.Text, nullable=True)
    root_cause = db.Column(db.Text, nullable=True)
    why_it_matters = db.Column(db.Text, nullable=True)
    suggested_fix = db.Column(db.Text, nullable=True)
    improved_code = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='open')  # open, resolved, ignored
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'report_id': self.report_id,
            'severity': self.severity,
            'category': self.category,
            'title': self.title,
            'file_path': self.file_path,
            'line_number': self.line_number,
            'explanation': self.explanation,
            'root_cause': self.root_cause,
            'why_it_matters': self.why_it_matters,
            'suggested_fix': self.suggested_fix,
            'improved_code': self.improved_code,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
        }
