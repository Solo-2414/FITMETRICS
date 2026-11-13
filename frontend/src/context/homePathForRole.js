export const homePathForRole = (role) =>
    ({
        admin: "/admin/dashboard",
        clerk: "/clerk/dashboard",
        member: "/member/dashboard",
    })[role] ?? "/login";
