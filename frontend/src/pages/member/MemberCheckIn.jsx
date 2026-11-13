import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MemberLayout from "../../components/member/MemberLayout";
import { api } from "../../lib/api";
import { useToast } from "../../components/ui/toast/useToast";

export default function MemberCheckIn() {
    const toast = useToast();
    const [params] = useSearchParams();
    const token = params.get("t");
    const [state, setState] = useState(() => token
        ? { loading: true, error: "", result: null }
        : { loading: false, error: "This gym QR code is missing or invalid.", result: null });
    useEffect(() => {
        if (!token) return undefined;
        api("/attendance/qr-checkin", { method: "POST", body: { token } })
            .then((result) => { setState({ loading: false, error: "", result }); toast.success("You are checked in."); })
            .catch((error) => { setState({ loading: false, error: error.message, result: null }); toast.error(error.message); });
        return undefined;
    }, [token, toast]);
    return (
        <MemberLayout>
            <div className="container py-5">
                <div className="card bg-dark text-white border-secondary p-4 mx-auto" style={{ maxWidth: 560 }}>
                    <h1 className="h3 mb-3">Gym Check-in</h1>
                    {state.loading && <p className="text-secondary">Checking you in...</p>}
                    {state.error && <div className="text-danger" role="alert">{state.error}</div>}
                    {/* toast-allow: persistent check-in result card required by task */}
                    {state.result && <div className="alert alert-success">
                        Checked in at {new Date(state.result.check_in_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.<br />
                        Plan: {state.result.plan_name}. Valid until {state.result.membership?.end_date}.
                    </div>}
                </div>
            </div>
        </MemberLayout>
    );
}
