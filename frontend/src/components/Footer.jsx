import { useNavigate } from "react-router-dom";

export default function Footer() {
    const navigate = useNavigate();

    return (
        <footer className="py-5">
            <div className="container">
                <div className="footer-container d-flex flex-column flex-md-row justify-content-between align-items-start gap-4 mb-4">
                    <div className="footer-brand">
                        <div className="title d-flex align-items-center gap-3 mb-2">
                            <img src="/logo.png" alt="Fitmetrics Logo" />
                            <h3 className="m-0">FITMETRICS</h3>
                            <p className="m-0">· Analyn's Fitness Gym</p>
                        </div>
                        <p className="brand-desc">
                            San Jose, Batangas · Phone:{" "}
                            <a href="tel:+639277943574">+63 927 794 3574</a> ·
                            Email:{" "}
                            <a href="mailto:analynfitnessgym@gmail.com">
                                analynfitnessgym@gmail.com
                            </a>
                        </p>
                    </div>

                    <div className="footer-actions">
                        <button
                            type="button"
                            className="login-btn"
                            onClick={() => navigate("/login")}
                        >
                            <i
                                className="fa-solid fa-right-to-bracket"
                                aria-hidden="true"
                            ></i>
                            Login
                        </button>
                    </div>
                </div>

                <hr />

                <div className="copyright text-center text-md-start">
                    &copy; {new Date().getFullYear()} Analyn's Fitness Gym
                    (FITMETRICS). All rights reserved.
                </div>
            </div>
        </footer>
    );
}
