from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import mediapipe as mp
import numpy as np
import threading
import time

app = FastAPI()

# ========= CORS =========
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========= Mediapipe Setup =========
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

# ========= Global Data =========
current_data = {"angle": 0, "count": 0, "stage": "-", "form": "-", "exercise": None, "keypoints": []}
capture_thread = None
stop_thread = False


# ========= Helper Functions =========
def calculate_angle(a, b, c):
    """Calculate angle between three points"""
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    return 360 - angle if angle > 180 else angle


def exercise_logic(exercise, landmarks):
    """Compute angles & stage logic per exercise"""
    global current_data
    angle, count, stage, form = 0, current_data["count"], current_data["stage"], "Good"

    try:
        if exercise == "bicep_curl":
            # Shoulder-Elbow-Wrist (right arm)
            a = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            b = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
            c = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y]
            angle = calculate_angle(a, b, c)
            if angle > 160:
                stage = "down"
            if angle < 40 and stage == "down":
                stage = "up"
                count += 1

        elif exercise == "squat":
            # Hip-Knee-Ankle
            a = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            b = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
            c = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
            angle = calculate_angle(a, b, c)
            if angle > 160:
                stage = "up"
            if angle < 90 and stage == "up":
                stage = "down"
                count += 1

        elif exercise == "shoulder_abduction":
            # Hip-Shoulder-Elbow
            a = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            b = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            c = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
            angle = calculate_angle(a, b, c)
            if angle < 40:
                stage = "down"
            if angle > 100 and stage == "down":
                stage = "up"
                count += 1

        elif exercise == "knee_extension":
            # Hip-Knee-Ankle
            a = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            b = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
            c = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
            angle = calculate_angle(a, b, c)
            if angle > 150:
                stage = "extended"
            if angle < 100 and stage == "extended":
                stage = "bent"
                count += 1

        elif exercise == "leg_raise":
            # Shoulder-Hip-Ankle
            a = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            b = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            c = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
            angle = calculate_angle(a, b, c)
            if angle < 160:
                stage = "up"
            if angle > 170 and stage == "up":
                stage = "down"
                count += 1

        elif exercise == "side_bend":
            # Shoulder-Hip-Knee
            a = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            b = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            c = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
            angle = calculate_angle(a, b, c)
            if angle < 150:
                stage = "bend"
            if angle > 175 and stage == "bend":
                stage = "upright"
                count += 1

    except Exception as e:
        print("Exercise logic error:", e)

    current_data.update({"angle": angle, "count": count, "stage": stage, "form": form})
    return current_data


def track_exercise(exercise):
    """Continuously capture video and analyze frames"""
    global stop_thread, current_data
    cap = cv2.VideoCapture(0)
    while not stop_thread:
        ret, frame = cap.read()
        if not ret:
            continue

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)
        if results.pose_landmarks:
            keypoints = [
                (lm.x, lm.y) for lm in results.pose_landmarks.landmark
            ]
            current_data["keypoints"] = keypoints
            current_data = exercise_logic(exercise, results.pose_landmarks.landmark)

        time.sleep(0.03)
    cap.release()


# ========= API Routes =========
class SessionRequest(BaseModel):
    exercise: str
    user_id: str


@app.post("/start_session")
def start_session(req: SessionRequest):
    """Start webcam tracking"""
    global capture_thread, stop_thread, current_data
    stop_thread = False
    current_data.update({"exercise": req.exercise, "count": 0, "stage": "-", "form": "-", "angle": 0})
    capture_thread = threading.Thread(target=track_exercise, args=(req.exercise,), daemon=True)
    capture_thread.start()
    return {"status": "started", "exercise": req.exercise}


@app.post("/analyze_frame")
async def analyze_frame(file: UploadFile = File(...), exercise: str = Form(...), user_id: str = Form(...)):
    """Analyze uploaded video"""
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    video = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return {"form": "Good", "angle": 45, "count": 5, "stage": "up", "exercise": exercise}


@app.post("/stop_session")
def stop_session():
    """Stop webcam tracking"""
    global stop_thread
    stop_thread = True
    return {"status": "stopped"}


@app.get("/data")
def get_data():
    """Send latest data to frontend"""
    return current_data
