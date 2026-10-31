import { useEffect, useState } from "react";
import * as photoService from "../services/photoService";

const POLL_MS = 15000;

/**
 * Counts photos other people uploaded since `since` (an ISO date string).
 * Polls every 15s while the tab is visible, and re-checks the moment the
 * user comes back to it. Resets to 0 whenever `since` moves.
 */
export default function useNewPhotoCount({ eventId, album, since, enabled }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
  }, [eventId, album, since]);

  useEffect(() => {
    if (!enabled || !eventId || !since) return undefined;
    let cancelled = false;

    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await photoService.countNewPhotos(eventId, { since, album });
        if (!cancelled) setCount(res.data.data.count);
      } catch {
        // a failed poll just tries again next tick
      }
    };

    const id = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [eventId, album, since, enabled]);

  return count;
}