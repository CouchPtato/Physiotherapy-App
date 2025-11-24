from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fpdf import FPDF
from datetime import datetime
import os
import time

import base64
import cv2
import numpy as np
import mediapipe as mp
from pydantic import BaseModel

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

mp_pose = mp.solutions.pose

# Global pose detector for LIVE frames (fast config)
pose_detector = mp_pose.Pose(
    static_image_mode=False,           # better for live
    model_complexity=0,                # fastest model
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

EXERCISES = {
    "bicep_curl": [
        "LEFT_ELBOW",
        "RIGHT_ELBOW",
        "LEFT_SHOULDER",
        "RIGHT_SHOULDER",
        "LEFT_WRIST",
        "RIGHT_WRIST",
    ],
    "squat": [
        "LEFT_HIP",
        "RIGHT_HIP",
        "LEFT_KNEE",
        "RIGHT_KNEE",
        "LEFT_ANKLE",
        "RIGHT_ANKLE",
    ],
    "shoulder_abduction": [
        "LEFT_SHOULDER",
        "RIGHT_SHOULDER",
        "LEFT_ELBOW",
        "RIGHT_ELBOW",
    ],
    "knee_extension": ["LEFT_HIP", "RIGHT_HIP", "LEFT_KNEE", "RIGHT_KNEE"],
    "leg_raise": [
        "LEFT_HIP",
        "RIGHT_HIP",
        "LEFT_KNEE",
        "RIGHT_KNEE",
        "LEFT_ANKLE",
        "RIGHT_ANKLE",
    ],
    "side_bend": ["LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_HIP", "RIGHT_HIP"],
}

# Optional: limit keypoints returned per exercise (for live)
NEEDED_KEYS = {
    "bicep_curl": [
        "left_elbow",
        "right_elbow",
        "left_shoulder",
        "right_shoulder",
        "left_wrist",
        "right_wrist",
    ],
    "squat": [
        "left_hip",
        "right_hip",
        "left_knee",
        "right_knee",
        "left_ankle",
        "right_ankle",
    ],
    "shoulder_abduction": [
        "left_shoulder",
        "right_shoulder",
        "left_elbow",
        "right_elbow",
    ],
    "knee_extension": [
        "left_hip",
        "right_hip",
        "left_knee",
        "right_knee",
    ],
    "leg_raise": [
        "left_hip",
        "right_hip",
        "left_knee",
        "right_knee",
        "left_ankle",
        "right_ankle",
    ],
    "side_bend": [
        "left_shoulder",
        "right_shoulder",
        "left_hip",
        "right_hip",
    ],
}


def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(
        a[1] - b[1], a[0] - b[0]
    )
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180:
        angle = 360 - angle
    return float(angle)


def assess_form(exercise: str, angle: float):
    ideal_ranges = {
        "bicep_curl": (30, 160),
        "squat": (70, 160),
        "shoulder_abduction": (70, 160),
        "knee_extension": (0, 160),
        "leg_raise": (40, 150),
        "side_bend": (10, 35),
    }
    ideal_min, ideal_max = ideal_ranges.get(exercise, (60, 150))

    if angle < ideal_min:
        diff = ideal_min - angle
    elif angle > ideal_max:
        diff = angle - ideal_max
    else:
        diff = 0
    score = max(0.0, 1.0 - (diff / 60))

    feedback = "Keep form consistent."
    if exercise == "bicep_curl":
        if angle < 60:
            feedback = "Great contraction!"
        elif angle > 160:
            feedback = "Full extension!"
        else:
            feedback = "Complete your motion fully."
    elif exercise == "squat":
        if angle < 95:
            feedback = "Nice deep squat!"
        elif angle > 160:
            feedback = "Standing tall."
        else:
            feedback = "Try going a bit lower."
    elif exercise == "shoulder_abduction":
        feedback = (
            "Good arm raise!" if angle > 120 else "Lift higher for full range."
        )
    elif exercise == "knee_extension":
        feedback = (
            "Full knee extension achieved!"
            if angle > 160
            else "Straighten knee more."
        )
    elif exercise == "leg_raise":
        feedback = (
            "Leg raised high enough!" if angle > 140 else "Lift leg higher."
        )
    elif exercise == "side_bend":
        feedback = (
            "Nice side bend!" if 15 < angle < 35 else "Bend slightly more to side."
        )

    return feedback, score


def draw_skeleton(image, landmarks, involved_names, color=(0, 255, 0)):
    h, w = image.shape[:2]
    involved_indices = []
    for name in involved_names:
        if name in mp_pose.PoseLandmark.__members__:
            involved_indices.append(mp_pose.PoseLandmark[name].value)

    for conn in mp_pose.POSE_CONNECTIONS:
        a_idx = conn[0].value if hasattr(conn[0], "value") else conn[0]
        b_idx = conn[1].value if hasattr(conn[1], "value") else conn[1]
        if a_idx in involved_indices and b_idx in involved_indices:
            a_point = landmarks[a_idx]
            b_point = landmarks[b_idx]
            if a_point.visibility > 0.5 and b_point.visibility > 0.5:
                ax, ay = int(a_point.x * w), int(a_point.y * h)
                bx, by = int(b_point.x * w), int(b_point.y * h)
                cv2.line(image, (ax, ay), (bx, by), color, 3)

    for idx in involved_indices:
        p = landmarks[idx]
        if p.visibility > 0.5:
            cx, cy = int(p.x * w), int(p.y * h)
            cv2.circle(image, (cx, cy), 6, (255, 255, 0), -1)

    return image


@app.post("/generate_report")
async def generate_report(request: Request):
    data = await request.json()

    patient_name = data.get("patient_name", "Unknown Patient")
    patient_id = data.get("patient_id", "N/A")
    exercise = data.get("exercise", "Exercise")
    exercise_key = data.get("exercise_key", "squat")

    reps = int(data.get("reps", 0) or 0)
    sets = int(data.get("sets", 1) or 1)
    duration = float(data.get("duration", 0.0) or 0.0)
    avg_time = float(data.get("avg_time", 0.0) or 0.0)
    assigned_reps = int(data.get("assigned_reps", 0))

    form_score = float(data.get("form_score", 0.0) or 0.0)
    if form_score <= 1.0:
        form_score = form_score * 100.0

    medical_history = data.get(
        "medical_history",
        "History of hip replacement surgery. Currently undergoing physiotherapy "
        "for post-surgical strength, mobility, and functional recovery of the "
        "lower limb and hip region.",
    )
    primary_goal = data.get(
        "goal",
        "Improve hip and knee strength, balance, and range of motion after hip "
        "replacement surgery.",
    )

    date_str = datetime.now().strftime("%d %B %Y")

    def make_bar(value: float, target: float, length: int = 18) -> str:
        if target <= 0:
            ratio = 0.0
        else:
            ratio = max(0.0, min(1.0, value / target))
        filled = int(ratio * length)
        return "[" + "#" * filled + "-" * (length - filled) + "]"

    reps_target = assigned_reps
    duration_target = 300.0
    speed_target = 10.0
    form_target = 100.0

    reps_bar = make_bar(reps, assigned_reps or reps_target)
    dur_bar = make_bar(duration, duration_target)
    speed_bar = make_bar(avg_time, duration)
    form_bar = make_bar(form_score, form_target)

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

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(
        0,
        10,
        "Physiotherapy Exercise Session Report - TherapEase",
        ln=1,
        align="C",
    )

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
    pdf.multi_cell(0, 5, "Primary Goal:")
    pdf.multi_cell(0, 5, primary_goal)

    pdf.ln(2)
    pdf.multi_cell(0, 5, "Prescribed Exercises:")
    pdf.multi_cell(
        0,
        5,
        f"1. {exercise}\n"
        f"   a. Sets: {sets}\n"
        f"   b. Reps: target {reps} per session (or as prescribed)\n"
        f"   c. Frequency: As advised by the physiotherapist\n"
        f"   d. Notes: Maintain controlled motion and alignment throughout.",
    )

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

    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"Exercise Performance Overview ({exercise})", ln=1)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Repetitions ({reps})", ln=1)
    pdf.set_font("Courier", "", 10)
    pdf.cell(0, 5, f"{reps_bar}  {reps} / {assigned_reps} reps", ln=1)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Session Duration ({duration:.1f} sec)", ln=1)
    pdf.set_font("Courier", "", 10)
    pdf.cell(0, 5, f"{dur_bar}  {duration:.1f} / {duration_target:.0f} sec (Recommended)", ln=1)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Time per rep ({avg_time:.2f})", ln=1)
    pdf.set_font("Courier", "", 10)
    pdf.cell(0, 5, f"{speed_bar} {avg_time:.2f} / {duration:.1f} sec", ln=1)

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Form Score ({form_score:.1f} / 100)", ln=1)
    pdf.set_font("Courier", "", 10)
    pdf.cell(0, 5, f"{form_bar}  technique quality", ln=1)

    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Therapist Remarks", ln=1)

    pdf.set_font("Helvetica", "", 11)
    remarks = (
        "Patient tolerated the session well based on the metrics above. "
        "Encourage continued focus on controlled, pain-free movement and "
        "proper alignment. Adjust volume or intensity as needed based on "
        "ongoing recovery and physiotherapist guidance."
    )
    pdf.multi_cell(0, 5, remarks)

    filename = f"report_{patient_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = os.path.join(REPORT_DIR, filename)
    pdf.output(filepath)

    return {"url": f"/reports/{filename}"}


@app.get("/reports/{filename}")
def get_report(filename: str):
    filepath = os.path.join(REPORT_DIR, filename)
    return FileResponse(filepath, media_type="application/pdf")


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
    raw_name = datetime.now().strftime("%Y%m%d_%H%M%S")
    input_name = f"{raw_name}{ext}"
    processed_name = f"proc_{raw_name}.mp4"

    video_path = os.path.join(VIDEO_DIR, input_name)
    processed_path = os.path.join(VIDEO_DIR, processed_name)

    contents = await file.read()
    with open(video_path, "wb") as f:
        f.write(contents)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return JSONResponse({"detail": "Could not open video"}, status_code=400)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(processed_path, fourcc, fps, (width, height))

    start_time = time.time()
    reps = 0
    rep_times = []
    last_rep_ts = None
    form_scores = []
    feedbacks = []
    stage = None

    involved_names = EXERCISES.get(exercise_key, [])

    # For offline video analysis we can afford a bit higher complexity
    with mp_pose.Pose(
        min_detection_confidence=0.6,
        min_tracking_confidence=0.6,
        model_complexity=1,
    ) as pose:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.resize(frame, (width, height))
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb)

            if not results.pose_landmarks:
                out.write(frame)
                continue

            lm = results.pose_landmarks.landmark

            angles = []
            if exercise_key in ["bicep_curl", "shoulder_abduction"]:
                for side in ["LEFT", "RIGHT"]:
                    shoulder = [
                        lm[mp_pose.PoseLandmark[f"{side}_SHOULDER"].value].x,
                        lm[mp_pose.PoseLandmark[f"{side}_SHOULDER"].value].y,
                    ]
                    elbow = [
                        lm[mp_pose.PoseLandmark[f"{side}_ELBOW"].value].x,
                        lm[mp_pose.PoseLandmark[f"{side}_ELBOW"].value].y,
                    ]
                    wrist = [
                        lm[mp_pose.PoseLandmark[f"{side}_WRIST"].value].x,
                        lm[mp_pose.PoseLandmark[f"{side}_WRIST"].value].y,
                    ]
                    angles.append(calculate_angle(shoulder, elbow, wrist))
            elif exercise_key in ["squat", "knee_extension", "leg_raise"]:
                for side in ["LEFT", "RIGHT"]:
                    hip = [
                        lm[mp_pose.PoseLandmark[f"{side}_HIP"].value].x,
                        lm[mp_pose.PoseLandmark[f"{side}_HIP"].value].y,
                    ]
                    knee = [
                        lm[mp_pose.PoseLandmark[f"{side}_KNEE"].value].x,
                        lm[mp_pose.PoseLandmark[f"{side}_KNEE"].value].y,
                    ]
                    ankle = [
                        lm[mp_pose.PoseLandmark[f"{side}_ANKLE"].value].x,
                        lm[mp_pose.PoseLandmark[f"{side}_ANKLE"].value].y,
                    ]
                    angles.append(calculate_angle(hip, knee, ankle))
            elif exercise_key == "side_bend":
                left_shoulder = [
                    lm[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                    lm[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y,
                ]
                right_shoulder = [
                    lm[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                    lm[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y,
                ]
                left_hip = [
                    lm[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                    lm[mp_pose.PoseLandmark.LEFT_HIP.value].y,
                ]
                right_hip = [
                    lm[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                    lm[mp_pose.PoseLandmark.RIGHT_HIP.value].y,
                ]
                angles.append(calculate_angle(left_shoulder, left_hip, right_hip))
                angles.append(calculate_angle(right_shoulder, right_hip, left_hip))

            if angles:
                angle = float(np.mean(angles))
                feedback, score = assess_form(exercise_key, angle)
                form_scores.append(score)
                feedbacks.append(feedback)
            else:
                angle = 0.0

            down_thresh, up_thresh = 100, 160
            if exercise_key in ["bicep_curl", "shoulder_abduction"]:
                if angle > 150:
                    stage = "down"
                if angle < 50 and stage == "down":
                    stage = "up"
                    reps += 1
                    now = time.time()
                    if last_rep_ts:
                        rep_times.append(now - last_rep_ts)
                    last_rep_ts = now
            elif exercise_key in ["squat", "knee_extension", "leg_raise"]:
                if angle > up_thresh:
                    stage = "up"
                if angle < down_thresh and stage == "up":
                    stage = "down"
                    reps += 1
                    now = time.time()
                    if last_rep_ts:
                        rep_times.append(now - last_rep_ts)
                    last_rep_ts = now
            elif exercise_key == "side_bend":
                if angle > 40:
                    stage = "up"
                if angle < 25 and stage == "up":
                    stage = "down"
                    reps += 1
                    now = time.time()
                    if last_rep_ts:
                        rep_times.append(now - last_rep_ts)
                    last_rep_ts = now

            frame = draw_skeleton(frame, lm, involved_names)
            out.write(frame)

    cap.release()
    out.release()

    duration = time.time() - start_time
    avg_time = float(np.mean(rep_times)) if rep_times else 0.0
    avg_score = float(np.mean(form_scores)) if form_scores else 0.0
    feedback_summary = ", ".join(sorted(set(feedbacks))) if feedbacks else ""

    return JSONResponse(
        {
            "video_url": f"/videos/{input_name}",
            "processed_video_url": f"/videos/{processed_name}",
            "exercise_key": exercise_key,
            "patient_name": patient_name,
            "patient_id": patient_id,
            "reps": reps,
            "assigned_reps": int(assigned_reps),
            "sets": int(sets),
            "duration": duration,
            "avg_time": avg_time,
            "form_score": avg_score,
            "feedback_summary": feedback_summary,
        }
    )


class FrameRequest(BaseModel):
    image_base64: str
    exercise_key: str | None = None


@app.post("/analyze_frame")
async def analyze_frame(req: FrameRequest):
    try:
        print("analyze_frame called, exercise_key =", req.exercise_key)

        img_data = base64.b64decode(req.image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            print("Failed to decode frame in analyze_frame")
            raise HTTPException(status_code=400, detail="Invalid image data")

        # downscale more aggressively to speed up pose
        h, w = frame.shape[:2]
        max_side = 320   # was 480
        scale = max_side / max(h, w)
        if scale < 1.0:
            frame = cv2.resize(
                frame,
                (int(w * scale), int(h * scale)),
                interpolation=cv2.INTER_AREA,
            )

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose_detector.process(rgb)

        if not results.pose_landmarks:
            print("No pose detected in analyze_frame")
            return {"pose": {"keypoints": []}}

        wanted = None
        if req.exercise_key:
            wanted = NEEDED_KEYS.get(req.exercise_key, None)

        keypoints = []
        for idx, lm in enumerate(results.pose_landmarks.landmark):
            name = mp_pose.PoseLandmark(idx).name.lower()  # e.g. 'left_knee'

            # If we have a list of needed keys, skip others
            if wanted and name not in wanted:
                continue

            keypoints.append(
                {
                    "name": name,
                    "x": float(lm.x),          # normalized 0–1
                    "y": float(lm.y),
                    "score": float(lm.visibility),
                }
            )

        print("Returning", len(keypoints), "keypoints from analyze_frame")
        return {"pose": {"keypoints": keypoints}}
    except Exception as e:
        print("analyze_frame error:", e)
        raise HTTPException(status_code=500, detail="Failed to process frame")
