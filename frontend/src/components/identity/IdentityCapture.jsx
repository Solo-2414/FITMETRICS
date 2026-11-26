import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../ui/toast/useToast";
import styles from "./IdentityCapture.module.css";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const challengeActions = ["blink", "left", "right"];
const challengeLabels = { blink: "Blink once", left: "Turn your head left", right: "Turn your head right" };

function shuffledActions() {
    const actions = [...challengeActions];
    for (let index = actions.length - 1; index > 0; index -= 1) {
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        const swapIndex = values[0] % (index + 1);
        [actions[index], actions[swapIndex]] = [actions[swapIndex], actions[index]];
    }
    return actions;
}

export default function IdentityCapture({
    consentGiven,
    idImage,
    selfieImage,
    onIdImageChange,
    onSelfieImageChange,
    onLivenessChange,
}) {
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraStatus, setCameraStatus] = useState("Camera is off.");
    const [modelLoading, setModelLoading] = useState(false);
    const [challenge, setChallenge] = useState([]);
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [idPreview, setIdPreview] = useState("");
    const [selfiePreview, setSelfiePreview] = useState("");
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const landmarkerRef = useRef(null);
    const frameRef = useRef(null);
    const challengeRef = useRef([]);
    const progressRef = useRef({ index: 0, eyesClosed: false, turn: null, turnFrames: 0, lastFrameTime: 0, lastVideoTime: -1 });
    const idPreviewUrlRef = useRef("");
    const selfiePreviewUrlRef = useRef("");
    const toast = useToast();

    const stopCamera = useCallback(() => {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        landmarkerRef.current?.close();
        landmarkerRef.current = null;
        setCameraOpen(false);
        setModelLoading(false);
    }, []);

    const startCamera = async () => {
        if (!consentGiven) {
            toast.info("Record the member’s consent before starting capture.");
            return;
        }
        try {
            if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access requires HTTPS or localhost.");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });
            streamRef.current = stream;
            challengeRef.current = shuffledActions();
            progressRef.current = { index: 0, eyesClosed: false, turn: null, turnFrames: 0, lastFrameTime: 0, lastVideoTime: -1 };
            setChallenge(challengeRef.current);
            setChallengeIndex(0);
            setCameraStatus("Preparing the on-device liveness check…");
            setCameraOpen(true);
            setModelLoading(true);
        } catch (error) {
            const message = error?.name === "NotAllowedError"
                ? "Camera permission was denied. Allow camera access, or upload a selfie for manual review."
                : error?.name === "NotFoundError"
                    ? "No camera was found. Upload a selfie for manual review."
                    : error.message || "Camera access is unavailable. Upload a selfie for manual review.";
            toast.error(message);
            stopCamera();
        }
    };

    const captureSelfie = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !video.videoWidth) {
            toast.error("The camera frame is not ready. Try again or upload a selfie.");
            stopCamera();
            onLivenessChange(false);
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                if (selfiePreviewUrlRef.current) URL.revokeObjectURL(selfiePreviewUrlRef.current);
                selfiePreviewUrlRef.current = URL.createObjectURL(file);
                setSelfiePreview(selfiePreviewUrlRef.current);
                onSelfieImageChange(file);
                onLivenessChange(true);
                setCameraStatus("Live check complete. Selfie captured.");
                stopCamera();
            } else {
                toast.error("The selfie could not be captured. Try again or upload a photo.");
                onLivenessChange(false);
                stopCamera();
            }
        }, "image/jpeg", 0.9);
    }, [onLivenessChange, onSelfieImageChange, stopCamera, toast]);

    useEffect(() => {
        if (!cameraOpen || !videoRef.current || !streamRef.current) return undefined;
        let active = true;
        const video = videoRef.current;
        video.srcObject = streamRef.current;
        const initialize = async () => {
            try {
                await video.play();
                const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
                const vision = await FilesetResolver.forVisionTasks(WASM_URL);
                const landmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: MODEL_URL },
                    runningMode: "VIDEO",
                    numFaces: 1,
                    outputFaceBlendshapes: true,
                });
                if (!active) {
                    landmarker.close();
                    return;
                }
                landmarkerRef.current = landmarker;
                setModelLoading(false);
                setCameraStatus("Follow each prompt. Video is analyzed on this device.");
                const inspect = () => {
                    const now = performance.now();
                    const state = progressRef.current;
                    const detector = landmarkerRef.current;
                    if (!active || !detector || video.readyState < 2 || !video.videoWidth) {
                        if (active) frameRef.current = requestAnimationFrame(inspect);
                        return;
                    }
                    if (now - state.lastFrameTime < 100 || video.currentTime === state.lastVideoTime) {
                        frameRef.current = requestAnimationFrame(inspect);
                        return;
                    }
                    state.lastFrameTime = now;
                    state.lastVideoTime = video.currentTime;
                    const result = detector.detectForVideo(video, now);
                    const landmarks = result.faceLandmarks?.[0];
                    const blendshapes = result.faceBlendshapes?.[0]?.categories || [];
                    if (landmarks) {
                        const score = (name) => blendshapes.find((item) => item.categoryName === name)?.score || 0;
                        const blink = (score("eyeBlinkLeft") + score("eyeBlinkRight")) / 2 > 0.35;
                        const eyeDistance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);
                        const leftEyeRatio = (eyeDistance(landmarks[160], landmarks[144]) + eyeDistance(landmarks[159], landmarks[145]))
                            / (2 * eyeDistance(landmarks[33], landmarks[133]));
                        const rightEyeRatio = (eyeDistance(landmarks[385], landmarks[380]) + eyeDistance(landmarks[386], landmarks[374]))
                            / (2 * eyeDistance(landmarks[362], landmarks[263]));
                        const eyesClosed = blink || (leftEyeRatio + rightEyeRatio) / 2 < 0.21;
                        const action = challengeRef.current[state.index];
                        if (action === "blink") {
                            if (eyesClosed) state.eyesClosed = true;
                            if (!eyesClosed && state.eyesClosed) {
                                state.eyesClosed = false;
                                state.index += 1;
                            }
                        } else {
                            const eyeCenter = (landmarks[33].x + landmarks[263].x) / 2;
                            const eyeWidth = Math.abs(landmarks[263].x - landmarks[33].x) || 0.1;
                            const offset = (landmarks[1].x - eyeCenter) / eyeWidth;
                            const direction = offset < -0.18 ? "left" : offset > 0.18 ? "right" : null;
                            if (direction === action) {
                                state.turnFrames = state.turn === direction ? state.turnFrames + 1 : 1;
                                state.turn = direction;
                                if (state.turnFrames >= 3) {
                                    state.index += 1;
                                    state.turn = null;
                                    state.turnFrames = 0;
                                }
                            } else {
                                state.turn = null;
                                state.turnFrames = 0;
                            }
                        }
                        setChallengeIndex(state.index);
                    }
                    if (state.index >= challengeRef.current.length) {
                        captureSelfie();
                        return;
                    }
                    frameRef.current = requestAnimationFrame(inspect);
                };
                frameRef.current = requestAnimationFrame(inspect);
            } catch {
                if (!active) return;
                toast.error("The on-device liveness check could not start. You can upload a selfie for manual review.");
                onLivenessChange(false);
                stopCamera();
            }
        };
        void initialize();
        return () => {
            active = false;
            video.srcObject = null;
        };
    }, [cameraOpen, captureSelfie, onLivenessChange, stopCamera, toast]);

    useEffect(() => {
        if (!idImage && idPreviewUrlRef.current) {
            URL.revokeObjectURL(idPreviewUrlRef.current);
            idPreviewUrlRef.current = "";
        }
        if (!selfieImage && selfiePreviewUrlRef.current) {
            URL.revokeObjectURL(selfiePreviewUrlRef.current);
            selfiePreviewUrlRef.current = "";
        }
    }, [idImage, selfieImage]);

    useEffect(() => () => {
        stopCamera();
        if (idPreviewUrlRef.current) URL.revokeObjectURL(idPreviewUrlRef.current);
        if (selfiePreviewUrlRef.current) URL.revokeObjectURL(selfiePreviewUrlRef.current);
    }, [stopCamera]);

    const chooseFile = (event, previewRef, setPreview, setFile, afterSelect) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 8 * 1024 * 1024) {
            toast.error("Choose a JPG or PNG image under 8 MB.");
            return;
        }
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = URL.createObjectURL(file);
        setPreview(previewRef.current);
        setFile(file);
        afterSelect?.();
    };

    return (
        <section className={styles.capture}>
            <div className={styles.captureHeader}>
                <div>
                    <h3>Identity images</h3>
                    <p>Use a clear, glare-free image with the entire ID visible. Check legibility and crop before submitting.</p>
                </div>
                <span className={styles.privateLabel}><i className="fa-solid fa-lock" aria-hidden="true"></i> Private upload</span>
            </div>
            <div className={styles.imageGrid}>
                <div className={styles.imageSlot}>
                    <label htmlFor="identity-id-image">Government ID front</label>
                    {idPreview ? <img src={idPreview} alt="Selected ID front preview" /> : <div className={styles.previewEmpty}>No ID image selected</div>}
                    <input id="identity-id-image" type="file" accept="image/jpeg,image/png" disabled={!consentGiven} onChange={(event) => chooseFile(event, idPreviewUrlRef, setIdPreview, onIdImageChange)} />
                </div>
                <div className={styles.imageSlot}>
                    <label htmlFor="identity-selfie-image">Member selfie</label>
                    {selfiePreview ? <img src={selfiePreview} alt="Selected selfie preview" /> : <div className={styles.previewEmpty}>No selfie captured</div>}
                    <input id="identity-selfie-image" type="file" accept="image/jpeg,image/png" disabled={!consentGiven || cameraOpen} onChange={(event) => chooseFile(
                        event,
                        selfiePreviewUrlRef,
                        setSelfiePreview,
                        onSelfieImageChange,
                        () => onLivenessChange(false),
                    )} />
                    <small>Uploaded selfies skip the camera liveness check and remain for manual review.</small>
                </div>
            </div>
            <div className={styles.cameraControls}>
                {!cameraOpen
                    ? <button type="button" className={styles.captureButton} disabled={!consentGiven || modelLoading} onClick={startCamera}><i className="fa-solid fa-camera" aria-hidden="true"></i> Start live capture</button>
                    : <button type="button" className={styles.cancelButton} onClick={stopCamera}>Cancel camera</button>}
                <span aria-live="polite">{cameraStatus}</span>
            </div>
            {cameraOpen && <div className={styles.cameraPanel}>
                <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview for identity verification" />
                <canvas ref={canvasRef} hidden />
                {modelLoading
                    ? <p role="status">Loading the on-device liveness check…</p>
                    : <p role="status" aria-live="polite">{challenge[challengeIndex] ? `Step ${challengeIndex + 1} of ${challenge.length}: ${challengeLabels[challenge[challengeIndex]]}` : "Preparing the check…"}</p>}
            </div>}
        </section>
    );
}
