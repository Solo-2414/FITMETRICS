import { useEffect, useState } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import { api } from "../../lib/api";
import { VIDEO_CATEGORIES } from "../../lib/videoCategories";
import styles from "./MemberVideoTutorials.module.css";
import InlineError from "../../components/ui/InlineError";
import { SkeletonCards } from "../../components/ui/Skeleton";

const formatDuration = (seconds) => seconds == null ? "No duration" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function MemberVideoTutorials() {
    const [videos, setVideos] = useState([]);
    const [activeFilter, setActiveFilter] = useState("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        const query = new URLSearchParams();
        if (activeFilter) query.set("category", activeFilter);
        if (search.trim()) query.set("search", search.trim());
        Promise.resolve().then(() => {
            if (cancelled) return null;
            setLoading(true);
            return api(`/member/videos${query.toString() ? `?${query}` : ""}`);
        }).then((data) => {
            if (!cancelled && data) { setVideos(data); setError(""); setLoading(false); }
        }).catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
        return () => { cancelled = true; };
    }, [activeFilter, search]);

    return <MemberLayout>
        {error && <InlineError error={error} />}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3"><div><h1 className={styles.pageTitle}>Workout Video Tutorials & Exercise Library</h1><p className={styles.pageDesc}>Curated exercise tutorials to help you master form and train safely.</p></div><div className={styles.totalBadge}>{videos.length} Guides</div></div>
        <div className="mb-4"><div className={styles.searchBoxWrapper}><i className="fa-solid fa-magnifying-glass"></i><input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by exercise name..." /></div></div>
        <div className="d-flex gap-2 overflow-auto mb-4 pb-2" style={{ scrollbarWidth: "none" }}><button className={`${styles.filterPill} ${!activeFilter ? styles.filterActive : ""}`} onClick={() => setActiveFilter("")}>All workouts</button>{VIDEO_CATEGORIES.map((category) => <button key={category} className={`${styles.filterPill} ${activeFilter === category ? styles.filterActive : ""}`} onClick={() => setActiveFilter(category)}>{category}</button>)}</div>
        {loading ? <SkeletonCards count={6} colClass="col-12 col-md-6 col-lg-4" /> : videos.length === 0 ? <div className="text-secondary py-5">No public video tutorials found.</div> : <div className="row g-4">{videos.map((video) => <div className="col-12 col-md-6 col-lg-4" key={video.id}><button className={`${styles.libraryCard} text-start w-100 p-0`} onClick={() => setSelected(video)}>
            <div className={styles.libraryThumbnail} style={video.thumbnailUrl ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, .3), rgba(15, 23, 42, .7)), url(${video.thumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><span className={styles.libraryTag}>{video.category}</span><div className={styles.libraryPlayIcon}><i className="fa-solid fa-play"></i></div><span className={styles.durationBadge}>{formatDuration(video.duration_seconds)}</span></div><div className={styles.libraryContent}><h5 className={styles.libraryTitle}>{video.title}</h5><span className={styles.libraryViews}>{video.difficulty || "Difficulty not set"} · {video.provider}</span></div>
        </button></div>)}</div>}
        {selected && <div className={styles.modalOverlay} onClick={() => setSelected(null)}><div className={styles.videoModal} onClick={(event) => event.stopPropagation()}><button className={styles.modalClose} onClick={() => setSelected(null)} aria-label="Close"><i className="fa-solid fa-xmark"></i></button><iframe src={selected.embedUrl} title={`${selected.title} video tutorial`} allowFullScreen referrerPolicy="strict-origin-when-cross-origin" loading="lazy"></iframe><h2>{selected.title}</h2><p>{selected.category} · {formatDuration(selected.duration_seconds)}</p></div></div>}
    </MemberLayout>;
}
