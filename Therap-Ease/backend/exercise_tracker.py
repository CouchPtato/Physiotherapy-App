from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fpdf import FPDF
from datetime import datetime
import os
import time
import base64
import cv2
import numpy as np
import mediapipe as mp

# ============================================================
# APP SETUP
# ============================================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REPORT_DIR = "reports"
VIDEO_DIR = "videos"

os.makedirs(REPORT_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

app.mount("/reports", StaticFiles(directory=REPORT_DIR), name="reports")
app.mount("/videos", StaticFiles(directory=VIDEO_DIR), name="videos")

# ============================================================
# MEDIAPIPE SETUP
# ============================================================

mp_pose = mp.solutions.pose

# Global detector for LIVE frames (fast)
pose_detector = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=0,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# ============================================================
# EXERCISE → REQUIRED KEYPOINTS
# ============================================================

NEEDED_KEYS = {
    "bicep_curl": [
        "left_shoulder", "left_elbow", "left_wrist",
        "right_shoulder", "right_elbow", "right_wrist",
    ],
    "squat": [
        "left_hip", "left_knee", "left_ankle",
        "right_hip", "right_knee", "right_ankle",
    ],
    "shoulder_abduction": [
        "left_shoulder", "left_elbow",
        "right_shoulder", "right_elbow",
    ],
    "knee_extension": [
        "left_hip", "left_knee",
        "right_hip", "right_knee",
    ],
    "leg_raise": [
        "left_hip", "left_knee", "left_ankle",
        "right_hip", "right_knee", "right_ankle",
    ],
    "side_bend": [
        "left_shoulder", "right_shoulder",
        "left_hip", "right_hip",
    ],
}

# ============================================================
# MODELS
# ============================================================

class FrameRequest(BaseModel):
    image_base64: str
    exercise_key: str | None = None

# ============================================================
# LIVE FRAME ANALYSIS (USED BY APP)
# ============================================================

@app.post("/analyze_frame")
async def analyze_frame(req: FrameRequest):
    try:
        img_data = base64.b64decode(req.image_base64)
        np_img = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        # Downscale for speed
        h, w = frame.shape[:2]
        max_side = 320
        scale = max_side / max(h, w)
        if scale < 1:
            frame = cv2.resize(
                frame,
                (int(w * scale), int(h * scale)),
                interpolation=cv2.INTER_AREA,
            )

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose_detector.process(rgb)

        if not results.pose_landmarks:
            return {"pose": {"keypoints": []}}

        wanted = None
        if req.exercise_key:
            wanted = NEEDED_KEYS.get(req.exercise_key)

        keypoints = []
        for idx, lm in enumerate(results.pose_landmarks.landmark):
            name = mp_pose.PoseLandmark(idx).name.lower()

            if wanted and name not in wanted:
                continue

            keypoints.append({
                "name": name,
                "x": float(lm.x),
                "y": float(lm.y),
                "score": float(lm.visibility),
            })

        return {"pose": {"keypoints": keypoints}}

    except Exception:
        raise HTTPException(status_code=500, detail="Frame processing failed")

# ============================================================
# VIDEO ANALYSIS (OFFLINE / UPLOAD)
# ============================================================

def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = abs(radians * 180 / np.pi)
    return 360 - angle if angle > 180 else angle


@app.post("/analyze_video")
async def analyze_video(
    file: UploadFile = File(...),
    exercise_key: str = Form(...),
    patient_name: str = Form("Somay Singh"),
    patient_id: str = Form("P-2025-001"),
    assigned_reps: int = Form(10),
    sets: int = Form(1),
):
    ext = os.path.splitext(file.filename or "video.mp4")[1]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    input_path = os.path.join(VIDEO_DIR, f"{ts}{ext}")
    output_path = os.path.join(VIDEO_DIR, f"proc_{ts}.mp4")

    with open(input_path, "wb") as f:
        f.write(await file.read())

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Video open failed")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    reps, stage = 0, None
    rep_times, scores = [], []
    start = time.time()
    last_rep = None

    with mp_pose.Pose(model_complexity=1) as pose:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = pose.process(rgb)

            if not res.pose_landmarks:
                out.write(frame)
                continue

            lm = res.pose_landmarks.landmark
            angles = []

            if exercise_key in ["squat", "knee_extension", "leg_raise"]:
                for side in ["LEFT", "RIGHT"]:
                    hip = lm[getattr(mp_pose.PoseLandmark, f"{side}_HIP").value]
                    knee = lm[getattr(mp_pose.PoseLandmark, f"{side}_KNEE").value]
                    ankle = lm[getattr(mp_pose.PoseLandmark, f"{side}_ANKLE").value]
                    angles.append(calculate_angle(
                        [hip.x, hip.y],
                        [knee.x, knee.y],
                        [ankle.x, ankle.y],
                    ))

            if angles:
                angle = float(np.mean(angles))
                if angle > 160:
                    stage = "up"
                if angle < 100 and stage == "up":
                    stage = "down"
                    reps += 1
                    now = time.time()
                    if last_rep:
                        rep_times.append(now - last_rep)
                    last_rep = now

            out.write(frame)

    cap.release()
    out.release()

    duration = time.time() - start
    avg_time = float(np.mean(rep_times)) if rep_times else 0.0

    return {
        "video_url": f"/videos/{os.path.basename(input_path)}",
        "processed_video_url": f"/videos/{os.path.basename(output_path)}",
        "exercise_key": exercise_key,
        "patient_name": patient_name,
        "patient_id": patient_id,
        "reps": reps,
        "assigned_reps": assigned_reps,
        "sets": sets,
        "duration": duration,
        "avg_time": avg_time,
    }

# ============================================================
# PDF REPORT
# ============================================================
def generate_ai_physio_review(form_score, avg_time, reps, assigned_reps):
    remarks = []

    # Technique
    if form_score >= 85:
        remarks.append(
            "The patient demonstrated excellent movement quality with consistent joint alignment."
        )
    elif form_score >= 70:
        remarks.append(
            "Overall technique was good, though minor deviations were observed during certain repetitions."
        )
    else:
        remarks.append(
            "Movement quality was inconsistent, indicating the need for corrective supervision."
        )

    # Speed
    if avg_time < 3:
        remarks.append(
            "Repetitions were performed in a slow and controlled manner, appropriate for rehabilitation."
        )
    elif avg_time < 7:
        remarks.append(
            "Movement tempo was appropriate and well controlled."
        )
    else:
        remarks.append(
            "Repetitions were performed at a faster pace; controlled tempo is recommended."
        )

    # Volume
    if reps >= assigned_reps:
        remarks.append(
            "The prescribed exercise volume was successfully completed."
        )
    else:
        remarks.append(
            "The patient was unable to complete the prescribed volume, possibly due to fatigue."
        )

    remarks.append(
        "Continued focus on pain-free range of motion and gradual progression is advised."
    )

    return " ".join(remarks)

def calculate_form_score(exercise, angle):
    ideal_ranges = {
        "bicep_curl": (30, 160),
        "squat": (70, 160),
        "shoulder_abduction": (70, 160),
        "knee_extension": (0, 160),
        "leg_raise": (40, 150),
        "side_bend": (10, 35),
    }

    low, high = ideal_ranges.get(exercise, (60, 150))

    if angle < low:
        diff = low - angle
    elif angle > high:
        diff = angle - high
    else:
        diff = 0

    score = max(0.0, 1.0 - diff / 60)
    return score * 100

@app.post("/generate_report")
async def generate_report(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # ---------------- INPUT ----------------
    patient_name = data.get("patient_name", "Unknown Patient")
    patient_id = data.get("patient_id", "N/A")
    exercise = data.get("exercise", "Exercise")

    reps = int(data.get("reps", 0) or 0)
    sets = int(data.get("sets", 1) or 1)
    assigned_reps = int(data.get("assigned_reps", 0) or 0)
    duration = float(data.get("duration", 0.0) or 0.0)
    avg_time = float(data.get("avg_time", 0.0) or 0.0)

    form_score = float(data.get("form_score", 0.0) or 0.0)
    if form_score <= 1.0:
        form_score *= 100.0

    medical_history = data.get(
        "medical_history",
        "History of hip replacement surgery. Currently undergoing physiotherapy "
        "for post-surgical strength, mobility, and functional recovery."
    )

    primary_goal = data.get(
        "goal",
        "Improve strength, balance, and range of motion."
    )

    date_str = datetime.now().strftime("%d %B %Y")

    # ---------------- HELPERS ----------------
    def make_bar(value, target, length=18):
        if target <= 0:
            return "[" + "-" * length + "]"
        ratio = max(0.0, min(1.0, value / target))
        filled = int(ratio * length)
        return "[" + "#" * filled + "-" * (length - filled) + "]"

    # ---------------- INTERPRETATION ----------------
    if reps < 5:
        reps_interp = "Low volume session"
    elif reps < 15:
        reps_interp = "Moderate volume session"
    else:
        reps_interp = "High volume session"

    if duration < 20:
        duration_interp = "Short session"
    elif duration < 60:
        duration_interp = "Typical session duration"
    else:
        duration_interp = "Extended session"

    if avg_time < 3:
        speed_interp = "Slow and controlled"
    elif avg_time < 7:
        speed_interp = "Moderate tempo"
    else:
        speed_interp = "Fast-paced reps"

    if form_score >= 85:
        form_interp = "Excellent technique"
    elif form_score >= 70:
        form_interp = "Good technique"
    else:
        form_interp = "Technique needs improvement"

    # ---------------- PDF ----------------
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    # PAGE 1
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Physiotherapy Exercise Session Report - TherapEase", ln=1, align="C")

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Patient Details", ln=1)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Name: {patient_name}", ln=1)
    pdf.cell(0, 6, f"Patient ID: {patient_id}", ln=1)
    pdf.cell(0, 6, f"Date of Report: {date_str}", ln=1)

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Medical History", ln=1)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 5, medical_history)

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Current Prescription", ln=1)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 5, primary_goal)

    # PAGE 2
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Session Summary", ln=1)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(60, 7, "Metric", border=1)
    pdf.cell(60, 7, "Result", border=1)
    pdf.cell(70, 7, "Interpretation", border=1, ln=1)

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(60, 7, "Exercise", border=1)
    pdf.cell(60, 7, exercise, border=1)
    pdf.cell(70, 7, "Primary movement", border=1, ln=1)

    pdf.cell(60, 7, "Repetitions", border=1)
    pdf.cell(60, 7, f"{reps} / {assigned_reps}", border=1)
    pdf.cell(70, 7, reps_interp, border=1, ln=1)

    pdf.cell(60, 7, "Session Duration", border=1)
    pdf.cell(60, 7, f"{duration:.1f} sec", border=1)
    pdf.cell(70, 7, duration_interp, border=1, ln=1)

    pdf.cell(60, 7, "Average Speed", border=1)
    pdf.cell(60, 7, f"{avg_time:.2f}", border=1)
    pdf.cell(70, 7, speed_interp, border=1, ln=1)

    pdf.cell(60, 7, "Form Score", border=1)
    pdf.cell(60, 7, f"{form_score:.1f} / 100", border=1)
    pdf.cell(70, 7, form_interp, border=1, ln=1)

    # PAGE 3
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Therapist Remarks", ln=1)

    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        5,
        "Patient tolerated the session well. Continued focus on controlled, "
        "pain-free movement and proper alignment is advised."
    )

    # SAVE
    filename = f"report_{patient_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = os.path.join(REPORT_DIR, filename)
    pdf.output(filepath)

    return { "url": f"/reports/{filename}" }

@app.get("/reports/{filename}")
def get_report(filename: str):
    return FileResponse(
        os.path.join(REPORT_DIR, filename),
        media_type="application/pdf",
    )
