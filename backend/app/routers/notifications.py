from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db, SessionLocal
from app.core.deps import get_current_user
from app.core.security import decode_token
from app.models import User, Notification
from app.schemas.workflows import NotificationResponse
from app.websocket.manager import manager

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=List[NotificationResponse])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifs = (
        db.query(Notification)
        .filter_by(user_id=current_user.user_id)
        .order_by(Notification.notification_id.desc())
        .limit(50)
        .all()
    )
    return [
        NotificationResponse(
            notification_id=n.notification_id,
            type=n.type,
            title=n.title,
            body=n.body,
            related_id=n.related_id,
            related_type=n.related_type,
            is_read=n.is_read,
            created_at=n.created_at,
        )
        for n in notifs
    ]


@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(Notification)
        .filter_by(user_id=current_user.user_id, is_read=False)
        .count()
    )
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter_by(notification_id=notification_id, user_id=current_user.user_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.post("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter_by(user_id=current_user.user_id, is_read=False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


# WebSocket endpoint for real-time notification push
ws_router = APIRouter(tags=["WebSocket"])


@ws_router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str = Query(...)):
    user_id = None
    try:
        payload = decode_token(token)
        if payload.get("type") == "access":
            user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=1008)
        return

    if not user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep-alive heartbeat ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)
