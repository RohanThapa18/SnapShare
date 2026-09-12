import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import * as eventService from "../services/eventService";

/**
 * Reached by scanning an organizer's photographer QR code, which links
 * to /join-photographer/:eventId/:photographerToken. Auto-joins the
 * scanning user as an official photographer for the event.
 */
export default function JoinEventAsPhotographer() {
  const { eventId, photographerToken } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("joining");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    eventService
      .joinEventAsPhotographer(eventId, photographerToken)
      .then(() => {
        setStatus("success");
        toast.success("Joined as photographer!");
        setTimeout(() => navigate(`/events/${eventId}`), 1000);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.response?.data?.message || "Failed to join as photographer");
      });
  }, [eventId, photographerToken]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center">
        {status === "joining" && <p className="text-text-muted">Joining as photographer...</p>}
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
