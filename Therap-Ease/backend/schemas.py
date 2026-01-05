from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    dob: str
    role: str

class LoginRequest(BaseModel):
    username: EmailStr
    password: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    role: str
