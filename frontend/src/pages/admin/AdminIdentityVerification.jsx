import { useCallback, useEffect, useMemo, useState } from "react";
import IdentityCapture from "../../components/identity/IdentityCapture";
import InlineError from "../../components/ui/InlineError";
import { Loadable, SkeletonTable } from "../../components/ui/Skeleton";
import { useMinimumLoading } from "../../hooks/useApiData";
import { api } from "../../lib/api";
import { toastError, useToast } from "../../components/ui/toast/useToast";
import { useConfirm } from "../../components/ui/toast/useConfirm";
import styles from "./AdminIdentityVerification.module.css";

const statusOptions = [
    ["needs_review", "Needs review"],
    ["pending", "Pending"],
    ["verified", "Verified"],
    ["rejected", "Rejected"],
    ["expired", "Expired"],
    ["all", "All records"],
];
const idTypes = [
    ["national_id", "Philippine National ID"],
    ["drivers_license", "Driver’s license"],
    ["passport", "Passport"],
    ["postal_id", "Postal ID"],
    ["voters_id", "Voter’s ID"],
    ["other", "Other government ID"],
];
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
});
const statusLabels = Object.fromEntries(statusOptions);

function formatDate(value) {
    return value ? dateFormatter.format(new Date(value)) : "—";
}

function VerificationStatus({ status }) {
    return <span className={`${styles.status} ${styles[`status_${status}`] || ""}`}>{statusLabels[status] || status}</span>;
}

export default function AdminIdentityVerification() {
    const [config, setConfig] = useState(null);
    const [configError, setConfigError] = useState("");
    const [memberSearch, setMemberSearch] = useState("");
    const [members, setMembers] = useState([]);
    const [member, setMember] = useState(null);
    const [memberLoading, setMemberLoading] = useState(false);
    const [memberError, setMemberError] = useState("");
    const [memberSearchAttempt, setMemberSearchAttempt] = useState(0);
    const [idType, setIdType] = useState("national_id");
    const [idLast4, setIdLast4] = useState("");
    const [idImage, setIdImage] = useState(null);
    const [selfieImage, setSelfieImage] = useState(null);
    const [consentGiven, setConsentGiven] = useState(false);
    const [livenessCompleted, setLivenessCompleted] = useState(false);
    const [captureBusy, setCaptureBusy] = useState(false);
    const [manualReason, setManualReason] = useState("");
    const [manualBusy, setManualBusy] = useState(false);
    const [queue, setQueue] = useState({ rows: [], total: 0, page: 1, limit: 20 });
    const [statusFilter, setStatusFilter] = useState("needs_review");
    const [queuePage, setQueuePage] = useState(1);
    const [queueLoading, setQueueLoading] = useState(true);
    const [queueError, setQueueError] = useState("");
    const [selected, setSelected] = useState(null);
    const [images, setImages] = useState(null);
    const [imagesLoading, setImagesLoading] = useState(false);
    const [imagesError, setImagesError] = useState("");
    const [reviewReason, setReviewReason] = useState("");
    const [reviewBusy, setReviewBusy] = useState(false);
    const toast = useToast();
    const confirm = useConfirm();
    const showQueueSkeleton = useMinimumLoading(queueLoading && !queue.rows.length, 300);
    const memberQuery = memberSearch.trim();

    const fetchConfig = useCallback(() => api("/admin/identity-verifications/config"), []);

    const loadConfig = useCallback(async () => {
        try {
            setConfig(await fetchConfig());
            setConfigError("");
        } catch (error) {
            setConfigError(error.message);
        }
    }, [fetchConfig]);

    const fetchQueue = useCallback(() => api(`/admin/identity-verifications?status=${statusFilter}&page=${queuePage}&limit=20`), [queuePage, statusFilter]);

    const loadQueue = useCallback(async () => {
        try {
            setQueue(await fetchQueue());
            setQueueError("");
        } catch (error) {
            setQueueError(error.message);
        } finally {
            setQueueLoading(false);
        }
    }, [fetchQueue]);

    const refreshQueueAtTop = useCallback(async (status) => {
        setQueueLoading(true);
        setQueueError("");
        if (statusFilter !== status || queuePage !== 1) {
            setStatusFilter(status);
            setQueuePage(1);
            return;
        }
        await loadQueue();
    }, [loadQueue, queuePage, statusFilter]);

    useEffect(() => {
        let active = true;
        fetchConfig()
            .then((result) => {
                if (!active) return;
                setConfig(result);
                setConfigError("");
            })
            .catch((error) => {
                if (active) setConfigError(error.message);
            });
        return () => { active = false; };
    }, [fetchConfig]);

    useEffect(() => {
        let active = true;
        fetchQueue()
            .then((result) => {
                if (!active) return;
                setQueue(result);
                setQueueError("");
            })
            .catch((error) => {
                if (active) setQueueError(error.message);
            })
            .finally(() => {
                if (active) setQueueLoading(false);
            });
        return () => { active = false; };
    }, [fetchQueue]);

    useEffect(() => {
        if (memberQuery.length < 2 || (member && (member.full_name || member.email) === memberQuery)) {
            return undefined;
        }
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setMemberLoading(true);
            setMemberError("");
            try {
                const result = await api(`/admin/identity-verifications/members?search=${encodeURIComponent(memberQuery)}`);
                if (!cancelled) setMembers(result);
            } catch (error) {
                if (!cancelled) setMemberError(error.message);
            } finally {
                if (!cancelled) setMemberLoading(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [member, memberQuery, memberSearchAttempt]);

    const consentText = useMemo(() => config
        ? `I confirm the member has explicitly agreed to have these images checked for identity matching. The ID and selfie will be sent securely to Face++ and OCR.space for face comparison and name reading, then scheduled for deletion from private storage after up to ${config.retention_days} days. Cleanup runs every 15 minutes. Stored images are available only to administrators; each provider also receives images for processing under its own privacy policy. A human admin must review the result; an automated score alone never approves or rejects.`
        : "Loading the current consent and image-retention notice…", [config]);

    const selectMember = (item) => {
        setMember(item);
        setMemberSearch(item.full_name || item.email || "");
        setMembers([]);
        setMemberLoading(false);
    };

    const resetCapture = () => {
        setIdImage(null);
        setSelfieImage(null);
        setIdLast4("");
        setConsentGiven(false);
        setLivenessCompleted(false);
    };

    const submitCapture = async (event) => {
        event.preventDefault();
        if (!member || !idImage || !selfieImage || !consentGiven || !config) {
            toast.error("Choose a member, record consent, and provide both images before submitting.");
            return;
        }
        if (!/^[a-z0-9]{4}$/i.test(idLast4.trim())) {
            toast.error("Enter only the final four letters or numbers of the ID.");
            return;
        }
        setCaptureBusy(true);
        const formData = new FormData();
        formData.append("member_id", member.id);
        formData.append("consent", "true");
        formData.append("consent_version", config.consent_version);
        formData.append("id_type", idType);
        formData.append("id_last4", idLast4.trim());
        formData.append("liveness_check_completed", String(livenessCompleted));
        formData.append("id_image", idImage);
        formData.append("selfie_image", selfieImage);
        try {
            const result = await api("/admin/identity-verifications", { method: "POST", body: formData });
            if (result.automated_check === "complete") {
                toast.success("Images saved. Human admin review is required; the automated result does not decide the outcome.");
            } else if (result.automated_check === "manual_only") {
                toast.warning("Images saved for manual review. Face matching was skipped because camera liveness was not completed.");
            } else {
                toast.warning("Images saved for manual review because the automated check was unavailable.");
            }
            resetCapture();
            setMember(null);
            setMemberSearch("");
            await refreshQueueAtTop("needs_review");
        } catch (error) {
            toast.error(toastError(error));
        } finally {
            setCaptureBusy(false);
        }
    };

    const submitManualVerification = async (event) => {
        event.preventDefault();
        if (!member || manualReason.trim().length < 5) {
            toast.error("Choose a member and explain the in-person ID check in at least five characters.");
            return;
        }
        const accepted = await confirm({
            title: "Record manual verification?",
            message: `Confirm that you checked ${member.full_name || "this member"}’s physical ID in person. No images will be stored.`,
            confirmLabel: "Record verification",
        });
        if (!accepted) return;
        setManualBusy(true);
        try {
            await api("/admin/identity-verifications/manual", {
                method: "POST",
                body: { member_id: member.id, reason: manualReason },
            });
            toast.success("In-person verification recorded.");
            setManualReason("");
            setMember(null);
            setMemberSearch("");
            await refreshQueueAtTop("verified");
        } catch (error) {
            toast.error(toastError(error));
        } finally {
            setManualBusy(false);
        }
    };

    const loadImages = async (verification) => {
        setImages(null);
        setImagesError("");
        setImagesLoading(true);
        try {
            setImages(await api(`/admin/identity-verifications/${verification.id}/images`));
        } catch (error) {
            setImagesError(error.message);
        } finally {
            setImagesLoading(false);
        }
    };

    const openRecord = async (verification) => {
        setSelected(verification);
        setReviewReason("");
        setImagesError("");
        if (verification.id_type && !verification.images_deleted_at) await loadImages(verification);
    };

    const submitReview = async (decision) => {
        if (reviewReason.trim().length < 5) {
            toast.error("Enter a review reason of at least five characters.");
            return;
        }
        const accepted = await confirm({
            title: decision === "verified" ? "Approve identity verification?" : "Reject identity verification?",
            message: "Confirm that your decision is based on the available evidence and not on an automated score alone.",
            confirmLabel: decision === "verified" ? "Approve" : "Reject",
            danger: decision === "rejected",
        });
        if (!accepted) return;
        setReviewBusy(true);
        try {
            await api(`/admin/identity-verifications/${selected.id}/review`, {
                method: "POST",
                body: { decision, reason: reviewReason },
            });
            toast.success(decision === "verified" ? "Identity verification approved." : "Identity verification rejected.");
            setSelected(null);
            setImages(null);
            setQueueLoading(true);
            await loadQueue();
        } catch (error) {
            toast.error(toastError(error));
        } finally {
            setReviewBusy(false);
        }
    };

    const deleteImages = async () => {
        const accepted = await confirm({
            title: "Delete identity images?",
            message: "This permanently deletes the stored ID and selfie. The verification result and audit history remain.",
            confirmLabel: "Delete images",
            danger: true,
        });
        if (!accepted) return;
        try {
            await api(`/admin/identity-verifications/${selected.id}/images`, { method: "DELETE" });
            toast.success("Identity images deleted. The verification result was retained.");
            setImages(null);
            setImagesError("");
            setSelected((current) => ({ ...current, images_deleted_at: new Date().toISOString() }));
            setQueueLoading(true);
            await loadQueue();
        } catch (error) {
            toast.error(toastError(error));
        }
    };

    const currentPageRows = queue.rows || [];
    const totalPages = Math.max(1, Math.ceil(queue.total / queue.limit));

    return (
        <div className={styles.page}>
            <header className={styles.pageHeader}>
                <h1>Identity Verification</h1>
                <p>Admin-only ID and face review. No member or clerk account can capture, view, or review these records.</p>
            </header>

            {configError && <InlineError error={configError} onRetry={loadConfig} />}

            <section className={styles.panel}>
                <div className={styles.panelHeading}>
                    <div>
                        <h2>Start a verification</h2>
                        <p>Run a consented photo check or record an in-person manual check without storing images.</p>
                    </div>
                </div>
                <div className={styles.memberPicker}>
                    <label htmlFor="identity-member-search">Member</label>
                    <input
                        id="identity-member-search"
                        type="search"
                        value={memberSearch}
                        onChange={(event) => {
                            setMemberSearch(event.target.value);
                            setMember(null);
                            setMembers([]);
                            setMemberError("");
                            setMemberLoading(false);
                        }}
                        placeholder="Search a member by name or email"
                        autoComplete="off"
                    />
                    {memberLoading && <span className={styles.helper}>Searching members…</span>}
                    {memberError && <InlineError error={memberError} onRetry={() => setMemberSearchAttempt((value) => value + 1)} />}
                    {members.length > 0 && <ul className={styles.memberResults} aria-label="Matching members">
                        {members.map((item) => <li key={item.id}>
                            <button type="button" onClick={() => selectMember(item)}>
                                <strong>{item.full_name || "Unnamed member"}</strong>
                                <span>{item.email}</span>
                            </button>
                        </li>)}
                    </ul>}
                    {member && <p className={styles.selectedMember}>Selected: <strong>{member.full_name || member.email}</strong></p>}
                    {!member && memberQuery.length >= 2 && !memberLoading && !memberError && !members.length && <span className={styles.helper}>No matching members found.</span>}
                </div>

                <form className={styles.captureForm} onSubmit={submitCapture}>
                    <div className={styles.formGrid}>
                        <label>
                            ID type
                            <select value={idType} onChange={(event) => setIdType(event.target.value)}>
                                {idTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                            </select>
                        </label>
                        <label>
                            Last 4 characters only
                            <input value={idLast4} onChange={(event) => setIdLast4(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 4))} maxLength={4} autoComplete="off" placeholder="AB12" />
                        </label>
                    </div>

                    <div className={styles.consentBox}>
                        <p>{consentText}</p>
                        <p className={styles.transferNotice}>
                            Liveness runs locally in the browser; live video frames are not sent to MediaPipe or Google. Only the captured still images are sent to the approved Face++ and OCR.space services.
                            {" "}<a href="https://www.faceplusplus.com/privacy-policy/" target="_blank" rel="noreferrer">Face++ privacy policy</a>
                            {" · "}<a href="https://ocr.space/privacypolicy" target="_blank" rel="noreferrer">OCR.space privacy policy</a>
                        </p>
                        <label className={styles.consentLabel}>
                            <input type="checkbox" checked={consentGiven} onChange={(event) => setConsentGiven(event.target.checked)} disabled={!config} />
                            <span>I confirm that the member has read this notice and explicitly consented to this processing.</span>
                        </label>
                    </div>

                    <IdentityCapture
                        consentGiven={consentGiven && Boolean(config) && Boolean(member)}
                        idImage={idImage}
                        selfieImage={selfieImage}
                        onIdImageChange={setIdImage}
                        onSelfieImageChange={setSelfieImage}
                        onLivenessChange={setLivenessCompleted}
                    />
                    {livenessCompleted && <p className={styles.livenessNote}><i className="fa-solid fa-circle-check" aria-hidden="true"></i> Basic camera liveness completed locally. It cannot reliably stop replay video, masks, or advanced spoofing.</p>}
                    <button className={styles.primaryButton} type="submit" disabled={captureBusy || !config || !member || !consentGiven || !idImage || !selfieImage}>
                        {captureBusy ? "Submitting…" : "Submit for admin review"}
                    </button>
                </form>

                <form className={styles.manualForm} onSubmit={submitManualVerification}>
                    <h3>Manual in-person verification</h3>
                    <p>Use when an admin checks the physical ID directly. This stores the result and reason only—no ID image, selfie, OCR, or face comparison.</p>
                    <label htmlFor="identity-manual-reason">Reason (do not enter ID numbers)</label>
                    <textarea id="identity-manual-reason" value={manualReason} onChange={(event) => setManualReason(event.target.value)} maxLength={500} rows={3} placeholder="Describe the in-person check and decision" />
                    <button className={styles.secondaryButton} type="submit" disabled={manualBusy || !member || manualReason.trim().length < 5}>
                        {manualBusy ? "Saving…" : "Record in-person verification"}
                    </button>
                </form>
            </section>

            <section className={styles.panel}>
                <div className={styles.queueHeader}>
                    <div>
                        <h2>Review queue</h2>
                        <p>{queue.total} record{queue.total === 1 ? "" : "s"} · Images are private and access is audited</p>
                    </div>
                    <label>
                        Filter status
                        <select value={statusFilter} onChange={(event) => { setQueueLoading(true); setQueueError(""); setQueuePage(1); setStatusFilter(event.target.value); }}>
                            {statusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                        </select>
                    </label>
                </div>
                {queueError && <InlineError error={queueError} onRetry={() => { setQueueLoading(true); void loadQueue(); }} />}
                <Loadable loading={showQueueSkeleton} skeleton={<SkeletonTable rows={4} cols={6} headers={["Member", "Status", "ID", "Face score", "Created", "Review"]} cellTypes={["text", "badge", "text", "text", "text", "action"]} />}>
                    <div className={`${styles.tableWrap} ${queueLoading ? "fm-refreshing" : ""}`}>
                        <table className={styles.table}>
                            <thead><tr><th>Member</th><th>Status</th><th>ID</th><th>Face score</th><th>Created</th><th>Review</th></tr></thead>
                            <tbody>
                                {currentPageRows.map((row) => <tr key={row.id}>
                                    <td><strong>{row.member?.full_name || "Unnamed member"}</strong><small>{row.member?.email || "No email"}</small></td>
                                    <td><VerificationStatus status={row.status} /></td>
                                    <td>{row.id_type ? `${idTypes.find(([value]) => value === row.id_type)?.[1] || "Government ID"} · **** ${row.id_last4}` : "Manual check"}</td>
                                    <td>{row.score == null ? "—" : `${Number(row.score).toFixed(2)} / 100`}</td>
                                    <td>{formatDate(row.created_at)}</td>
                                    <td><button className={styles.textButton} type="button" onClick={() => void openRecord(row)}>{row.id_type && !row.images_deleted_at ? "Review images" : "View record"}</button></td>
                                </tr>)}
                                {!queueLoading && !currentPageRows.length && <tr><td className={styles.empty} colSpan={6}>No identity records match this filter.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Loadable>
                {totalPages > 1 && <div className={styles.pagination}>
                    <span>Page {queuePage} of {totalPages}</span>
                    <div>
                        <button type="button" className={styles.textButton} disabled={queueLoading || queuePage <= 1} onClick={() => { setQueueLoading(true); setQueuePage((page) => page - 1); }}>Previous</button>
                        <button type="button" className={styles.textButton} disabled={queueLoading || queuePage >= totalPages} onClick={() => { setQueueLoading(true); setQueuePage((page) => page + 1); }}>Next</button>
                    </div>
                </div>}
            </section>

            {selected && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); setImages(null); } }}>
                <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="identity-review-title">
                    <button type="button" className={styles.closeButton} aria-label="Close verification review" onClick={() => { setSelected(null); setImages(null); }}>×</button>
                    <h2 id="identity-review-title">Review identity images</h2>
                    <p className={styles.modalMember}>{selected.member?.full_name || "Unnamed member"} · **** {selected.id_last4 || "—"}</p>
                    <div className={styles.resultSummary}>
                        <span><strong>Status</strong><VerificationStatus status={selected.status} /></span>
                        <span><strong>Face score</strong>{selected.score == null ? "Unavailable" : `${Number(selected.score).toFixed(2)} / 100`}</span>
                        <span><strong>Name on ID</strong>{selected.id_name_match == null ? "Unavailable" : selected.id_name_match ? "Possible match" : "No match"}</span>
                    </div>
                    {!selected.images_deleted_at && selected.id_type && <>
                        {imagesLoading && <p role="status">Loading protected images…</p>}
                        {imagesError && <InlineError error={imagesError} onRetry={() => void loadImages(selected)} />}
                        {!imagesLoading && !imagesError && <button type="button" className={styles.textButton} onClick={() => void loadImages(selected)}>{images ? "Refresh signed image links" : "Load protected images"}</button>}
                        {images && <div className={styles.reviewImages}>
                            <figure><img src={images.id_image_url} alt="Member government ID front" /><figcaption>Government ID front · **** {selected.id_last4}</figcaption></figure>
                            <figure><img src={images.selfie_image_url} alt="Member selfie" /><figcaption>Member selfie</figcaption></figure>
                        </div>}
                    </>}
                    {selected.images_deleted_at && <p className={styles.helper}>Images were deleted on {formatDate(selected.images_deleted_at)}. Verification result retained.</p>}
                    {selected.review_reason && <p className={styles.reason}><strong>Previous review reason:</strong> {selected.review_reason}</p>}
                    {selected.status === "needs_review" && <div className={styles.reviewActions}>
                        <label htmlFor="identity-review-reason">Decision reason (required; do not enter ID numbers)</label>
                        <textarea id="identity-review-reason" value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} rows={3} maxLength={500} />
                        <div>
                            <button type="button" className={styles.rejectButton} disabled={reviewBusy || reviewReason.trim().length < 5} onClick={() => void submitReview("rejected")}>Reject</button>
                            <button type="button" className={styles.primaryButton} disabled={reviewBusy || reviewReason.trim().length < 5} onClick={() => void submitReview("verified")}>Approve</button>
                        </div>
                    </div>}
                    {selected.id_type && !selected.images_deleted_at && <button type="button" className={styles.deleteButton} onClick={() => void deleteImages()}>Delete images now</button>}
                </section>
            </div>}
        </div>
    );
}
