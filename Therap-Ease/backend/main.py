from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import Base, engine, SessionLocal
from backend.models import User
from backend.schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse
)
from backend.auth import (
    hash_password,
    verify_password,
    create_access_token
)

app = FastAPI()

# Create DB tables
Base.metadata.create_all(bind=engine)

# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ================= REGISTER =================
@app.post("/register")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    user = User(
        email=data.email,
        password=hash_password(data.password),
        dob=data.dob,
        role=data.role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User registered successfully"}

# ================= LOGIN =================
@app.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == data.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )

    if user.role != data.role:
        raise HTTPException(
            status_code=403,
            detail="Role mismatch"
        )

    token = create_access_token({
        "sub": user.email,
        "role": user.role
    })

    return {
        "access_token": token,
        "role": user.role
    }
