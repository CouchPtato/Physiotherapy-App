from pydantic import BaseModel

class RegisterRequest(BaseModel):
    email: str
    password: str
    dob: str
    role: str

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    role: str
