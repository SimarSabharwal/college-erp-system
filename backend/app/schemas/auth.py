from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    email: str
    role: str
    department_id: Optional[int] = None
    teacher_id: Optional[int] = None
    student_id: Optional[int] = None
    student_erp: Optional[str] = None
    prn: Optional[str] = None
    program_code: Optional[str] = None
    semester_no: Optional[int] = None
    section_name: Optional[str] = None
    shift_name: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserMeResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    department_id: Optional[int] = None
    teacher_id: Optional[int] = None
    student_id: Optional[int] = None
    section_id: Optional[int] = None
    roll_no: Optional[str] = None
    employee_no: Optional[str] = None
    student_erp: Optional[str] = None
    prn: Optional[str] = None
    program_code: Optional[str] = None
    semester_no: Optional[int] = None
    section_name: Optional[str] = None
    shift_name: Optional[str] = None
