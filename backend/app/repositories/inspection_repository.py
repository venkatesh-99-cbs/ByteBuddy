from typing import List, Optional
from backend.app import db
from backend.app.models.models import InspectionReport, InspectionFile, InspectionFinding


class InspectionRepository:
    # ── Reports ──────────────────────────────────
    @staticmethod
    def create_report(conversation_id: int, ai_provider: str = None,
                      ai_model: str = None) -> InspectionReport:
        report = InspectionReport(
            conversation_id=conversation_id,
            ai_provider=ai_provider,
            ai_model=ai_model,
            status='pending',
        )
        db.session.add(report)
        db.session.commit()
        return report

    @staticmethod
    def get_report(conversation_id: int) -> Optional[InspectionReport]:
        return InspectionReport.query.filter_by(
            conversation_id=conversation_id
        ).order_by(InspectionReport.created_at.desc()).first()

    @staticmethod
    def get_report_by_id(report_id: int) -> Optional[InspectionReport]:
        return InspectionReport.query.get(report_id)

    @staticmethod
    def update_report_status(report_id: int, status: str) -> Optional[InspectionReport]:
        report = InspectionReport.query.get(report_id)
        if report:
            report.status = status
            db.session.commit()
        return report

    @staticmethod
    def update_report_scores(report_id: int, **scores) -> Optional[InspectionReport]:
        report = InspectionReport.query.get(report_id)
        if report:
            for key, value in scores.items():
                if hasattr(report, key):
                    setattr(report, key, value)
            db.session.commit()
        return report

    # ── Files ────────────────────────────────────
    @staticmethod
    def add_file(report_id: int, file_path: str, language: str = None,
                 content: str = None, size_bytes: int = 0) -> InspectionFile:
        f = InspectionFile(
            report_id=report_id,
            file_path=file_path,
            language=language,
            content=content,
            size_bytes=size_bytes,
        )
        db.session.add(f)
        db.session.commit()
        return f

    @staticmethod
    def get_files(report_id: int) -> List[InspectionFile]:
        return InspectionFile.query.filter_by(report_id=report_id).order_by(
            InspectionFile.file_path.asc()
        ).all()

    @staticmethod
    def get_file_by_id(file_id: int) -> Optional[InspectionFile]:
        return InspectionFile.query.get(file_id)

    # ── Findings ─────────────────────────────────
    @staticmethod
    def add_finding(report_id: int, severity: str, category: str, title: str,
                    file_path: str = None, line_number: int = None,
                    explanation: str = None, root_cause: str = None,
                    why_it_matters: str = None, suggested_fix: str = None,
                    improved_code: str = None) -> InspectionFinding:
        finding = InspectionFinding(
            report_id=report_id,
            severity=severity,
            category=category,
            title=title,
            file_path=file_path,
            line_number=line_number,
            explanation=explanation,
            root_cause=root_cause,
            why_it_matters=why_it_matters,
            suggested_fix=suggested_fix,
            improved_code=improved_code,
        )
        db.session.add(finding)
        db.session.commit()
        return finding

    @staticmethod
    def get_findings(report_id: int, severity: str = None,
                     category: str = None) -> List[InspectionFinding]:
        query = InspectionFinding.query.filter_by(report_id=report_id)
        if severity:
            query = query.filter_by(severity=severity)
        if category:
            query = query.filter_by(category=category)
        return query.order_by(InspectionFinding.created_at.asc()).all()

    @staticmethod
    def update_finding_status(finding_id: int, status: str) -> Optional[InspectionFinding]:
        finding = InspectionFinding.query.get(finding_id)
        if finding:
            finding.status = status
            db.session.commit()
        return finding

    @staticmethod
    def get_finding_by_id(finding_id: int) -> Optional[InspectionFinding]:
        return InspectionFinding.query.get(finding_id)
