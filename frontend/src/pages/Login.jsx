import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth, homePathForRole } from "../context/AuthContext";
import "../App.css";

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { signIn, session, profile, loading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Already logged in? Go straight to your own dashboard.
    if (!loading && session && profile) {
        return <Navigate to={homePathForRole(profile.role)} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        const { error: signInError, profile: prof } = await signIn(email, password);
        setSubmitting(false);
        if (signInError) return setError(signInError);
        navigate(homePathForRole(prof.role), { replace: true });
    };

    return (
        <div className="login-wrapper">
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

            <main className="d-flex flex-column align-items-center justify-content-center flex-grow-1 w-100 px-3">
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
                    <h3 className="card-title">Welcome Back</h3>
                    <p className="card-subtitle mb-4">
                        Log in to your account to continue.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Email or Username</label>
                            <div className="input-group-custom">
                                <i className="fa-regular fa-envelope icon-left"></i>
                                <input
                                    type="text"
                                    className="form-control-custom"
                                    placeholder="Enter your email or username"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="username"
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
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
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

                        {error && (
                            <div
                                role="alert"
                                className="mb-3"
                                style={{
                                    color: "#f87171",
                                    fontSize: "0.85rem",
                                    textAlign: "center",
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-login w-100 mb-4"
                            disabled={submitting}
                        >
                            {submitting ? "Logging in..." : "Log In"}{" "}
                            <i className="fa-solid fa-arrow-right ms-2"></i>
                        </button>

                        <div className="info-alert d-flex align-items-start gap-3">
                            <i className="fa-solid fa-shield-halved mt-1"></i>
                            <p className="m-0">
                                Accounts are created and registered exclusively
                                by authorized gym staff upon member enrollment.
                            </p>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
