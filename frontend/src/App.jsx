import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AOS from "aos";
import "aos/dist/aos.css";
import "./App.css";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";

import MemberDashboard from "./pages/member/MemberDashboard";
import MemberProfile from "./pages/member/MemberProfile";
import MemberWorkoutPlans from "./pages/member/MemberWorkoutPlans";
import MemberMembership from "./pages/member/MemberMembership";
import MemberAttendance from "./pages/member/MemberAttendance";
import MemberBilling from "./pages/member/MemberBilling";
import MemberVideoTutorials from "./pages/member/MemberVideoTutorials";
import MemberNotifications from "./pages/member/MemberNotifications";

export default function App() {
    useEffect(() => {
        AOS.init({
            duration: 800,
            once: false,
            mirror: true,
            easing: "ease-out-cubic",
        });
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                <Route path="/member/dashboard" element={<MemberDashboard />} />
                <Route path="/member/profile" element={<MemberProfile />} />
                <Route
                    path="/member/workout-plans"
                    element={<MemberWorkoutPlans />}
                />
                <Route
                    path="/member/membership"
                    element={<MemberMembership />}
                />
                <Route
                    path="/member/attendance"
                    element={<MemberAttendance />}
                />
                <Route path="/member/billing" element={<MemberBilling />} />
                <Route
                    path="/member/video-tutorials"
                    element={<MemberVideoTutorials />}
                />
                <Route
                    path="/member/notifications"
                    element={<MemberNotifications />}
                />
            </Routes>
        </BrowserRouter>
    );
}
