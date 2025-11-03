from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, Integer, String, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from PIL import Image
import numpy as np
import cv2
import os
import math
import mediapipe as mp
import tempfile
import threading

Base = declarative_base()
engine = create_engine("sqlite:///exercise.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    sessions = relationship("Session", back_populates="user")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    exercise = Column(String)
    reps = Column(Integer)
    form = Column(String)
    user = relationship("User", back_populates="sessions")

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mp_pose = mp.solutions.pose
mp_drawings = mp.solutions.drawing_utils
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

def calculate_angle(a, b, c):
    rads = math.atan2(c[1]-b[1], c[0]-b[0]) - math.atan2(a[1]-b[1], a[0]-b[0])
    angle = abs(rads * 180 / math.pi)
    if angle > 180:
        angle = 360 - angle
    return angle

def analyze_exercise_frame(exercise_name, landmarks):
    form = "good"
    angle = None
    counter, stage = 0, None

    if exercise_name == "bicep_curl":
        shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                    landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
        elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
        wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y]
        angle = calculate_angle(shoulder, elbow, wrist)
        if angle > 160:
            stage = "down"
        if angle < 50 and stage == "down":
            stage = "up"
            counter += 1
        if angle < 30 or angle > 170:
            form = "bad"

    elif exercise_name == "squat":
        hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
               landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
        knee = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x,
                landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
        ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
        angle = calculate_angle(hip, knee, ankle)
        if angle > 160:
            stage = "up"
        if angle < 90 and stage == "up":
            stage = "down"
            counter += 1
        if angle < 70 or angle > 170:
            form = "bad"

    elif exercise_name == "shoulder_abduction":
        hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
               landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
        shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                    landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
        elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
        angle = calculate_angle(hip, shoulder, elbow)
        if angle < 30:
            stage = "down"
        if angle > 80 and stage == "down":
            stage = "up"
            counter += 1
        if angle < 20 or angle > 120:
            form = "bad"

    return angle, counter, stage, form

@app.post("/analyze_video")
async def analyze_video(file: UploadFile, user_id: str = Form(...), exercise: str = Form(...)):
    temp_path = os.path.join(tempfile.gettempdir(), file.filename)
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    cap = cv2.VideoCapture(temp_path)
    counter, stage = 0, None
    last_form = "good"

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            angle, inc, stage, form = analyze_exercise_frame(exercise, landmarks)
            if inc > 0:
                counter += 1
            last_form = form

    cap.release()
    os.remove(temp_path)
    db = SessionLocal()
    session = Session(user_id=user_id, exercise=exercise, reps=counter, form=last_form)
    db.add(session)
    db.commit()
    db.close()
    return {"user_id": user_id, "exercise": exercise, "reps": counter, "form": last_form}

@app.post("/start_live_tracking")
async def start_live_tracking(user_id: str = Form(...), exercise: str = Form(...)):
    def track():
        cap = cv2.VideoCapture(0)
        counter, stage = 0, None
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(image_rgb)
            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark
                angle, inc, stage, form = analyze_exercise_frame(exercise, landmarks)
                if inc > 0:
                    counter += 1
                mp_drawings.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
                cv2.putText(frame, f'Angle: {int(angle)}', (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)
                cv2.putText(frame, f'Reps: {counter}', (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,0,0), 2)
                cv2.putText(frame, f'Form: {form}', (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,255), 2)
            cv2.imshow("Live Exercise Tracker - Q to stop", frame)
            if cv2.waitKey(10) & 0xFF == ord('q'):
                break
        cap.release()
        cv2.destroyAllWindows()
        db = SessionLocal()
        s = Session(user_id=user_id, exercise=exercise, reps=counter, form=form)
        db.add(s)
        db.commit()
        db.close()
    threading.Thread(target=track).start()
    return {"status": "Tracking started"}

@app.get("/history/{user_id}")
async def history(user_id: int):
    db = SessionLocal()
    sessions = db.query(Session).filter(Session.user_id == user_id).all()
    db.close()
    return [{"exercise": s.exercise, "reps": s.reps, "form": s.form} for s in sessions]
