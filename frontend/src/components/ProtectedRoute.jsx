import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { homePathForRole } from "../context/homePathForRole";
import { api } from "../lib/api";
import { hasAdminPasskey } from "../lib/supabase";
import MaintenanceScreen from "./MaintenanceScreen";

/**
 * <Route element={<ProtectedRoute roles={["admin"]} />}> ...child routes... </Route>
 *  - not logged in        -> /login
 *  - wrong role           -> that user's own dashboard
 */
export default function ProtectedRoute({ roles }) {
    const { session, profile, loading } = useAuth();
    const location = useLocation();
    const [maintenance, setMaintenance] = useState(null);
    const [adminPasskeyResult, setAdminPasskeyResult] = useState({ token: null, verified: false });
    const memberRoute = roles?.includes("member");
    const adminRoute = roles?.includes("admin");
    const sessionToken = session?.access_token;
    const isAdminProfile = profile?.role === "admin";
    useEffect(() => {
        if (!memberRoute) return undefined;
        let active = true;
        const refresh = () => api("/public/status").then((status) => { if (active) setMaintenance(status.maintenance ? status : null); }).catch(() => {});
        refresh();
        const interval = window.setInterval(refresh, 60_000);
        const onMaintenance = (event) => { if (active) setMaintenance(event.detail); };
        window.addEventListener("fitmetrics:maintenance", onMaintenance);
        return () => {
            active = false;
            window.clearInterval(interval);
            window.removeEventListener("fitmetrics:maintenance", onMaintenance);
        };
    }, [memberRoute]);

    useEffect(() => {
        if (!adminRoute || !isAdminProfile || !sessionToken) return undefined;
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
    }, [adminRoute, isAdminProfile, sessionToken]);

    if (loading) {
        return <p className="fm-route-loading" role="status">Checking your session...</p>;
    }

    if (!session) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Session exists but profile missing/inactive: AuthContext is signing them out
    if (!profile || profile.status !== "active") return null;

    if (roles && !roles.includes(profile.role)) {
        return <Navigate to={homePathForRole(profile.role)} replace />;
    }
    if (adminRoute && profile.role === "admin") {
        if (adminPasskeyResult.token !== sessionToken) {
            return <p className="fm-route-loading" role="status">Checking admin passkey...</p>;
        }
        if (!adminPasskeyResult.verified) {
            return <Navigate to="/login" replace state={{ from: location }} />;
        }
    }
    if (profile.role === "member" && maintenance) return <MaintenanceScreen {...maintenance} />;

    return <Outlet />;
}
