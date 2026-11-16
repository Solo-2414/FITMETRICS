import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { attendanceMethodLabel } from "../../lib/attendanceMethod";
import { useToast } from "../../components/ui/toast/useToast";
import { useConfirm } from "../../components/ui/toast/useConfirm";
import InlineError from "../../components/ui/InlineError";
import styles from "./ClerkAttendance.module.css";
import QRCode from "qrcode";

const today = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
        new Date(),
    );
const time = (value) =>
    value
        ? new Date(value).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
          })
        : "-";

export default function ClerkAttendance() {
    const toast = useToast();
    const confirm = useConfirm();
    const [date, setDate] = useState(today());
    const [search, setSearch] = useState("");
    const [matches, setMatches] = useState([]);
    const [selected, setSelected] = useState(null);
    const [live, setLive] = useState({ people: [], capacity: 100 });
    const [stats, setStats] = useState(null);
    const [log, setLog] = useState({ rows: [], total: 0 });
    const [qrCodes, setQrCodes] = useState([]);
    const [qr, setQr] = useState(null);
    const [validFor, setValidFor] = useState("day");
    const [logSearch, setLogSearch] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const inputRef = useRef(null);

    const load = useCallback(
        async () => {
            try {
                const [floor, dayStats, dayLog, codes] = await Promise.all([
                    api("/clerk/attendance/live"),
                    api(`/clerk/attendance/stats?date=${date}`),
                    api(`/clerk/attendance/log?date=${date}&limit=50`),
                    api("/clerk/attendance/qr-codes"),
                ]);
                setLive(floor);
                setStats(dayStats);
                setLog(dayLog);
                setQrCodes(codes);
                setError("");
            } catch (requestError) {
                setError(requestError.message);
            }
        },
        [date],
    );

    useEffect(() => {
        const initialLoad = window.setTimeout(load, 0);
        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") load();
        }, 10000);
        return () => {
            window.clearTimeout(initialLoad);
            window.clearInterval(interval);
        };
    }, [load]);
    useEffect(() => {
        const handler = (event) => {
            if (
                event.key === "/" &&
                document.activeElement?.tagName !== "INPUT"
            ) {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);
    useEffect(() => {
        if (search.trim().length < 2) return undefined;
        const timer = window.setTimeout(
            () =>
                api(`/clerk/members/lookup?q=${encodeURIComponent(search)}`)
                    .then(setMatches)
                    .catch((requestError) => setError(requestError.message)),
            250,
        );
        return () => window.clearTimeout(timer);
    }, [search, selected, toast]);

    const checkIn = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            await api("/clerk/attendance", {
                method: "POST",
                body: { member_id: selected.id, method: "manual" },
            });
            toast.success(`${selected.full_name} checked in.`);
            setSearch("");
            setMatches([]);
            setSelected(null);
            await load();
            inputRef.current?.focus();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    };
    const checkout = async (id) => {
        try {
            await api(`/clerk/attendance/${id}/check-out`, { method: "POST" });
            toast.success("Member checked out.");
            await load();
        } catch (requestError) {
            setError(requestError.message);
        }
    };
    const checkoutAll = async () => {
        if (
            !(await confirm({
                title: "Check out everyone?",
                message: "Close every open attendance record now.",
                danger: true,
            }))
        )
            return;
        try {
            const result = await api("/clerk/attendance/check-out-all", {
                method: "POST",
            });
            toast.success(
                `${result.count} attendance record${result.count === 1 ? "" : "s"} closed.`,
            );
            await load();
        } catch (requestError) {
            setError(requestError.message);
        }
    };
    const generateQr = async () => {
        setBusy(true);
        try {
            const result = await api("/clerk/attendance/qr-codes", {
                method: "POST",
                body: { label: "Front door", valid_for: validFor },
            });
            setQr({
                ...result,
                image: await QRCode.toDataURL(result.url, {
                    width: 1024,
                    margin: 4,
                }),
            });
            await load();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    };
    const download = (href, filename) => {
        const link = document.createElement("a");
        link.href = href;
        link.download = filename;
        link.click();
    };
    const downloadPoster = async () => {
        if (!qr) return;
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1350;
        const context = canvas.getContext("2d");
        context.fillStyle = "#071522";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#f8fafc";
        context.textAlign = "center";
        context.font = "bold 52px sans-serif";
        context.fillText("Scan to check in", 540, 130);
        const image = new Image();
        image.src = qr.image;
        await new Promise((resolve) => {
            image.onload = resolve;
        });
        context.fillStyle = "#fff";
        context.fillRect(90, 190, 900, 900);
        context.drawImage(image, 120, 220, 840, 840);
        context.font = "bold 30px sans-serif";
        context.fillStyle = "#38bdf8";
        ["1  Scan", "2  Enter your mobile number", "3  Tap Check in"].forEach(
            (line, index) => context.fillText(line, 540, 1170 + index * 48),
        );
        download(
            canvas.toDataURL("image/png"),
            "fitmetrics-checkin-front-door-poster.png",
        );
    };
    const filteredLogRows = log.rows.filter(
        (row) =>
            !logSearch.trim() ||
            `${row.member_name} ${attendanceMethodLabel(row.method).label}`
                .toLowerCase()
                .includes(logSearch.trim().toLowerCase()),
    );

    return (
        <>
            {error && <InlineError error={error} />}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
                <div>
                    <h1 className={styles.pageTitle}>Attendance</h1>
                    <p className={styles.pageDesc}>
                        Fast check-in, live floor, QR station and today&apos;s
                        log
                    </p>
                </div>
                <input
                    type="date"
                    className="form-control bg-dark text-white border-secondary"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    style={{ maxWidth: 170 }}
                />
            </div>
            <div className="row g-3 mb-4">
                {[
                    [
                        "On floor now",
                        `${stats?.on_floor || live.people.length}/${live.capacity}`,
                        "fa-users",
                    ],
                    ["Check-ins today", stats?.check_ins || 0, "fa-chart-line"],
                    ["QR check-ins", stats?.qr_check_ins || 0, "fa-qrcode"],
                    ["Flagged", stats?.flagged_count || 0, "fa-flag"],
                ].map(([label, value, icon]) => (
                    <div className="col-6 col-xl-3" key={label}>
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiHeader}>
                                {label}
                                <i className={`fa-solid ${icon}`}></i>
                            </div>
                            <div className={styles.kpiValue}>{value}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="row g-4 mb-4">
                <div className="col-12 col-xl-7">
                    <div className={styles.actionCard}>
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                                <h3 className={styles.cardTitle}>
                                    Fast Check-in
                                </h3>
                                <p className={styles.cardDesc}>
                                    Search by name, mobile, member code or
                                    email.
                                </p>
                            </div>
                            <span className={styles.badgeOutline}>Desk</span>
                        </div>
                        <div className={styles.inputGroup}>
                            <input
                                ref={inputRef}
                                className={styles.formInputGroup}
                                placeholder="Search member..."
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setSelected(null);
                                }}
                            />
                            <i className="fa-solid fa-magnifying-glass"></i>
                        </div>
                        {matches.length > 0 &&
                            search.trim().length >= 2 &&
                            !selected && (
                                <div className={styles.memberSearchResults}>
                                    {matches.map((member) => (
                                        <button
                                            type="button"
                                            className={
                                                styles.memberSearchResult
                                            }
                                            key={member.id}
                                            onClick={() => {
                                                setSelected(member);
                                                setSearch(member.full_name);
                                                setMatches([]);
                                            }}
                                        >
                                            <strong>{member.full_name}</strong>
                                            <small>
                                                {member.member_code ||
                                                    "No code"}{" "}
                                                · {member.status}
                                            </small>
                                        </button>
                                    ))}
                                </div>
                            )}
                        {selected && (
                            <div className="mt-4 p-3 border border-secondary rounded">
                                <h4 className="text-white">
                                    {selected.full_name}
                                </h4>
                                <p className="text-secondary mb-2">
                                    {selected.plan_name || "No current plan"} ·{" "}
                                    {selected.valid_until || "No expiry"}
                                </p>
                                {["expired", "suspended", "no_plan"].includes(
                                    selected.status,
                                ) ? (
                                    <p className="text-warning mb-0">
                                        This member cannot check in. Please
                                        renew or see the front desk.
                                    </p>
                                ) : (
                                    <button
                                        disabled={busy}
                                        className={styles.btnPrimaryFull}
                                        onClick={checkIn}
                                    >
                                        {" "}
                                        <i className="fa-regular fa-circle-check"></i>{" "}
                                        Check in
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="col-12 col-xl-5">
                    <div
                        className={`${styles.actionCard} ${styles.qrStationCard}`}
                    >
                        <div className="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <div className={styles.recommendedLabel}>
                                    <span className={styles.dotGreen}></span>{" "}
                                    Recommended
                                </div>
                                <h3 className={styles.cardTitle}>QR station</h3>
                                <p className={styles.cardDesc}>
                                    Use a fresh QR for today&apos;s phone
                                    check-ins.
                                </p>
                            </div>
                            <i className="fa-solid fa-qrcode text-info fs-3"></i>
                        </div>
                        <div className="d-flex gap-2">
                            <select
                                className="form-select bg-dark text-white border-secondary"
                                value={validFor}
                                onChange={(event) =>
                                    setValidFor(event.target.value)
                                }
                            >
                                <option value="day">Today</option>
                                <option value="until_revoked">
                                    Until revoked
                                </option>
                                <option value="7d">7 days</option>
                                <option value="30d">30 days</option>
                            </select>
                            <button
                                className={styles.btnPrimaryFull}
                                onClick={generateQr}
                                disabled={busy}
                            >
                                Generate
                            </button>
                        </div>
                        <p className={styles.qrWarning}>
                            Printed QR codes can be photographed and shared.
                            Trusted-device verification protects against that.
                        </p>
                        {qr && (
                            <div className="mt-3 text-center">
                                <img
                                    src={qr.image}
                                    alt="Phone check-in QR code"
                                    className={styles.qrPreview}
                                />
                                <div className="d-flex gap-2 mt-2">
                                    <button
                                        className={styles.btnOutlineAction}
                                        onClick={() =>
                                            download(
                                                qr.image,
                                                "fitmetrics-checkin-front-door.png",
                                            )
                                        }
                                    >
                                        PNG
                                    </button>
                                    <button
                                        className={styles.btnOutlineAction}
                                        onClick={downloadPoster}
                                    >
                                        Poster
                                    </button>
                                    <button
                                        className={styles.btnOutlineAction}
                                        onClick={() =>
                                            navigator.clipboard.writeText(
                                                qr.url,
                                            )
                                        }
                                    >
                                        Copy link
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="row g-4">
                <div className="col-12">
                    <div className={styles.actionCard}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                            <div>
                                <div className={styles.sectionEyebrow}>
                                    <span className={styles.dotGreen}></span>{" "}
                                    Live now
                                </div>
                                <h3 className={styles.cardTitle}>
                                    On the floor now{" "}
                                    <span className={styles.countPill}>
                                        {live.people.length}
                                    </span>
                                </h3>
                            </div>
                            <button
                                className={styles.btnOutlineActionCompact}
                                onClick={checkoutAll}
                            >
                                Check out all
                            </button>
                        </div>
                        {!live.people.length && (
                            <p className="text-secondary mb-0">
                                Nobody is currently inside.
                            </p>
                        )}
                        {live.people.length > 0 && (
                            <div className={styles.floorGrid}>
                                {live.people.map((person) => (
                                    <div
                                        className={styles.floorRow}
                                        key={person.id}
                                    >
                                        <div>
                                            <strong className="text-white d-block">
                                                {person.name}
                                            </strong>
                                            <small className="text-secondary">
                                                {
                                                    attendanceMethodLabel(
                                                        person.method,
                                                    ).label
                                                }{" "}
                                                · {time(person.check_in_at)}{" "}
                                                {person.flagged && (
                                                    <span
                                                        className={
                                                            styles.flagged
                                                        }
                                                    >
                                                        Flagged
                                                    </span>
                                                )}
                                            </small>
                                        </div>
                                        <button
                                            className={
                                                styles.btnOutlineActionCompact
                                            }
                                            onClick={() => checkout(person.id)}
                                        >
                                            Check out
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="col-12">
                    <div className={styles.tablePanel}>
                        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
                            <div>
                                <div className={styles.sectionEyebrow}>
                                    Attendance history
                                </div>
                                <h3 className={styles.cardTitle}>
                                    Today&apos;s log{" "}
                                    <span className={styles.countPill}>
                                        {log.total}
                                    </span>
                                </h3>
                            </div>
                            <div className={styles.logTools}>
                                <div className={styles.searchBox}>
                                    <i className="fa-solid fa-magnifying-glass"></i>
                                    <input
                                        aria-label="Filter attendance log"
                                        placeholder="Filter log..."
                                        value={logSearch}
                                        onChange={(event) =>
                                            setLogSearch(event.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={styles.tableScroll}>
                            <table className={styles.customTable}>
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>In</th>
                                        <th>Out</th>
                                        <th>Method</th>
                                        <th>Status</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!filteredLogRows.length && (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                className={styles.emptyCell}
                                            >
                                                No attendance records.
                                            </td>
                                        </tr>
                                    )}
                                    {filteredLogRows.map((row) => (
                                        <tr key={row.id}>
                                            <td className={styles.memberCell}>
                                                {row.member_name}
                                            </td>
                                            <td>{time(row.check_in_at)}</td>
                                            <td>{time(row.check_out_at)}</td>
                                            <td>
                                                <span
                                                    className={
                                                        styles.methodPill
                                                    }
                                                >
                                                    {
                                                        attendanceMethodLabel(
                                                            row.method,
                                                        ).label
                                                    }
                                                </span>
                                            </td>
                                            <td>
                                                {row.check_out_at ? (
                                                    <span
                                                        className={
                                                            styles.statusComplete
                                                        }
                                                    >
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={
                                                            styles.statusInside
                                                        }
                                                    >
                                                        Inside
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {row.duration_minutes == null
                                                    ? "—"
                                                    : `${row.duration_minutes} min`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-4">
                <h3 className={styles.cardTitle}>Saved QR codes</h3>
                {qrCodes.map((code) => (
                    <div
                        className="d-flex justify-content-between align-items-center border-bottom border-secondary py-2"
                        key={code.id}
                    >
                        <span className="text-white">
                            {code.label}{" "}
                            <small className="text-secondary">
                                · {code.scan_count} scans
                            </small>
                        </span>
                        <button
                            className={styles.btnOutlineAction}
                            onClick={async () => {
                                try {
                                    await api(
                                        `/clerk/attendance/qr-codes/${code.id}/revoke`,
                                        { method: "POST" },
                                    );
                                    toast.success("QR code revoked.");
                                    await load();
                                } catch (requestError) {
                                    setError(requestError.message);
                                }
                            }}
                        >
                            Revoke
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}
