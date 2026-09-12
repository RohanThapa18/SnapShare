import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import * as eventService from "../services/eventService";

/**
 * Reached by scanning an organizer's participant QR code, which links to
 * /join/:eventId/:joinToken. Auto-joins on load since both pieces of
 * information needed are already in the URL.
 */
export default function JoinEvent() {
  const { eventId, joinToken } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("joining"); // joining | success | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    eventService
      .joinEvent(eventId, { joinToken })
      .then(() => {
        setStatus("success");
        toast.success("Joined event!");
        setTimeout(() => navigate(`/events/${eventId}`), 1000);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.response?.data?.message || "Failed to join event");
      });
  }, [eventId, joinToken]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center">
        {status === "joining" && <p className="text-text-muted">Joining event...</p>}
        {status === "success" && <p className="text-success">Joined! Redirecting...</p>}
        {status === "error" && (
          <>
            <p className="text-error mb-4">{errorMessage}</p>
            <Link to="/dashboard" className="text-primary hover:underline">
              Back to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
