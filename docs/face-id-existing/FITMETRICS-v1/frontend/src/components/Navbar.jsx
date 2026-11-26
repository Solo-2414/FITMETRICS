import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState("home");

    useEffect(() => {
        const handleScroll = () => {
            const sections = [
                "home",
                "about-us",
                "membership-rates",
                "personal-coaching",
                "location",
            ];

            const scrollPosition = window.scrollY + 100;

            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (
                        scrollPosition >= offsetTop &&
                        scrollPosition < offsetTop + offsetHeight
                    ) {
                        setActiveSection(section);
                    }
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleNavClick = (e, targetId) => {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
            const navMenu = document.getElementById("navmenu");
            if (navMenu.classList.contains("show")) {
                navMenu.classList.remove("show");
            }
        }
    };

    return (
        <header className="sticky-top border-bottom border-secondary header-main">
            <nav className="navbar navbar-expand-lg navbar-dark container-fluid px-4">
                <a
                    className="navbar-brand logo d-flex align-items-center gap-3"
                    href="#home"
                    onClick={(e) => handleNavClick(e, "home")}
                >
                    <img
                        src="/logo.png"
                        alt="Fitmetrics Analyn's Fitness Gym Logo"
                    />
                    <div className="info">
                        <h4 className="m-0">FITMETRICS</h4>
                        <p className="m-0 text-secondary">
                            Analyn's Fitness Gym
                        </p>
                    </div>
                </a>

                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navmenu"
                    aria-controls="navmenu"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div
                    className="collapse navbar-collapse justify-content-end"
                    id="navmenu"
                >
                    <ul className="navbar-nav align-items-lg-center gap-lg-3 my-3 my-lg-0">
                        {[
                            "home",
                            "about-us",
                            "membership-rates",
                            "personal-coaching",
                            "location",
                        ].map((section) => (
                            <li className="nav-item" key={section}>
                                <a
                                    className={`nav-link ${activeSection === section ? "active" : ""}`}
                                    href={`#${section}`}
                                    onClick={(e) => handleNavClick(e, section)}
                                >
                                    {section
                                        .split("-")
                                        .map(
                                            (word) =>
                                                word.charAt(0).toUpperCase() +
                                                word.slice(1),
                                        )
                                        .join(" ")}
                                </a>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        className="login-btn ms-lg-3"
                        onClick={() => navigate("/login")}
                    >
                        <i
                            className="fa-solid fa-right-to-bracket"
                            aria-hidden="true"
                        ></i>
                        Login
                    </button>
                </div>
            </nav>
        </header>
    );
}
