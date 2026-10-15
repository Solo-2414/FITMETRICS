import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export const homePathForRole = (role) =>
    ({
        admin: "/admin/dashboard",
        clerk: "/clerk/dashboard",
        member: "/member/dashboard",
    })[role] ?? "/login";

async function fetchProfile(userId) {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
    return error ? null : data;
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [initializing, setInitializing] = useState(true);
    // { id, data } so we always know which user the profile belongs to
    const [profileResult, setProfileResult] = useState({ id: null, data: null });

    // 1. Restore the saved session and listen for login / logout / token refresh
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setInitializing(false);
        });
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession); // keep this callback synchronous
        });
        return () => subscription.unsubscribe();
    }, []);

    // 2. Load the profile (role + status) whenever the signed-in user changes
    const userId = session?.user?.id ?? null;
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        fetchProfile(userId).then((data) => {
            if (!cancelled) setProfileResult({ id: userId, data });
        });
        return () => {
            cancelled = true;
        };
    }, [userId]);

    const profile = profileResult.id === userId ? profileResult.data : null;
    const profileReady = !userId || profileResult.id === userId;
    const loading = initializing || !profileReady;

    // 3. Kick out accounts that were deactivated / have no profile
    useEffect(() => {
        if (!loading && session && (!profile || profile.status !== "active")) {
            supabase.auth.signOut();
        }
    }, [loading, session, profile]);

    const signIn = async (identifier, password) => {
        try {
            const result = await api("/auth/login", {
                method: "POST",
                body: { identifier: identifier.trim(), password },
            });
            const { error } = await supabase.auth.setSession(result.session);
            if (error) {
                return { error: "Unable to establish a session. Please try again." };
            }
            setProfileResult({ id: result.user.id, data: result.profile });
            return { profile: result.profile };
        } catch (error) {
            return { error: error.message };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    const refreshProfile = async () => {
        if (!userId) return;
        setProfileResult({ id: userId, data: await fetchProfile(userId) });
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                profile,
                role: profile?.role ?? null,
                loading,
                signIn,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
};
