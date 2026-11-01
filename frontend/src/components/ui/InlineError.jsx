import { getFriendlyError } from "../../lib/api";
import styles from "./InlineError.module.css";

export default function InlineError({ error, onRetry }) {
    return (
        <div className={styles.error} role="alert">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
            <span>{getFriendlyError(error)}</span>
            {onRetry && <button type="button" onClick={onRetry}>Try again</button>}
        </div>
    );
}
