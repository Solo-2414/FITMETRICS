import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("zhaider.mendoza@gmail.com");

    const [otp, setOtp] = useState(new Array(6).fill(""));
    const otpRefs = useRef([]);
    const [timeLeft, setTimeLeft] = useState(44);

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const hasMinLength = newPassword.length >= 8;
    const hasNumOrSym = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    const passwordsMatch =
        newPassword.length > 0 && newPassword === confirmPassword;
    const isPasswordValid = hasMinLength && hasNumOrSym && passwordsMatch;

    useEffect(() => {
        if (step === 2 && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [step, timeLeft]);

    const handleEmailSubmit = (e) => {
        e.preventDefault();
        setStep(2);
        setTimeLeft(44);
    };

    const handleOtpSubmit = (e) => {
        e.preventDefault();
        setStep(3);
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (isPasswordValid) {
            navigate("/login");
        }
    };

    const handleOtpChange = (element, index) => {
        if (isNaN(element.value)) return false;
        setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
        if (element.value !== "" && index < 5) {
            otpRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && otp[index] === "" && index > 0) {
            otpRefs.current[index - 1].focus();
        }
    };

    return (
        <div className="login-wrapper position-relative">
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
                    <div className="d-none d-sm-block">
                        <h4
                            className="m-0 text-white"
                            style={{
                                fontFamily: "var(--heading-font)",
                                fontSize: "1.1rem",
                            }}
                        >
                            FITMETRICS
                        </h4>
                        <p
                            className="m-0 text-secondary"
                            style={{ fontSize: "0.75rem" }}
                        >
                            Analyn's Fitness Gym
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="back-btn border-0 bg-transparent"
                >
                    <i className="fa-solid fa-arrow-left"></i> Back to Login
                </button>
            </header>

            <main className="d-flex flex-column align-items-center justify-content-center flex-grow-1 w-100 px-3 py-5">
                <div
                    className="stepper-container mb-5"
                    data-aos="fade-down"
                    data-aos-delay="100"
                >
                    <div
                        className={`step-item ${step > 1 ? "completed" : step === 1 ? "active" : ""}`}
                    >
                        <div className="step-circle">
                            {step > 1 ? (
                                <i className="fa-solid fa-check"></i>
                            ) : (
                                "1"
                            )}
                        </div>
                        <span className="step-label">Enter Email</span>
                    </div>

                    <div
                        className={`step-line ${step > 1 ? "completed" : ""}`}
                    ></div>

                    <div
                        className={`step-item ${step > 2 ? "completed" : step === 2 ? "active" : ""}`}
                    >
                        <div className="step-circle">
                            {step > 2 ? (
                                <i className="fa-solid fa-check"></i>
                            ) : (
                                "2"
                            )}
                        </div>
                        <span className="step-label">OTP Verification</span>
                    </div>

                    <div
                        className={`step-line ${step > 2 ? "completed" : ""}`}
                    ></div>

                    <div className={`step-item ${step === 3 ? "active" : ""}`}>
                        <div className="step-circle">3</div>
                        <span className="step-label">Change Password</span>
                    </div>
                </div>

                <div
                    className="recovery-card mb-3"
                    data-aos="fade-up"
                    data-aos-delay="200"
                >
                    <div className="step-badge mb-3">
                        <span className="step-dot me-2"></span>
                        Step {step} of 3
                    </div>

                    {step === 1 && (
                        <div className="step-content animate-fade-in">
                            <h3 className="card-title">
                                Identify Your Account
                            </h3>
                            <p className="card-desc mb-4">
                                Enter your registered email. We will send a
                                6-digit One-Time Password (OTP) to your inbox.
                            </p>

                            <form onSubmit={handleEmailSubmit}>
                                <div className="mb-2">
                                    <label
                                        className="form-label text-uppercase"
                                        style={{
                                            fontSize: "0.7rem",
                                            letterSpacing: "1px",
                                        }}
                                    >
                                        Email Address
                                    </label>
                                    <div className="input-group-custom">
                                        <i className="fa-solid fa-at icon-left"></i>
                                        <input
                                            type="email"
                                            className="form-control-custom"
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                            placeholder="name@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <p className="field-hint mb-4 mt-3">
                                    <i className="fa-solid fa-circle-info me-2"></i>
                                    Enter the email address registered with
                                    Analyn's Fitness Gym membership desk.
                                </p>

                                <button
                                    type="submit"
                                    className="btn-primary-action w-100"
                                >
                                    Send Verification OTP{" "}
                                    <i className="fa-solid fa-arrow-right ms-2"></i>
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="step-content animate-fade-in">
                            <h3 className="card-title">
                                Enter Verification Code
                            </h3>
                            <p className="card-desc mb-4">
                                We sent a 6-digit one-time password (OTP) to{" "}
                                <strong className="text-white">{email}</strong>.
                                Please enter it below to verify your identity.
                            </p>

                            <form onSubmit={handleOtpSubmit}>
                                <div className="mb-4">
                                    <label
                                        className="form-label text-uppercase mb-3 d-block"
                                        style={{
                                            fontSize: "0.7rem",
                                            letterSpacing: "1px",
                                        }}
                                    >
                                        One-Time Password
                                    </label>
                                    <div className="otp-container d-flex justify-content-between gap-2">
                                        {otp.map((data, index) => (
                                            <input
                                                key={index}
                                                type="text"
                                                name="otp"
                                                maxLength="1"
                                                className="otp-input"
                                                value={data}
                                                onChange={(e) =>
                                                    handleOtpChange(
                                                        e.target,
                                                        index,
                                                    )
                                                }
                                                onKeyDown={(e) =>
                                                    handleKeyDown(e, index)
                                                }
                                                ref={(ref) =>
                                                    (otpRefs.current[index] =
                                                        ref)
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mb-4 text-sm">
                                    <span
                                        className="text-secondary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        <i className="fa-regular fa-clock me-1"></i>{" "}
                                        Resend OTP in 00:
                                        {timeLeft < 10
                                            ? `0${timeLeft}`
                                            : timeLeft}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-resend border-0 bg-transparent"
                                        disabled={timeLeft > 0}
                                        onClick={() => setTimeLeft(60)}
                                    >
                                        <i className="fa-solid fa-arrow-rotate-right me-1"></i>{" "}
                                        Resend Code
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary-action w-100 mb-4"
                                    disabled={otp.join("").length !== 6}
                                >
                                    Verify OTP & Continue{" "}
                                    <i className="fa-solid fa-arrow-right ms-2"></i>
                                </button>

                                <div
                                    className="d-flex justify-content-between align-items-center"
                                    style={{ fontSize: "0.8rem" }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="btn-text border-0 bg-transparent p-0 text-secondary hover-primary"
                                    >
                                        <i className="fa-solid fa-pen me-1"></i>{" "}
                                        Entered the wrong email?{" "}
                                        <span className="text-primary text-decoration-underline">
                                            Back to Step 1
                                        </span>
                                    </button>
                                    <span className="text-secondary">
                                        <i className="fa-solid fa-ticket me-1"></i>{" "}
                                        Expires in 10 mins
                                    </span>
                                </div>
                            </form>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="step-content animate-fade-in">
                            <h3 className="card-title">Create New Password</h3>
                            <p className="card-desc mb-4">
                                Your email has been verified. Enter a new
                                password for{" "}
                                <strong className="text-white">{email}</strong>{" "}
                                to restore access.
                            </p>

                            <form onSubmit={handlePasswordSubmit}>
                                <div className="mb-3">
                                    <label
                                        className="form-label text-uppercase"
                                        style={{
                                            fontSize: "0.7rem",
                                            letterSpacing: "1px",
                                        }}
                                    >
                                        New Password
                                    </label>
                                    <div className="input-group-custom">
                                        <i className="fa-solid fa-lock icon-left"></i>
                                        <input
                                            type={
                                                showNewPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            className="form-control-custom"
                                            placeholder="Enter new strong password"
                                            value={newPassword}
                                            onChange={(e) =>
                                                setNewPassword(e.target.value)
                                            }
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn-eye icon-right"
                                            onClick={() =>
                                                setShowNewPassword(
                                                    !showNewPassword,
                                                )
                                            }
                                        >
                                            <i
                                                className={`fa-regular ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`}
                                            ></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label
                                        className="form-label text-uppercase"
                                        style={{
                                            fontSize: "0.7rem",
                                            letterSpacing: "1px",
                                        }}
                                    >
                                        Confirm New Password
                                    </label>
                                    <div className="input-group-custom">
                                        <i className="fa-solid fa-lock icon-left"></i>
                                        <input
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            className="form-control-custom"
                                            placeholder="Confirm your new password"
                                            value={confirmPassword}
                                            onChange={(e) =>
                                                setConfirmPassword(
                                                    e.target.value,
                                                )
                                            }
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn-eye icon-right"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    !showConfirmPassword,
                                                )
                                            }
                                        >
                                            <i
                                                className={`fa-regular ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}
                                            ></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="password-requirements mb-4">
                                    <p className="req-title">
                                        Password Requirement Checklist:
                                    </p>
                                    <ul className="req-list">
                                        <li
                                            className={
                                                hasMinLength ? "req-met" : ""
                                            }
                                        >
                                            <i
                                                className={`fa-regular ${hasMinLength ? "fa-circle-check" : "fa-circle"}`}
                                            ></i>{" "}
                                            At least 8 characters long
                                        </li>
                                        <li
                                            className={
                                                hasNumOrSym ? "req-met" : ""
                                            }
                                        >
                                            <i
                                                className={`fa-regular ${hasNumOrSym ? "fa-circle-check" : "fa-circle"}`}
                                            ></i>{" "}
                                            At least one number or symbol
                                        </li>
                                        <li
                                            className={
                                                passwordsMatch ? "req-met" : ""
                                            }
                                        >
                                            <i
                                                className={`fa-regular ${passwordsMatch ? "fa-circle-check" : "fa-circle"}`}
                                            ></i>{" "}
                                            Passwords match
                                        </li>
                                    </ul>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary-action w-100 mb-3"
                                    disabled={!isPasswordValid}
                                >
                                    Change Password & Log In{" "}
                                    <i className="fa-solid fa-arrow-right ms-2"></i>
                                </button>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/login")}
                                        className="btn-text border-0 bg-transparent p-0 text-secondary hover-primary"
                                        style={{ fontSize: "0.8rem" }}
                                    >
                                        Cancel and return to Login
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {step === 2 && (
                    <div
                        className="spam-alert animate-fade-in d-flex align-items-center justify-content-center gap-2"
                        data-aos="fade-up"
                        data-aos-delay="300"
                    >
                        <i className="fa-regular fa-circle-info text-primary"></i>
                        <span>
                            Check your spam or junk folder if you don't see the
                            email within 1 minute.
                        </span>
                    </div>
                )}
            </main>

            <div
                className="system-footer w-100 pb-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2"
                style={{
                    fontSize: "0.75rem",
                    color: "var(--card-stroke-color)",
                }}
                data-aos="fade-up"
                data-aos-delay="400"
                data-aos-offset="0"
            >
                <div>
                    © 2026 FITMETRICS. Analyn's Fitness Gym Management System.
                </div>
                <div className="d-flex gap-3 align-items-center">
                    <a
                        href="#"
                        className="text-secondary text-decoration-none hover-primary"
                    >
                        Privacy Policy
                    </a>
                    <span>·</span>
                    <a
                        href="#"
                        className="text-secondary text-decoration-none hover-primary"
                    >
                        Help Desk
                    </a>
                </div>
            </div>
        </div>
    );
}
