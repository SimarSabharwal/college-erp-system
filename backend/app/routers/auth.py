from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.models.users import User
from app.schemas.auth import LoginRequest, TokenResponse, RefreshTokenRequest, UserMeResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _extract_user_meta(user: User):
    role_name = user.role.role_name if user.role else ""
    teacher_id = user.teacher_profile.teacher_id if user.teacher_profile else None
    employee_no = user.teacher_profile.employee_no if user.teacher_profile else None
    student_id = user.student_profile.student_id if user.student_profile else None
    section_id = user.student_profile.section_id if user.student_profile else None
    roll_no = user.student_profile.roll_no if user.student_profile else None
    student_erp = user.student_profile.student_erp if user.student_profile else None
    prn = user.student_profile.prn if user.student_profile else None
    program_code = (
        user.student_profile.program.program_code
        if (user.student_profile and hasattr(user.student_profile, "program") and user.student_profile.program)
        else ("BCA" if student_id else None)
    )
    semester_no = 3 if student_id else None
    section_name = (
        user.student_profile.section.section_name
        if (user.student_profile and user.student_profile.section)
        else ("III" if student_id else None)
    )
    shift_name = (
        user.student_profile.section.shift.name
        if (user.student_profile and user.student_profile.section and user.student_profile.section.shift)
        else ("Morning" if student_id else None)
    )
    return {
        "role_name": role_name,
        "teacher_id": teacher_id,
        "employee_no": employee_no,
        "student_id": student_id,
        "section_id": section_id,
        "roll_no": roll_no,
        "student_erp": student_erp,
        "prn": prn,
        "program_code": program_code,
        "semester_no": semester_no,
        "section_name": section_name,
        "shift_name": shift_name,
    }


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if user.status != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or disabled",
        )

    meta = _extract_user_meta(user)
    access_token = create_access_token(subject=user.user_id, role=meta["role_name"])
    refresh_token = create_refresh_token(subject=user.user_id, role=meta["role_name"])

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.user_id,
        full_name=user.full_name,
        email=user.email,
        role=meta["role_name"],
        department_id=user.department_id,
        teacher_id=meta["teacher_id"],
        student_id=meta["student_id"],
        student_erp=meta["student_erp"],
        prn=meta["prn"],
        program_code=meta["program_code"],
        semester_no=meta["semester_no"],
        section_name=meta["section_name"],
        shift_name=meta["shift_name"],
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.user_id == int(user_id)).first()
    if not user or user.status != "Active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    meta = _extract_user_meta(user)
    new_access_token = create_access_token(subject=user.user_id, role=meta["role_name"])
    new_refresh_token = create_refresh_token(subject=user.user_id, role=meta["role_name"])

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user_id=user.user_id,
        full_name=user.full_name,
        email=user.email,
        role=meta["role_name"],
        department_id=user.department_id,
        teacher_id=meta["teacher_id"],
        student_id=meta["student_id"],
        student_erp=meta["student_erp"],
        prn=meta["prn"],
        program_code=meta["program_code"],
        semester_no=meta["semester_no"],
        section_name=meta["section_name"],
        shift_name=meta["shift_name"],
    )


@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    meta = _extract_user_meta(current_user)

    return UserMeResponse(
        user_id=current_user.user_id,
        full_name=current_user.full_name,
        email=current_user.email,
        role=meta["role_name"],
        department_id=current_user.department_id,
        teacher_id=meta["teacher_id"],
        student_id=meta["student_id"],
        section_id=meta["section_id"],
        roll_no=meta["roll_no"],
        employee_no=meta["employee_no"],
        student_erp=meta["student_erp"],
        prn=meta["prn"],
        program_code=meta["program_code"],
        semester_no=meta["semester_no"],
        section_name=meta["section_name"],
        shift_name=meta["shift_name"],
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}
