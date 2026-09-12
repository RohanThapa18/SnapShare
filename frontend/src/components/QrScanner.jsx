import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * Renders a live camera feed and scans for QR codes. Calls onScan once
 * with the decoded text (expected to be a full SnapShare join URL) and
 * stops scanning immediately after — the parent decides what to do
 * with the result (usually navigate() straight to the decoded path).
 */
export default function QrScanner({ onScan, onError }) {
  const containerId = useRef(`qr-scanner-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId.current);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          onScan(decodedText);
          scanner.stop().catch(() => {});
        },
        () => {
          // per-frame "no QR found" callback — expected constantly, ignore
        }
      )
      .catch((err) => {
        onError?.(err?.message || "Could not access camera");
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <div id={containerId.current} className="w-full" />
    </div>
  );
}
