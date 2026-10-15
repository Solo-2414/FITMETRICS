import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import AOS from "aos";
import "aos/dist/aos.css";
import "./App.css";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import MemberDashboard from "./pages/member/MemberDashboard";
import MemberProfile from "./pages/member/MemberProfile";
import MemberWorkoutPlans from "./pages/member/MemberWorkoutPlans";
import MemberMembership from "./pages/member/MemberMembership";
import MemberAttendance from "./pages/member/MemberAttendance";
import MemberBilling from "./pages/member/MemberBilling";
import MemberVideoTutorials from "./pages/member/MemberVideoTutorials";
import MemberNotifications from "./pages/member/MemberNotifications";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminChurnAnalytics from "./pages/admin/AdminChurnAnalytics";
import AdminPredictiveAnalytics from "./pages/admin/AdminPredictiveAnalytics";
import AdminAttendanceAnalysis from "./pages/admin/AdminAttendanceAnalysis";
import AdminMembershipPlans from "./pages/admin/AdminMembershipPlans";
import AdminManageUsers from "./pages/admin/AdminManageUsers";
import AdminReports from "./pages/admin/AdminReports";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminVideoTutorials from "./pages/admin/AdminVideoTutorials";
import AdminSettings from "./pages/admin/AdminSettings";

import ClerkDashboard from "./pages/clerk/ClerkDashboard";
import ClerkMemberRegistration from "./pages/clerk/ClerkMemberRegistration";
import ClerkMemberInformation from "./pages/clerk/ClerkMemberInformation";
import ClerkMembership from "./pages/clerk/ClerkMembership";
import ClerkPayments from "./pages/clerk/ClerkPayments";
import ClerkAttendance from "./pages/clerk/ClerkAttendance";
import ClerkNotifications from "./pages/clerk/ClerkNotifications";
import ClerkSettings from "./pages/clerk/ClerkSettings";

function AOSRefresh() {
    const location = useLocation();
    useEffect(() => {
        AOS.refresh();
    }, [location]);
    return null;
}

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
        <AuthProvider>
        <BrowserRouter>
            <AOSRefresh />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                <Route element={<ProtectedRoute roles={["member"]} />}>
                <Route path="/member/dashboard" element={<MemberDashboard />} />
                <Route path="/member/profile" element={<MemberProfile />} />
                <Route
                    path="/member/workout-plans"
                    element={<MemberWorkoutPlans />}
                />
                <Route
                    path="/member/video-tutorials"
                    element={<MemberVideoTutorials />}
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
                    path="/member/notifications"
                    element={<MemberNotifications />}
                />

                </Route>

                <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route
                    path="/admin/churn-analytics"
                    element={<AdminChurnAnalytics />}
                />
                <Route
                    path="/admin/predictive-analytics"
                    element={<AdminPredictiveAnalytics />}
                />
                <Route
                    path="/admin/attendance-analysis"
                    element={<AdminAttendanceAnalysis />}
                />
                <Route
                    path="/admin/membership-plans"
                    element={<AdminMembershipPlans />}
                />
                <Route
                    path="/admin/manage-users"
                    element={<AdminManageUsers />}
                />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route
                    path="/admin/announcements"
                    element={<AdminAnnouncements />}
                />
                <Route
                    path="/admin/video-tutorials"
                    element={<AdminVideoTutorials />}
                />
                <Route path="/admin/settings" element={<AdminSettings />} />

                </Route>

                <Route element={<ProtectedRoute roles={["clerk"]} />}>
                <Route path="/clerk/dashboard" element={<ClerkDashboard />} />
                <Route
                    path="/clerk/member-registration"
                    element={<ClerkMemberRegistration />}
                />
                <Route
                    path="/clerk/member-information"
                    element={<ClerkMemberInformation />}
                />
                <Route path="/clerk/membership" element={<ClerkMembership />} />
                <Route path="/clerk/payments" element={<ClerkPayments />} />
                <Route path="/clerk/attendance" element={<ClerkAttendance />} />
                <Route
                    path="/clerk/notification"
                    element={<ClerkNotifications />}
                />
                <Route path="/clerk/settings" element={<ClerkSettings />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
        </AuthProvider>
    );
}
