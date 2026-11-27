import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homePathForRole } from "../context/homePathForRole";
import "../App.css";
import { api } from "../lib/api";
import { toastError, useToast } from "../components/ui/toast/useToast";
import {
    hasAdminPasskey,
    setSessionPersistence,
    supabase,
} from "../lib/supabase";

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, signOut, session, profile, loading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [passkeySignInPending, setPasskeySignInPending] = useState(false);
    const [maintenance, setMaintenance] = useState(null);
    const [adminPasskeyResult, setAdminPasskeyResult] = useState({ token: null, verified: false });
    const sessionToken = session?.access_token;
    const isAdminProfile = profile?.role === "admin";
    const adminPasskeyState = !session || !isAdminProfile
        ? "idle"
        : adminPasskeyResult.token !== sessionToken
            ? "checking"
            : adminPasskeyResult.verified
                ? "verified"
                : "required";

    useEffect(() => {
        api("/public/status")
            .then((status) =>
                setMaintenance(status.maintenance ? status : null),
            )
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!sessionToken || !isAdminProfile) return undefined;
        let active = true;
        hasAdminPasskey()
            .then((verified) => {
                if (active) setAdminPasskeyResult({ token: sessionToken, verified });
            })
            .catch(() => {
                if (active) setAdminPasskeyResult({ token: sessionToken, verified: false });
            });
        return () => {
            active = false;
        };
    }, [isAdminProfile, sessionToken]);

    // Already logged in? Go straight to your own dashboard.
    if (!loading && session && profile && !passkeySignInPending) {
        if (profile.role !== "admin" || adminPasskeyState === "verified") {
            return <Navigate to={homePathForRole(profile.role)} replace />;
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { error: signInError, profile: prof } = await signIn(
                email,
                password,
            );
            if (signInError) {
                toast.error(signInError);
                return;
            }
            if (prof.role === "admin") {
                const { data: passkeys, error: passkeysError } =
                    await supabase.auth.passkey.list();
                if (passkeysError) throw passkeysError;
                if (passkeys?.length) {
                    await signOut();
                    toast.info("Use a registered device passkey to sign in as an admin.");
                }
                return;
            }
            const preferredLanding =
                prof.role === "clerk" && !location.state?.from
                    ? (await api("/clerk/settings/preferences").catch(() => ({})))
                          .defaultLandingPage === "attendance"
                        ? "/clerk/attendance"
                        : "/clerk/dashboard"
                    : null;
            navigate(
                location.state?.from?.pathname
                    ? `${location.state.from.pathname}${location.state.from.search || ""}`
                    : preferredLanding || homePathForRole(prof.role),
                { replace: true },
            );
        } catch (error) {
            toast.error(toastError(error));
        } finally {
            setSubmitting(false);
        }
    };

    const signInWithAdminPasskey = async () => {
        setSubmitting(true);
        setPasskeySignInPending(true);
        let sessionStarted = false;
        try {
            if (session) await signOut();
            setSessionPersistence(false);
            const { data, error } = await supabase.auth.signInWithPasskey();
            if (error) throw error;
            if (!data?.session || !data.user?.id) {
                throw new Error("Passkey sign-in did not return an authenticated session.");
            }
            sessionStarted = true;
            const signedInProfile = await api("/me");
            if (signedInProfile.id !== data.user.id || signedInProfile.role !== "admin") {
                throw new Error("Passkey sign-in is available for admin accounts only.");
            }
            if (!await hasAdminPasskey()) {
                throw new Error("The session was not verified with an admin passkey.");
            }
            await api("/auth/admin/passkey/verified", { method: "POST" });
            toast.success("Admin passkey sign-in verified.");
        } catch (error) {
            if (sessionStarted) {
                try {
                    await signOut();
                } catch (signOutError) {
                    toast.error(toastError(signOutError));
                }
            }
            toast.error(toastError(error));
        } finally {
            setPasskeySignInPending(false);
            setSubmitting(false);
        }
    };

    const registerAdminPasskey = async () => {
        setSubmitting(true);
        try {
            const { data: passkeys, error: listError } =
                await supabase.auth.passkey.list();
            if (listError) throw listError;
            if (passkeys?.length) {
                await signOut();
                toast.info("Use your registered device passkey to sign in as an admin.");
                return;
            }
            const { data, error } = await supabase.auth.registerPasskey();
            if (error) throw error;
            if (!data?.id) throw new Error("Passkey registration was not confirmed.");
            await signOut();
            toast.success("Passkey registered. Sign in with it to continue as admin.");
        } catch (error) {
            toast.error(toastError(error));
        } finally {
            setSubmitting(false);
        }
    };

    const cancelAdminSignIn = async () => {
        try {
            await signOut();
        } catch (error) {
            toast.error(toastError(error));
        }
    };

    const showAdminPasskey = session && profile?.role === "admin"
        && adminPasskeyState !== "verified";

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
                        FITMETRICS
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
                        {showAdminPasskey
                            ? "Use a device passkey to sign in as an admin."
                            : "Log in to your account to continue."}
                    </p>
                    {/* toast-allow: persistent maintenance notice */}
                    {maintenance && (
                        <div className="alert alert-warning" data-toast-allow="toast-allow">
                            {maintenance.message} Staff access remains
                            available.
                        </div>
                    )}

                    {showAdminPasskey ? (
                        <div>
                            <div className="info-alert d-flex align-items-start gap-3 mb-4">
                                <i className="fa-solid fa-shield-halved mt-1"></i>
                                <p className="m-0">
                                    {adminPasskeyState === "checking"
                                        ? "Checking your admin passkey..."
                                        : "Passkeys use Face ID, Touch ID, Windows Hello, a device PIN, or a security key. The biometric stays on your device; Supabase verifies the passkey. Enable Passkey authentication in Supabase under Authentication > Passkeys."}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn-login w-100 mb-3"
                                onClick={signInWithAdminPasskey}
                                disabled={submitting || adminPasskeyState === "checking"}
                            >
                                {submitting
                                    ? "Waiting for your passkey..."
                                    : "Sign in with device passkey"}
                                <i className="fa-solid fa-arrow-right ms-2"></i>
                            </button>
                            <button
                                type="button"
                                className="forgot-password-link border-0 bg-transparent"
                                onClick={registerAdminPasskey}
                                disabled={submitting || adminPasskeyState === "checking"}
                            >
                                Register a passkey for this device
                            </button>
                            <button
                                type="button"
                                className="forgot-password-link border-0 bg-transparent d-block mt-3"
                                onClick={cancelAdminSignIn}
                                disabled={submitting}
                            >
                                Sign out
                            </button>
                        </div>
                    ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">
                                Email or Username
                            </label>
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
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
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
                        <button
                            type="button"
                            className="forgot-password-link border-0 bg-transparent mt-3"
                            onClick={signInWithAdminPasskey}
                            disabled={submitting}
                        >
                            Sign in as admin with a device passkey
                        </button>
                    </form>
                    )}
                </div>
            </main>
        </div>
    );
}
