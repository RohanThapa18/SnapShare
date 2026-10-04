import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Copy, Check, Eye, EyeOff, KeyRound } from "lucide-react";

export default function PasscodeCard({ title, description, fetchPasscode, regeneratePasscode, onRequestConfirm }) {
    const [passcode, setPasscode] = useState(null);
    const [needsRegen, setNeedsRegen] = useState(false);
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [loadError, setLoadError] = useState(false);
    useEffect(() => {
        let cancelled = false;
        fetchPasscode()
            .then((res) => {
                if (cancelled) return;
                setPasscode(res.data.data.passcode);
                setNeedsRegen(res.data.data.needsRegeneration);
            })
            .catch((err) => {
                if (!cancelled) {
                    setLoadError(true);
                    toast.error(err.response?.data?.message || "Couldn't load the passcode");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const doRegenerate = async () => {
        setRegenerating(true);
        try {
            const res = await regeneratePasscode();
            setPasscode(res.data.data.passcode);
            setNeedsRegen(false);
            setVisible(true);
            toast.success("New passcode generated");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to generate passcode");
        } finally {
            setRegenerating(false);
        }
    };

    const handleRegenerate = () => {
        if (!passcode) return doRegenerate();
        onRequestConfirm({
            title: "Generate a new passcode?",
            message: "The current one will stop working immediately. People who already joined keep their access.",
            confirmLabel: "Regenerate",
            danger: true,
            onConfirm: doRegenerate,
        });
    };

    const handleCopy = async () => {
        if (!passcode) return;
        try {
            await navigator.clipboard.writeText(passcode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Unable to copy.");
        }
    };

    return (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
            <h3 className="font-medium mb-1 flex items-center gap-1.5">
                <KeyRound size={16} />
                {title}
            </h3>
            <p className="text-xs text-text-muted mb-4">{description}</p>

            {loading ? (
                <div className="skeleton h-11 w-full rounded-lg" />
            ) : loadError ? (
                <p className="text-xs text-error">
                    Couldn't load the passcode. Close and reopen Settings to try again.
                </p>
            ) : needsRegen ? (
                <div className="flex flex-col gap-2">
                    <p className="text-xs text-text-muted">No passcode has been set for this yet. Generate one to start sharing it.</p>
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition w-fit"
                    >
                        {regenerating ? "Generating..." : "Generate Passcode"}
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center justify-between bg-surface-sunken border border-border rounded-lg px-4 py-2.5 font-mono text-lg tracking-[0.3em] text-primary">
                            {visible ? passcode : "••••••"}
                            <button
                                onClick={() => setVisible((v) => !v)}
                                className="text-text-muted hover:text-primary transition"
                                aria-label={visible ? "Hide passcode" : "Show passcode"}
                            >
                                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-surface-hover transition shrink-0"
                            aria-label="Copy passcode"
                        >
                            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                        </button>
                    </div>
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="text-xs text-text-muted hover:text-error transition mt-3"
                    >
                        {regenerating ? "Generating..." : "Generate a new passcode instead"}
                    </button>
                </>
            )}
        </div>
    );
}