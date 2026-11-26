import { useEffect, useRef, useState } from "react";
import ClerkLayout from "../../components/clerk/ClerkLayout";
import styles from "./ClerkMemberRegistration.module.css";

export default function ClerkMemberRegistration() {
    const [selectedPlan, setSelectedPlan] = useState("monthly");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [addCoach, setAddCoach] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        email: "",
        password: "",
        gender: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        cashTendered: "",
        paymentReference: "",
    });
    const [idImage, setIdImage] = useState(null);
    const [faceImage, setFaceImage] = useState(null);
    const [idPreview, setIdPreview] = useState("");
    const [facePreview, setFacePreview] = useState("");
    const [cameraOpen, setCameraOpen] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const idInputRef = useRef(null);
    const faceInputRef = useRef(null);

    const plans = {
        session: {
            name: "Session / Walk-In",
            duration: "Single Day Pass",
            price: 90,
        },
        weekly: { name: "Weekly Pass", duration: "7 Days Valid", price: 270 },
        biweekly: {
            name: "Two Weeks Pass",
            duration: "14 Days Valid",
            price: 540,
        },
        monthly: {
            name: "Monthly Regular",
            duration: "30 Days Valid",
            price: 990,
        },
    };

    const currentPrice = plans[selectedPlan].price;
    const totalDue = currentPrice + (addCoach ? 500 : 0);

    const updateField = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const setImage = (file, setter, previewSetter) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setStatus({ type: "danger", message: "Please select a JPG or PNG image." });
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            setStatus({ type: "danger", message: "Images must be smaller than 8 MB." });
            return;
        }
        setter(file);
        previewSetter(URL.createObjectURL(file));
        setStatus({ type: "", message: "" });
    };

    const startCamera = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Camera access requires HTTPS or localhost.");
            }
            stopCamera();
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
            streamRef.current = stream;
            setCameraOpen(true);
            setStatus({ type: "", message: "" });
        } catch (error) {
            const message = error.name === "NotAllowedError"
                ? "Camera permission was denied. Allow camera access in the browser address bar and try again."
                : error.name === "NotFoundError"
                    ? "No camera was found on this device."
                    : error.message || "Camera access was denied or is unavailable.";
            setStatus({ type: "danger", message });
        }
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraOpen(false);
    };

    const captureFace = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !video.videoWidth) {
            setStatus({ type: "danger", message: "Wait for the camera preview before capturing." });
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) {
                setImage(new File([blob], "member-face.jpg", { type: "image/jpeg" }), setFaceImage, setFacePreview);
                stopCamera();
            }
        }, "image/jpeg", 0.9);
    };

    useEffect(() => {
        if (!cameraOpen || !videoRef.current || !streamRef.current) return undefined;
        const video = videoRef.current;
        video.srcObject = streamRef.current;
        const playVideo = () => {
            void video.play().catch(() => {
                setStatus({ type: "danger", message: "The camera preview could not start. Check browser camera permissions." });
            });
        };
        video.addEventListener("loadedmetadata", playVideo, { once: true });
        if (video.readyState >= 1) playVideo();
        return () => {
            video.removeEventListener("loadedmetadata", playVideo);
            video.srcObject = null;
        };
    }, [cameraOpen]);

    useEffect(() => () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (idPreview) URL.revokeObjectURL(idPreview);
        if (facePreview) URL.revokeObjectURL(facePreview);
    }, [idPreview, facePreview]);

    const submitRegistration = async (event) => {
        event.preventDefault();
        setStatus({ type: "", message: "" });
        if (!idImage || !faceImage) {
            setStatus({ type: "danger", message: "Upload the member ID and capture or upload the member face before submitting." });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = new FormData();
            Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
            payload.append("role", "member");
            payload.append("membershipPlan", selectedPlan);
            payload.append("paymentMethod", paymentMethod);
            payload.append("idImage", idImage);
            payload.append("faceImage", faceImage);
            const token = localStorage.getItem("fitmetricsAccessToken");
            const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/auth/register`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: payload,
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Registration failed");
            setStatus({ type: "success", message: `Member account created for ${result.email}.` });
        } catch (error) {
            setStatus({
                type: "danger",
                message: error.name === "TypeError"
                    ? "Unable to reach the authentication server. Confirm the backend is running on port 5000 and reload the page."
                    : error.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ClerkLayout>
            <div
                className="d-flex align-items-center gap-2 mb-3 text-secondary"
                style={{ fontSize: "0.8rem" }}
                data-aos="fade-down"
            >
                <span>Desk Console</span>
                <i
                    className="fa-solid fa-chevron-right"
                    style={{ fontSize: "0.6rem" }}
                ></i>
                <span className="text-white fw-bold">Register Member</span>
            </div>

            <div className="mb-4" data-aos="fade-down" data-aos-delay="100">
                <h1 className={styles.pageTitle}>Member Registration</h1>
                <p className={styles.pageDesc}>
                    Register a new gym member and set up their member account
                </p>
            </div>

            <form onSubmit={submitRegistration}>
                <div className="row g-4 mb-4">
                    <div className="col-12 col-xl-8 d-flex flex-column gap-4">
                        {/* Personal Info Card */}
                        <div
                            className={styles.panelCard}
                            data-aos="fade-right"
                            data-aos-delay="200"
                        >
                            <div className={styles.panelHeader}>
                                <i className="fa-regular fa-user text-primary"></i>
                                <span>Member Personal Information</span>
                            </div>

                            <div className={styles.panelBody}>
                                <div className="mb-3">
                                    <label className={styles.formLabel}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="e.g. Juanito dela Cruz"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={updateField}
                                        required
                                    />
                                </div>
                                <div className="row g-3 mb-3">
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Mobile Contact Number
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="0917 123 4567"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={updateField}
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            className={styles.formInput}
                                            placeholder="juan.delacruz@example.com"
                                            name="email"
                                            value={formData.email}
                                            onChange={updateField}
                                            required
                                        />
                                        <span className={styles.helperText}>
                                            <i className="fa-solid fa-circle-info me-1"></i>{" "}
                                            Used to send digital receipts and
                                            login credentials
                                        </span>
                                    </div>
                                </div>
                                <div className="row g-3 mb-3">
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Password
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Create a strong password"
                                            name="password"
                                            value={formData.password}
                                            onChange={updateField}
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Gender
                                        </label>
                                        <select
                                            className={styles.formSelect}
                                            name="gender"
                                            value={formData.gender}
                                            onChange={updateField}
                                            required
                                        >
                                            <option value="">
                                                Select gender
                                            </option>
                                            <option value="male">Male</option>
                                            <option value="female">
                                                Female
                                            </option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Emergency Contact Name
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Maria dela Cruz"
                                            name="emergencyContactName"
                                            value={formData.emergencyContactName}
                                            onChange={updateField}
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className={styles.formLabel}>
                                            Emergency Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="0918 765 4321"
                                            name="emergencyContactPhone"
                                            value={formData.emergencyContactPhone}
                                            onChange={updateField}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ID Verification Card */}
                        <div
                            className={styles.panelCard}
                            data-aos="fade-right"
                            data-aos-delay="250"
                        >
                            <div className={styles.panelHeader}>
                                <i className="fa-regular fa-address-card text-primary"></i>
                                <span>Identity Verification</span>
                            </div>
                            <div className={styles.panelBody}>
                                <div className={styles.uploadBox}>
                                    <i className="fa-solid fa-id-card fs-1 text-secondary mb-2"></i>
                                        <p className="text-white fw-bold mb-1">Upload the member ID first</p>
                                        <p className="text-secondary" style={{ fontSize: "0.8rem" }}>OCR verifies the member name before facial matching.</p>
                                        {idPreview && <img src={idPreview} alt="ID preview" style={{ maxWidth: "100%", maxHeight: "180px", objectFit: "contain" }} />}
                                        <div className="d-flex gap-2 mt-2">
                                            <input ref={idInputRef} hidden type="file" accept="image/jpeg,image/png" onChange={(event) => setImage(event.target.files?.[0], setIdImage, setIdPreview)} />
                                            <button type="button" className={styles.btnOutlineAction} onClick={() => idInputRef.current?.click()}>
                                                <i className="fa-solid fa-upload"></i> Upload File
                                            </button>
                                        </div>
                                        {idImage && <small className="text-success d-block mt-2">ID ready: {idImage.name}</small>}
                                    </div>
                            </div>

                            <div className={styles.panelCard}>
                                <div className={styles.panelHeader}>
                                    <i className="fa-solid fa-face-viewfinder text-primary"></i>
                                    <span>Face Verification</span>
                                </div>
                                <div className={styles.panelBody}>
                                    <p className="text-secondary" style={{ fontSize: "0.8rem" }}>Scan the same member after uploading the ID. Face++ rejects non-face images and mismatched identities.</p>
                                    {cameraOpen ? (
                                        <div>
                                            <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", minHeight: "260px", maxHeight: "360px", objectFit: "cover", borderRadius: "8px", backgroundColor: "#0b1320" }} />
                                            <canvas ref={canvasRef} hidden />
                                            <div className="d-flex gap-2 mt-2">
                                                <button type="button" className={styles.btnSubmit} onClick={captureFace}>Capture Face</button>
                                                <button type="button" className={styles.btnCancelFull} onClick={stopCamera}>Cancel Camera</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="d-flex gap-2">
                                            <button type="button" className={styles.btnOutlineAction} onClick={startCamera}>
                                                <i className="fa-solid fa-camera"></i> Scan Face
                                            </button>
                                            <input ref={faceInputRef} hidden type="file" accept="image/jpeg,image/png" onChange={(event) => setImage(event.target.files?.[0], setFaceImage, setFacePreview)} />
                                            <button type="button" className={styles.btnOutlineAction} onClick={() => faceInputRef.current?.click()}>
                                                <i className="fa-solid fa-upload"></i> Upload Face
                                            </button>
                                        </div>
                                    )}
                                    {facePreview && <img src={facePreview} alt="Face preview" style={{ width: "140px", height: "140px", objectFit: "cover", borderRadius: "8px", marginTop: "12px" }} />}
                                    {faceImage && <small className="text-success d-block mt-2">Face ready: {faceImage.name}</small>}
                                </div>
                            </div>
                        </div>

                        {/* Membership Plan Selection */}
                        <div
                            className={styles.panelCard}
                            data-aos="fade-right"
                            data-aos-delay="300"
                        >
                            <div className="d-flex justify-content-between align-items-center border-bottom border-secondary p-4">
                                <div className={styles.panelHeaderNoBorder}>
                                    <i className="fa-solid fa-id-card-clip text-primary"></i>
                                    <span>Membership Plan Selection</span>
                                </div>
                                <span
                                    className="text-secondary"
                                    style={{ fontSize: "0.8rem" }}
                                >
                                    Local gym rates
                                </span>
                            </div>

                            <div className={styles.panelBody}>
                                <div className="row g-3 mb-4">
                                    <div className="col-12 col-sm-6">
                                        <div
                                            className={`${styles.planCard} ${selectedPlan === "session" ? styles.planCardActive : ""}`}
                                            onClick={() =>
                                                setSelectedPlan("session")
                                            }
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <span
                                                        className={
                                                            styles.planName
                                                        }
                                                    >
                                                        Session / Walk-In
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.planDuration
                                                        }
                                                    >
                                                        Single Day Pass
                                                    </span>
                                                </div>
                                                <div
                                                    className={`${styles.radioCircle} ${selectedPlan === "session" ? styles.radioCircleActive : ""}`}
                                                ></div>
                                            </div>
                                            <h3 className={styles.planPrice}>
                                                ₱90{" "}
                                                <span
                                                    className={
                                                        styles.planPriceSub
                                                    }
                                                >
                                                    (Student: ₱70)
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div
                                            className={`${styles.planCard} ${selectedPlan === "weekly" ? styles.planCardActive : ""}`}
                                            onClick={() =>
                                                setSelectedPlan("weekly")
                                            }
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <span
                                                        className={
                                                            styles.planName
                                                        }
                                                    >
                                                        Weekly Pass
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.planDuration
                                                        }
                                                    >
                                                        7 Days Valid
                                                    </span>
                                                </div>
                                                <div
                                                    className={`${styles.radioCircle} ${selectedPlan === "weekly" ? styles.radioCircleActive : ""}`}
                                                ></div>
                                            </div>
                                            <h3 className={styles.planPrice}>
                                                ₱270
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div
                                            className={`${styles.planCard} ${selectedPlan === "biweekly" ? styles.planCardActive : ""}`}
                                            onClick={() =>
                                                setSelectedPlan("biweekly")
                                            }
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <span
                                                        className={
                                                            styles.planName
                                                        }
                                                    >
                                                        Two Weeks Pass
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.planDuration
                                                        }
                                                    >
                                                        14 Days Valid
                                                    </span>
                                                </div>
                                                <div
                                                    className={`${styles.radioCircle} ${selectedPlan === "biweekly" ? styles.radioCircleActive : ""}`}
                                                ></div>
                                            </div>
                                            <h3 className={styles.planPrice}>
                                                ₱540
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div
                                            className={`${styles.planCard} ${selectedPlan === "monthly" ? styles.planCardActive : ""}`}
                                            onClick={() =>
                                                setSelectedPlan("monthly")
                                            }
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <span
                                                        className={
                                                            styles.planName
                                                        }
                                                    >
                                                        Monthly Regular{" "}
                                                        <span
                                                            className={
                                                                styles.popularBadge
                                                            }
                                                        >
                                                            Popular
                                                        </span>
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.planDuration
                                                        }
                                                    >
                                                        30 Days Valid
                                                    </span>
                                                </div>
                                                <div
                                                    className={`${styles.radioCircle} ${selectedPlan === "monthly" ? styles.radioCircleActive : ""}`}
                                                >
                                                    {selectedPlan ===
                                                        "monthly" && (
                                                        <div
                                                            className={
                                                                styles.radioInner
                                                            }
                                                        ></div>
                                                    )}
                                                </div>
                                            </div>
                                            <h3 className={styles.planPrice}>
                                                ₱990{" "}
                                                <span
                                                    className={
                                                        styles.planPriceSub
                                                    }
                                                >
                                                    (Student: ₱750)
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.infoAlert}>
                                    <i className="fa-regular fa-circle-check"></i>
                                    <span>
                                        Student rates apply automatically upon
                                        clerk verification.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Optional Coach */}
                        <div
                            className={styles.panelCard}
                            data-aos="fade-right"
                            data-aos-delay="400"
                        >
                            <div className={styles.panelHeader}>
                                <i className="fa-solid fa-user-tie text-primary"></i>
                                <span>Optional Coach Assistance</span>
                            </div>

                            <div className={styles.panelBody}>
                                <div className={styles.coachToggleBox}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.customCheckbox}
                                            checked={addCoach}
                                            onChange={() =>
                                                setAddCoach(!addCoach)
                                            }
                                        />
                                        <div>
                                            <span className={styles.planName}>
                                                Add Coach Assistance (+₱500)
                                            </span>
                                            <span
                                                className={styles.planDuration}
                                            >
                                                Adds personal guidance for
                                                fitness routines
                                            </span>
                                        </div>
                                    </label>
                                    <select
                                        className={styles.formSelect}
                                        disabled={!addCoach}
                                        style={{ width: "200px" }}
                                    >
                                        <option value="none">
                                            Select Coach
                                        </option>
                                        <option value="mark">Coach Mark</option>
                                        <option value="analyn">
                                            Coach Analyn
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                        {/* Receipt Box */}
                        <div
                            className={styles.panelCard}
                            data-aos="fade-left"
                            data-aos-delay="200"
                        >
                            <div className={styles.panelHeader}>
                                <i className="fa-solid fa-receipt text-primary"></i>
                                <span>Payment & Digital Receipt</span>
                            </div>

                            <div className={styles.panelBody}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.85rem" }}
                                    >
                                        {plans[selectedPlan].name} (
                                        {plans[selectedPlan].duration.replace(
                                            " Valid",
                                            "",
                                        )}
                                        )
                                    </span>
                                    <span className="text-white fw-bold">
                                        ₱{currentPrice}
                                    </span>
                                </div>
                                {addCoach && (
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <span
                                            className="text-secondary"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Coach Assistance
                                        </span>
                                        <span className="text-white fw-bold">
                                            ₱500
                                        </span>
                                    </div>
                                )}

                                <div className={styles.totalBox}>
                                    <span
                                        className="text-white"
                                        style={{ fontSize: "0.9rem" }}
                                    >
                                        Total Amount Due
                                    </span>
                                    <h2 className={styles.totalPrice}>
                                        ₱{totalDue}
                                    </h2>
                                </div>

                                <div className="mb-4">
                                    <span className={styles.formLabel}>
                                        Payment Method
                                    </span>
                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className={`${styles.btnPaymentMethod} ${paymentMethod === "cash" ? styles.btnPaymentMethodActive : ""}`}
                                            onClick={() =>
                                                setPaymentMethod("cash")
                                            }
                                        >
                                            <i className="fa-solid fa-money-bill"></i>{" "}
                                            Cash
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.btnPaymentMethod} ${paymentMethod === "gcash" ? styles.btnPaymentMethodActive : ""}`}
                                            onClick={() =>
                                                setPaymentMethod("gcash")
                                            }
                                        >
                                            <i className="fa-solid fa-mobile-screen"></i>{" "}
                                            GCash
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.btnPaymentMethod} ${paymentMethod === "maya" ? styles.btnPaymentMethodActive : ""}`}
                                            onClick={() =>
                                                setPaymentMethod("maya")
                                            }
                                        >
                                            <i className="fa-solid fa-mobile-button"></i>{" "}
                                            Maya
                                        </button>
                                    </div>
                                </div>

                                {paymentMethod === "cash" && (
                                    <div className="row g-3 mb-4">
                                        <div className="col-6">
                                            <label className={styles.formLabel}>
                                                Cash Tendered
                                            </label>
                                            <div
                                                className={
                                                    styles.inputGroupPrefix
                                                }
                                            >
                                                <span>₱</span>
                                                <input
                                                    type="number"
                                                    className={styles.formInput}
                                                    placeholder="1000"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <label className={styles.formLabel}>
                                                Change
                                            </label>
                                            <div
                                                className={styles.changeDisplay}
                                            >
                                                ₱0
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {paymentMethod !== "cash" && (
                                    <div className="mb-4">
                                        <label className={styles.formLabel}>
                                            Reference Number
                                        </label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            placeholder="Enter transaction ref"
                                        />
                                    </div>
                                )}

                                <label className={styles.checkboxLabelFull}>
                                    <input
                                        type="checkbox"
                                        className={styles.customCheckbox}
                                        defaultChecked
                                    />
                                    <div>
                                        <span
                                            className="d-block text-white fw-bold mb-1"
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            Send Digital Receipt to Member Email
                                        </span>
                                        <span
                                            className="text-secondary"
                                            style={{
                                                fontSize: "0.75rem",
                                                lineHeight: "1.4",
                                            }}
                                        >
                                            Sends breakdown and credentials.
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div
                            className={styles.actionPanel}
                            data-aos="fade-left"
                            data-aos-delay="300"
                        >
                            {status.message && <div className={`alert alert-${status.type} py-2`}>{status.message}</div>}
                            <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
                                <i className="fa-regular fa-paper-plane"></i>{" "}
                                {isSubmitting ? "Verifying ID and face..." : "Complete Registration & Send Email"}
                            </button>
                            <button
                                type="button"
                                className={styles.btnCancelFull}
                            >
                                Cancel
                            </button>
                            <p
                                className="text-center text-secondary mt-3 mb-0"
                                style={{
                                    fontSize: "0.75rem",
                                    lineHeight: "1.5",
                                }}
                            >
                                An account will be created automatically. The
                                member can log in using their email and
                                temporary password to access the Gym Member
                                Portal.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </ClerkLayout>
    );
}