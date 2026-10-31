import asyncio
from typing import Optional
from sqlalchemy.orm import Session
from app.models.workflows import Notification
from app.models.users import User, Role
from app.websocket.manager import manager


class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        type: str,
        title: str,
        body: str,
        related_id: Optional[int] = None,
        related_type: Optional[str] = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            related_id=related_id,
            related_type=related_type,
            is_read=False,
        )
        db.add(notif)
        db.flush()

        # Push to WebSocket if event loop is running
        payload = {
            "notification_id": notif.notification_id,
            "type": notif.type,
            "title": notif.title,
            "body": notif.body,
            "related_id": notif.related_id,
            "related_type": notif.related_type,
            "created_at": notif.created_at.isoformat() if notif.created_at else None,
        }
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(manager.send_personal_message(payload, user_id))
        except Exception:
            pass

        return notif

    @staticmethod
    def notify_admins(
        db: Session,
        type: str,
        title: str,
        body: str,
        related_id: Optional[int] = None,
        related_type: Optional[str] = None,
    ):
        admin_role = db.query(Role).filter_by(role_name="Admin").first()
        if not admin_role:
            return
        admins = db.query(User).filter_by(role_id=admin_role.role_id, status="Active").all()
        for admin in admins:
            NotificationService.create_notification(
                db,
                user_id=admin.user_id,
                type=type,
                title=title,
                body=body,
                related_id=related_id,
                related_type=related_type,
            )

    @staticmethod
    def notify_hod(
        db: Session,
        department_id: Optional[int],
        type: str,
        title: str,
        body: str,
        related_id: Optional[int] = None,
        related_type: Optional[str] = None,
    ):
        if not department_id:
            return
        hod_role = db.query(Role).filter_by(role_name="HOD").first()
        if not hod_role:
            return
        hods = db.query(User).filter_by(
            role_id=hod_role.role_id,
            department_id=department_id,
            status="Active"
        ).all()
        for hod in hods:
            NotificationService.create_notification(
                db,
                user_id=hod.user_id,
                type=type,
                title=title,
                body=body,
                related_id=related_id,
                related_type=related_type,
            )
