export default function MaintenanceScreen({ message, gymName }) {
    return (
        <div className="d-flex align-items-center justify-content-center text-center p-4" style={{ minHeight: "100vh", background: "var(--background-color)" }}>
            <div className="p-5 rounded-4" style={{ maxWidth: 560, background: "var(--secondary-background-color)", border: "1px solid var(--card-stroke-color)" }}>
                <i className="fa-solid fa-hammer text-warning fs-1 mb-3"></i>
                <h1 className="text-white fs-3">{gymName || "FITMETRICS"} is temporarily offline</h1>
                <p className="text-secondary mb-0">{message || "The member portal is undergoing maintenance. Please check back shortly."}</p>
            </div>
        </div>
    );
}
