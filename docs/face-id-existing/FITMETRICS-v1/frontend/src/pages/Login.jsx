import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import "../App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState("password"); // "password" or "biometric"
    const [bioStep, setBioStep] = useState("initializing");
    const [faceImage, setFaceImage] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [verificationToken, setVerificationToken] = useState(null);
    const [livenessToken, setLivenessToken] = useState(null);
    const [livenessChallenge, setLivenessChallenge] = useState(null);
    const [challengeStatus, setChallengeStatus] = useState("Starting liveness check...");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const faceLandmarkerRef = useRef(null);
    const livenessFrameRef = useRef(null);
    const livenessStateRef = useRef({ index: 0, eyeClosed: false, lastTurn: null });
    const captureFrameRef = useRef(null);
    const verifyFaceRef = useRef(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (livenessFrameRef.current) {
            cancelAnimationFrame(livenessFrameRef.current);
            livenessFrameRef.current = null;
        }
    }, []);

    const finishLiveness = useCallback(() => {
        const state = livenessStateRef.current;
        if (!livenessChallenge || state.index < livenessChallenge.actions.length) return;
        const image = captureFrameRef.current?.();
        if (!image) return;
        setFaceImage(image);
        setBioStep("verifying");
        verifyFaceRef.current?.(image, verificationToken);
    }, [livenessChallenge, verificationToken]);

    const runLivenessCheck = useCallback(async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm",
            );
            faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                },
                runningMode: "VIDEO",
                numFaces: 1,
                outputFaceBlendshapes: true,
            });
            const inspect = () => {
                const video = videoRef.current;
                const detector = faceLandmarkerRef.current;
                if (bioStep !== "face") return;
                if (!video || !detector || video.readyState < 2 || !video.videoWidth) {
                    livenessFrameRef.current = requestAnimationFrame(inspect);
                    return;
                }
                const result = detector.detectForVideo(video, performance.now());
                const blendshapes = result.faceBlendshapes?.[0]?.categories || [];
                const score = (name) => blendshapes.find((item) => item.categoryName === name)?.score || 0;
                const landmarks = result.faceLandmarks?.[0];
                const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);
                const eyeAspectRatio = (top, upper, lower, bottom, outer, inner) => (
                    (distance(upper, lower) + distance(top, bottom))
                    / (2 * distance(outer, inner))
                );
                const leftEyeRatio = landmarks
                    ? eyeAspectRatio(landmarks[159], landmarks[160], landmarks[144], landmarks[145], landmarks[33], landmarks[133])
                    : 1;
                const rightEyeRatio = landmarks
                    ? eyeAspectRatio(landmarks[386], landmarks[385], landmarks[380], landmarks[374], landmarks[362], landmarks[263])
                    : 1;
                const blendshapeBlink = (score("eyeBlinkLeft") + score("eyeBlinkRight")) / 2 > 0.35;
                const landmarkBlink = (leftEyeRatio + rightEyeRatio) / 2 < 0.21;
                const eyesClosed = blendshapeBlink || landmarkBlink;
                const state = livenessStateRef.current;
                if (eyesClosed && !state.eyeClosed) state.eyeClosed = true;
                if (!eyesClosed && state.eyeClosed) {
                    state.eyeClosed = false;
                    if (livenessChallenge?.actions[state.index] === "blink") state.index += 1;
                }
                if (landmarks) {
                    const nose = landmarks[1];
                    const leftEye = landmarks[33];
                    const rightEye = landmarks[263];
                    const eyeCenter = (leftEye.x + rightEye.x) / 2;
                    const eyeWidth = Math.abs(rightEye.x - leftEye.x) || 0.1;
                    const turn = (nose.x - eyeCenter) / eyeWidth;
                    const turnDirection = turn < -0.18 ? "left" : turn > 0.18 ? "right" : null;
                    if (turnDirection
                        && turnDirection !== state.lastTurn
                        && livenessChallenge?.actions[state.index] === turnDirection) {
                        state.index += 1;
                        state.lastTurn = turnDirection;
                    }
                    if (!turnDirection) state.lastTurn = null;
                }
                const completed = livenessChallenge?.actions.slice(0, state.index).join(" → ") || "";
                const next = livenessChallenge?.actions[state.index] || "complete";
                setChallengeStatus(`Do: ${next}${completed ? ` · Done: ${completed}` : ""}`);
                if (livenessChallenge && state.index >= livenessChallenge.actions.length) {
                    finishLiveness();
                    return;
                }
                livenessFrameRef.current = requestAnimationFrame(inspect);
            };
            livenessFrameRef.current = requestAnimationFrame(inspect);
        } catch (error) {
            console.error("Liveness initialization failed:", error);
            const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
            setErrorMessage(`Unable to initialize the live-face check${detail}. Check your internet connection, reload, and allow camera access.`);
            setBioStep("error");
        }
    }, [bioStep, finishLiveness, livenessChallenge]);

    const startCamera = useCallback(async () => {
        try {
            const constraints = {
                video: {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    if (bioStep === "initializing") {
                        setBioStep("face");
                    }
                };
            }
        } catch (err) {
            console.error(err);
            setBioStep("error");
        }
    }, [bioStep]);

    useEffect(() => {
        let cameraStartTimer;
        if (loginMethod === "biometric" && (bioStep === "face" || bioStep === "initializing")) {
            cameraStartTimer = window.setTimeout(() => {
                void startCamera();
            }, 0);
        } else {
            stopCamera();
        }

        return () => {
            if (cameraStartTimer) {
                window.clearTimeout(cameraStartTimer);
            }
            stopCamera();
        };
    }, [loginMethod, bioStep, startCamera, stopCamera]);

    useEffect(() => {
        if (loginMethod === "biometric" && bioStep === "face") {
            livenessStateRef.current = { index: 0, eyeClosed: false, lastTurn: null };
            const timer = window.setTimeout(() => void runLivenessCheck(), 0);
            return () => {
                window.clearTimeout(timer);
                if (faceLandmarkerRef.current) {
                    faceLandmarkerRef.current.close();
                    faceLandmarkerRef.current = null;
                }
            };
        }
        return () => {
            if (faceLandmarkerRef.current) {
                faceLandmarkerRef.current.close();
                faceLandmarkerRef.current = null;
            }
        };
    }, [loginMethod, bioStep, runLivenessCheck]);

    const captureFrame = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/jpeg", 0.8);
        }
        return null;
    };

    const dataUrlToFile = async (dataUrl) => {
        const [header, encoded] = dataUrl.split(",");
        if (!header || !encoded) {
            throw new Error("The camera did not produce a valid face image.");
        }
        const mimeType = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
        const binary = atob(encoded);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        return new File([bytes], "face-capture.jpg", { type: mimeType });
    };

    const verifyFace = async (image, token = verificationToken) => {
        try {
            if (!token) {
                throw new Error("Your verification session expired. Please enter your credentials again.");
            }
            const formData = new FormData();
            formData.append("faceImage", await dataUrlToFile(image));
            formData.append("livenessToken", livenessToken || "");
            formData.append("livenessChallengeId", livenessChallenge?.id || "");
            formData.append("livenessActions", JSON.stringify(livenessChallenge?.actions || []));
            const response = await fetch(`${API_BASE_URL}/auth/verify-face`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
                signal: AbortSignal.timeout(45000),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.message || "Face verification failed");
            }
            localStorage.setItem("fitmetricsAccessToken", result.accessToken);
            localStorage.setItem("fitmetricsUser", JSON.stringify(result.user));
            setBioStep("success");
            setTimeout(() => navigate(`/${result.user.role}/dashboard`), 1200);
        } catch (error) {
            setErrorMessage(error instanceof TypeError
                ? "Unable to reach the authentication server. Make sure the backend is running and the frontend API proxy is configured."
                : error.name === "TimeoutError"
                    ? "Face verification timed out. Check your connection and try again."
                    : error.message);
            setBioStep("error");
        }
    };
    useEffect(() => {
        captureFrameRef.current = captureFrame;
        verifyFaceRef.current = verifyFace;
    });

    const handleCredentialsSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Unable to log in");
            }
            setVerificationToken(result.verificationToken);
            setLivenessToken(result.livenessToken);
            setLivenessChallenge(result.livenessChallenge);
            setLoginMethod("biometric");
            setBioStep("initializing");
        } catch (error) {
            setErrorMessage(error instanceof TypeError
                ? "Unable to reach the authentication server. Make sure the backend is running."
                : error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-wrapper">
            <style>
                {`
                .biometric-container {
                    position: relative;
                    width: 100%;
                    height: 320px;
                    background-color: #0b1320;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 2px solid var(--card-stroke-color);
                }
                .camera-video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scaleX(-1);
                }
                .overlay-guide {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                }
                .face-guide {
                    width: 180px;
                    height: 240px;
                    border: 2px dashed rgba(56, 189, 248, 0.8);
                    border-radius: 50%;
                    box-shadow: 0 0 0 9999px rgba(5, 20, 36, 0.7);
                }
                .scan-line {
                    position: absolute;
                    width: 100%;
                    height: 2px;
                    background-color: var(--primary-color);
                    box-shadow: 0 0 15px var(--primary-color);
                    animation: scan 2s linear infinite;
                }
                .scan-line-green {
                    background-color: var(--green-color);
                    box-shadow: 0 0 15px var(--green-color);
                }
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .verify-grid {
                    display: flex;
                    gap: 24px;
                    width: 100%;
                    height: 100%;
                    padding: 16px;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(16, 185, 129, 0.1));
                }
                .verify-img-box {
                    width: 120px;
                    height: 120px;
                    border-radius: 12px;
                    border: 2px solid var(--primary-color);
                    overflow: hidden;
                    position: relative;
                }
                .verify-img-box img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scaleX(-1);
                }
                .db-match-box {
                    width: 120px;
                    height: 120px;
                    border-radius: 12px;
                    border: 2px dashed var(--green-color);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background-color: rgba(16, 185, 129, 0.1);
                    color: var(--green-color);
                }
                .pulse-match {
                    animation: pulseMatch 1.5s infinite;
                }
                @keyframes pulseMatch {
                    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
                `}
            </style>

            <header
                className="py-3 px-4 d-flex justify-content-between align-items-center w-100 header-login"
                data-aos="fade-down"
            >
                <div className="d-flex align-items-center gap-3">
                    <img
                        src="/logo.png"
                        alt="FITMETRICS Logo"
                        style={{ height: "40px", borderRadius: "8px" }}
                    />
                    <h4
                        className="m-0 text-white d-none d-sm-block"
                        style={{ fontFamily: "var(--heading-font)" }}
                    >
                        FITMETRICS
                    </h4>
                </div>
                <a href="/" className="back-btn border-0 bg-transparent">
                    <i className="fa-solid fa-arrow-left"></i> Back to Home
                </a>
            </header>

            <main className="d-flex flex-column align-items-center justify-content-center flex-grow-1 w-100 px-3 py-5">
                <div
                    className="text-center mb-4"
                    data-aos="zoom-in"
                    data-aos-delay="100"
                >
                    <img
                        src="/logo.png"
                        alt="FITMETRICS Logo"
                        style={{
                            height: "64px",
                            borderRadius: "12px",
                            border: "2px solid var(--card-stroke-color)",
                            boxShadow: "0 0 10px rgba(56, 189, 248, 0.2)",
                        }}
                        className="mb-3"
                    />
                    <h2 className="app-title d-flex align-items-center justify-content-center gap-2">
                        FITMETRICS <span className="version-badge">v2.4</span>
                    </h2>
                    <p className="app-subtitle m-0 mt-1">
                        Analyn's Fitness Gym
                    </p>
                </div>

                <div
                    className="login-card"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    {loginMethod === "password" ? (
                        <>
                            <h3 className="card-title">Welcome Back</h3>
                            <p className="card-subtitle mb-4">
                                Log in to your account to continue.
                            </p>

                            <form onSubmit={handleCredentialsSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Email Address</label>
                                    <div className="input-group-custom">
                                        <i className="fa-regular fa-envelope icon-left"></i>
                                        <input
                                            type="email"
                                            className="form-control-custom"
                                            placeholder="Enter Email Address"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <label className="form-label">Password</label>
                                    <div className="input-group-custom">
                                        <i className="fa-solid fa-lock icon-left"></i>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-control-custom"
                                            placeholder="Enter Password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn-eye icon-right"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                        >
                                            <i
                                                className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                                            ></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="text-end mb-4">
                                    <Link
                                        to="/forgot-password"
                                        className="forgot-password-link"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-login w-100 mb-4"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Checking credentials..." : <>Log In <i className="fa-solid fa-arrow-right ms-2"></i></>}
                                </button>

                                {errorMessage && <div className="alert alert-danger py-2">{errorMessage}</div>}

                                <div className="info-alert d-flex align-items-start gap-3">
                                    <i className="fa-solid fa-shield-halved mt-1"></i>
                                    <p className="m-0">
                                        Accounts are created and registered exclusively
                                        by authorized gym staff upon member enrollment.
                                    </p>
                                </div>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h3 className="card-title">Facial Verification</h3>
                                <button 
                                    className="border-0 bg-transparent text-secondary" 
                                    onClick={() => setLoginMethod("password")}
                                >
                                    <i className="fa-solid fa-xmark fs-5"></i>
                                </button>
                            </div>
                            
                            <p className="card-subtitle mb-4">
                                {bioStep === "initializing" && "Accessing secure camera..."}
                                {bioStep === "face" && challengeStatus}
                                {bioStep === "verifying" && "Matching facial features against registered ID database..."}
                                {bioStep === "success" && "Verification successful. Redirecting..."}
                                {bioStep === "error" && "Camera access denied or unavailable."}
                            </p>

                            <div className="biometric-container mb-4">
                                <canvas ref={canvasRef} style={{ display: "none" }} />
                                
                                {(bioStep === "initializing" || bioStep === "face") && (
                                    <video 
                                        ref={videoRef} 
                                        className="camera-video"
                                        autoPlay 
                                        playsInline 
                                        muted 
                                    />
                                )}

                                {bioStep === "face" && (
                                    <div className="overlay-guide">
                                        <div className="face-guide">
                                            <div className="scan-line"></div>
                                        </div>
                                    </div>
                                )}

                                {bioStep === "verifying" && (
                                    <div className="verify-grid">
                                        <div className="verify-img-box pulse-match" style={{ borderColor: "var(--primary-color)" }}>
                                            <img src={faceImage} alt="Captured Face" />
                                            <div className="scan-line"></div>
                                        </div>
                                        <i className="fa-solid fa-arrow-right-arrow-left text-secondary fs-4 pulse-match"></i>
                                        <div className="db-match-box pulse-match">
                                            <i className="fa-solid fa-id-card fs-1 mb-2"></i>
                                            <span style={{ fontSize: "0.7rem", fontWeight: "700" }}>CHECKING DB</span>
                                        </div>
                                    </div>
                                )}

                                {bioStep === "success" && (
                                    <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100 bg-success bg-opacity-10">
                                        <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "var(--green-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "#051424", marginBottom: "16px", boxShadow: "0 0 20px var(--glow-green)" }}>
                                            <i className="fa-solid fa-check"></i>
                                        </div>
                                        <h4 className="text-white fw-bold mb-1" style={{ fontFamily: "var(--heading-font)" }}>Identity Verified</h4>
                                        <span className="text-success" style={{ fontSize: "0.85rem", fontWeight: "600" }}>Face matched with registered ID</span>
                                    </div>
                                )}

                                {bioStep === "error" && (
                                    <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100">
                                        <i className="fa-solid fa-video-slash text-secondary mb-3" style={{ fontSize: "2.5rem" }}></i>
                                        <span className="text-secondary" style={{ fontSize: "0.85rem" }}>No camera feed available.</span>
                                    </div>
                                )}
                            </div>

                            {bioStep === "verifying" && (
                                <div className="text-center py-2 mb-3">
                                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                    <span className="text-white" style={{ fontSize: "0.9rem", fontWeight: "600" }}>Running biometric analysis...</span>
                                </div>
                            )}

                            {bioStep === "error" && (
                                <button className="btn-login w-100 mb-3" onClick={() => { setLoginMethod("password"); setVerificationToken(null); setFaceImage(null); setErrorMessage(""); }}>
                                    Return to Password Login
                                </button>
                            )}

                            {errorMessage && <div className="alert alert-danger py-2">{errorMessage}</div>}

                            <div className="info-alert d-flex align-items-start gap-3 mt-4">
                                <i className="fa-solid fa-user-shield mt-1 text-green-color"></i>
                                <p className="m-0" style={{ fontSize: "0.7rem" }}>
                                    Your facial scan is cross-referenced with the ID you submitted during registration at the front desk. Your biometrics are processed instantly and never stored permanently on the device.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}