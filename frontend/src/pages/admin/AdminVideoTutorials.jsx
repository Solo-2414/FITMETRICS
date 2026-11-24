import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { VIDEO_CATEGORIES } from "../../lib/videoCategories";
import styles from "./AdminVideoTutorials.module.css";
import { Skeleton, SkeletonRegion } from "../../components/ui/Skeleton";
import InlineError from "../../components/ui/InlineError";
import { useToast } from "../../components/ui/toast/useToast";
import { useConfirm } from "../../components/ui/toast/useConfirm";

const emptyForm = { title: "", category: "", difficulty: "", duration: "", video_url: "", visibility: "public" };
const formatDuration = (seconds) => seconds == null ? "No duration" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function AdminVideoTutorials() {
    const toast = useToast();
    const confirm = useConfirm();
    const [videos, setVideos] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        const query = new URLSearchParams();
        if (filter) query.set("category", filter);
        if (search.trim()) query.set("search", search.trim());
        Promise.resolve().then(() => {
            if (cancelled) return null;
            setLoading(true);
            return api(`/admin/videos${query.toString() ? `?${query}` : ""}`);
        }).then((data) => {
            if (!cancelled && data) { setVideos(data); setError(""); setLoading(false); }
        }).catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
        return () => { cancelled = true; };
    }, [filter, search]);

    const counts = useMemo(() => ({
        published: videos.filter((video) => video.visibility === "public").length,
        hidden: videos.filter((video) => video.visibility === "hidden").length,
    }), [videos]);

    const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (video) => {
        setEditing(video);
        setForm({ title: video.title, category: video.category, difficulty: video.difficulty || "", duration: video.duration_seconds == null ? "" : formatDuration(video.duration_seconds), video_url: video.video_url, visibility: video.visibility });
        setShowModal(true);
    };
    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const saved = await api(editing ? `/admin/videos/${editing.id}` : "/admin/videos", { method: editing ? "PATCH" : "POST", body: form });
            setVideos((items) => editing ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
            setShowModal(false);
            setError("");
        } catch (err) { setError(err.message); } finally { setSaving(false); }
    };
    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const toggleVisibility = async (video) => {
        try {
            const updated = await api(`/admin/videos/${video.id}`, { method: "PATCH", body: { visibility: video.visibility === "public" ? "hidden" : "public" } });
            setVideos((items) => items.map((item) => item.id === updated.id ? updated : item));
        } catch (err) { setError(err.message); }
    };
    const remove = async (video) => {
        if (!await confirm({ title: "Delete video?", message: `Delete “${video.title}”? This cannot be undone.`, danger: true })) return;
        try {
            await api(`/admin/videos/${video.id}`, { method: "DELETE" });
            setVideos((items) => items.filter((item) => item.id !== video.id));
            toast.success("Video tutorial deleted.");
        } catch (err) { toast.error(err.message); }
    };

    return <>
        {error && <InlineError error={error} />}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
            <div><h1 className={styles.pageTitle}>Workout Video Tutorials</h1><p className={styles.pageDesc}>Manage YouTube and Vimeo exercise guides for gym members.</p></div>
            <button className={styles.btnPrimary} onClick={openAdd}><i className="fa-solid fa-plus"></i> Add New Video Tutorial</button>
        </div>
        <div className={styles.infoBanner}>
            <div className="d-flex align-items-center gap-3"><div className={styles.bannerIconBox}><i className="fa-solid fa-photo-film"></i></div><div><h4 className={styles.bannerTitle}>{counts.published} Video Tutorials Published</h4><p className={styles.bannerDesc}>{counts.hidden} hidden from members.</p></div></div>
        </div>
        <div className="d-flex flex-column flex-md-row gap-3 mb-4">
            <input className={styles.formInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tutorials..." />
            <select className={styles.formSelect} value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All categories</option>{VIDEO_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
        </div>
        {loading ? <SkeletonRegion label="Loading video tutorials" className="row g-4">{Array.from({ length: 6 }, (_, index) => <div className="col-12 col-md-6 col-xl-4" key={index}><div className={styles.videoCard} aria-hidden="true"><div className={styles.videoThumbnail}><Skeleton w="100%" h="100%" r={0} style={{ position: "absolute", inset: 0 }} /><div className={styles.playButtonWrapper}><i className="fa-solid fa-play"></i></div><Skeleton w={44} h={20} r={4} className={styles.durationBadge} /></div><div className={styles.videoBody}><div className="d-flex justify-content-between align-items-center mb-2"><Skeleton w={76} h={20} r={999} /><Skeleton w={48} h={11} /></div><Skeleton w="82%" h={18} className="mb-2" /><Skeleton w="64%" h={11} /></div><div className={styles.videoFooter}><Skeleton w={52} h={30} r={6} /><div className="d-flex gap-2"><Skeleton w={32} h={32} r={6} /><Skeleton w={32} h={32} r={6} /></div></div></div></div>)}</SkeletonRegion> : videos.length === 0 ? <div className="text-secondary py-5">No video tutorials found.</div> : <div className="row g-4 fm-fade-in">
            {videos.map((video) => <div className="col-12 col-md-6 col-xl-4" key={video.id}><div className={styles.videoCard}>
                <div className={styles.videoThumbnail} style={video.thumbnailUrl ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, .35), rgba(15, 23, 42, .7)), url(${video.thumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><div className={styles.playButtonWrapper}><i className="fa-solid fa-play"></i></div><span className={styles.durationBadge}>{formatDuration(video.duration_seconds)}</span></div>
                <div className={styles.videoBody}><div className="d-flex justify-content-between align-items-center mb-2"><span className={styles.tagBadge}>{video.category}</span><span className="text-secondary small">{video.visibility}</span></div><h3 className={styles.videoTitle}>{video.title}</h3><small className="text-secondary">{video.difficulty || "Difficulty not set"} · {video.provider}</small></div>
                <div className={styles.videoFooter}><button className={styles.btnActionText} onClick={() => openEdit(video)}><i className="fa-solid fa-pen"></i> Edit</button><div className="d-flex gap-2"><button className={styles.btnActionIcon} title={video.visibility === "public" ? "Hide video" : "Publish video"} onClick={() => toggleVisibility(video)}><i className={`fa-regular ${video.visibility === "public" ? "fa-eye-slash" : "fa-eye"}`}></i></button><button className={styles.btnActionIconDanger} title="Delete video" onClick={() => remove(video)}><i className="fa-regular fa-trash-can"></i></button></div></div>
            </div></div>)}
        </div>}
        {showModal && <div className={styles.modalOverlay}><div className={styles.modalContent}><div className={styles.modalHeader}><h3>{editing ? "Edit Video Tutorial" : "Add New Video Tutorial"}</h3><button onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark"></i></button></div><form onSubmit={submit} className={styles.modalBody}>
            {/* field-error: required-field indicator */}
            <label className={styles.formLabel}>Video title <span className="text-danger">*</span></label><input className={styles.formInput} value={form.title} onChange={(event) => update("title", event.target.value)} minLength="3" maxLength="120" required />
            {/* field-error: required-field indicator */}
            <div className="row g-3 mt-1"><div className="col-sm-6"><label className={styles.formLabel}>Category <span className="text-danger">*</span></label><select className={styles.formSelect} value={form.category} onChange={(event) => update("category", event.target.value)} required><option value="">Select category</option>{VIDEO_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div><div className="col-sm-6"><label className={styles.formLabel}>Difficulty</label><select className={styles.formSelect} value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option value="">Not set</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div></div>
            {/* field-error: required-field indicator */}
            <label className={`${styles.formLabel} mt-3`}>Duration (mm:ss)</label><input className={styles.formInput} value={form.duration} onChange={(event) => update("duration", event.target.value)} placeholder="05:30" />
            {/* field-error: required-field indicator */}
            <label className={`${styles.formLabel} mt-3`}>YouTube or Vimeo URL <span className="text-danger">*</span></label><input type="url" className={styles.formInput} value={form.video_url} onChange={(event) => update("video_url", event.target.value)} placeholder="https://youtu.be/..." required />
            <label className={`${styles.formLabel} mt-3`}>Visibility</label><select className={styles.formSelect} value={form.visibility} onChange={(event) => update("visibility", event.target.value)}><option value="public">Published</option><option value="hidden">Hidden</option></select>
            <div className={styles.modalFooter}><button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>Cancel</button><button className={styles.btnPrimaryModal} disabled={saving}>{saving ? "Saving..." : "Save tutorial"}</button></div>
        </form></div></div>}
    </>;
}
