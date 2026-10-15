import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, homePathForRole } from "../context/AuthContext";

/**
 * <Route element={<ProtectedRoute roles={["admin"]} />}> ...child routes... </Route>
 *  - not logged in        -> /login
 *  - wrong role           -> that user's own dashboard
 */
export default function ProtectedRoute({ roles }) {
    const { session, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div
                className="d-flex align-items-center justify-content-center text-secondary"
                style={{ minHeight: "100vh" }}
            >
                Loading...
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Session exists but profile missing/inactive: AuthContext is signing them out
    if (!profile || profile.status !== "active") return null;

    if (roles && !roles.includes(profile.role)) {
        return <Navigate to={homePathForRole(profile.role)} replace />;
    }

    return <Outlet />;
}
