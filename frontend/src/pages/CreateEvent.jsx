
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Copy,
  Check,
  Camera,
  ImagePlus,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import * as eventService from "../services/eventService";
import BackButton from "../components/BackButton";
import { nowLocalInput } from "../utils/datetime";

export default function CreateEvent() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    date: "",
    expiryDate: "",
  });

  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [joinQr, setJoinQr] = useState("");

  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");

  useEffect(() => {
    if (!coverPreview) return;

    return () => {
      URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("Image size must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setCoverImage(file);
    setCoverPreview(previewUrl);
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setCoverPreview("");

    const input = document.getElementById("event-cover-input");

    if (input) {
      input.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Please enter an event name.");
      return;
    }

    if (!form.date || !form.expiryDate) {
      toast.error("Please select the event and expiry dates.");
      return;
    }

    const eventDate = new Date(form.date);
    const expiryDate = new Date(form.expiryDate);

    if (
      Number.isNaN(eventDate.getTime()) ||
      Number.isNaN(expiryDate.getTime())
    ) {
      toast.error("Please enter valid dates.");
      return;
    }

    if (expiryDate <= eventDate) {
      toast.error("Expiry date must be after the event date.");
      return;
    }

    try {
      setLoading(true);

      const res = await eventService.createEvent(
        {
          title: form.name.trim(),
          description: form.description.trim(),
          location: form.location.trim(),
          date: eventDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
        },
        coverImage
      );

      const payload = res?.data ?? res;
      const responseData = payload?.data ?? payload;

      const event = responseData?.event ?? null;
      const eventPasscode = responseData?.passcode ?? "";

      if (!event?._id && !event?.id) {
        throw new Error(
          "The event was created, but the server response was incomplete."
        );
      }

      const eventId = event._id || event.id;

      setCreatedEvent(event);
      setPasscode(eventPasscode);

      if (event.joinToken) {
        setJoinQr(
          `${window.location.origin}/join/${eventId}/${event.joinToken}`
        );
      } else if (event.joinUrl) {
        setJoinQr(event.joinUrl);
      } else {
        setJoinQr("");
      }

      toast.success("Event created successfully!");
    } catch (error) {
      console.error("Create event error:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to create event."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Unable to copy.");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

  const dateInputClass =
    "w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 outline-none transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

  const labelClass =
    "mb-2 block text-sm font-medium text-slate-700";

  // Success screen
  if (createdEvent) {
    const eventId = createdEvent._id || createdEvent.id;

    return (
      <div className="min-h-screen bg-[#f7f8fc] px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_12px_38px_rgba(15,23,42,0.10)] sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 transition-transform duration-300 hover:scale-105">
            <Check className="h-8 w-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Event Created!
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Your event has been created successfully.
          </p>

          {createdEvent.coverImageUrl && (
            <div className="mt-5 overflow-hidden rounded-xl">
              <img
                src={createdEvent.coverImageUrl}
                alt="Event cover"
                className="h-48 w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>
          )}

          <div className="mt-6 space-y-4 text-left">
            {passcode && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-200 hover:border-indigo-200">
                <p className="mb-2 text-sm text-slate-500">
                  Event passcode
                </p>

                <div className="flex items-center justify-between gap-3">
                  <span className="break-all font-mono text-lg font-semibold text-slate-900">
                    {passcode}
                  </span>

                  <button
                    type="button"
                    onClick={() => copyText(passcode)}
                    className="rounded-lg p-2 text-slate-500 transition-all duration-200 hover:bg-indigo-100 hover:text-indigo-700 active:scale-95"
                    aria-label="Copy passcode"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            )}

            {joinQr && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center transition-colors duration-200 hover:border-indigo-200">
                <p className="mb-3 text-sm font-medium text-slate-600">
                  Event QR code
                </p>

                <div className="inline-block rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                  <QRCodeSVG value={joinQr} size={180} />
                </div>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(joinQr)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#26345f] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1d284a] hover:shadow-md active:translate-y-0"
                  >
                    <Copy size={15} />
                    Copy event link
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 hover:shadow-sm active:translate-y-0"
            >
              Go to Dashboard
            </button>

            <button
              type="button"
              onClick={() => navigate(`/events/${eventId}`)}
              className="flex-1 rounded-xl bg-[#26345f] px-5 py-3 font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1d284a] hover:shadow-md active:translate-y-0"
            >
              View Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create event form
  return (
    <div className="min-h-screen bg-[#f7f8fc] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="mb-7 animate-[fadeInUp_.5s_ease-out]">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 transition-colors duration-200 sm:text-3xl">
            Create Event
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Bring your memories together. Set up your event below.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="animate-[fadeInUp_.6s_ease-out] space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_12px_38px_rgba(15,23,42,0.10)] sm:p-7"
        >
          {/* Event name */}
          <div>
            <label htmlFor="name" className={labelClass}>
              Title
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Birthday Party"
              required
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Tell guests about your event..."
              rows={4}
              className={`${inputClass} resize-y`}
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className={labelClass}>
              Location
            </label>

            <input
              id="location"
              name="location"
              type="text"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Bangalore"
              className={inputClass}
            />
          </div>

          {/* Event cover image */}
          <div>
            <label className={labelClass}>
              Event Cover Image
            </label>

            <p className="mb-3 text-sm leading-relaxed text-slate-500">
              Choose an image to personalize your event. JPG, PNG, or WebP,
              up to 5 MB.
            </p>

            {coverPreview ? (
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img
                  src={coverPreview}
                  alt="Event cover preview"
                  className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-72"
                />

                <button
                  type="button"
                  onClick={removeCoverImage}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-red-600 active:scale-95"
                  aria-label="Remove cover image"
                >
                  <X size={18} />
                </button>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="truncate text-sm font-medium text-white">
                    {coverImage?.name}
                  </p>
                </div>
              </div>
            ) : (
              <label
                htmlFor="event-cover-input"
                className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50/60 hover:shadow-md hover:shadow-indigo-100/50"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 transition-all duration-300 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white">
                  <ImagePlus size={24} />
                </div>

                <span className="font-medium text-slate-700 transition-colors duration-200 group-hover:text-indigo-700">
                  Upload cover image
                </span>

                <span className="mt-1 text-sm text-slate-400 transition-colors duration-200 group-hover:text-indigo-500">
                  Click to browse your files
                </span>
              </label>
            )}

            <input
              id="event-cover-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              className="hidden"
            />

            {coverPreview && (
              <label
                htmlFor="event-cover-input"
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 hover:shadow-sm active:translate-y-0"
              >
                <Camera size={16} />
                Change image
              </label>
            )}
          </div>

          {/* Event dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className={labelClass}>
                Event Date
              </label>

              <input
                id="date"
                name="date"
                type="datetime-local"
                min={nowLocalInput()}
                value={form.date}
                onChange={handleChange}
                required
                className={dateInputClass}
              />
            </div>

            <div>
              <label htmlFor="expiryDate" className={labelClass}>
                Expiry Date
              </label>

              <input
                id="expiryDate"
                name="expiryDate"
                type="datetime-local"
                min={form.date || nowLocalInput()}
                value={form.expiryDate}
                onChange={handleChange}
                required
                className={dateInputClass}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#26345f] to-[#394b83] px-5 py-3.5 font-semibold text-white shadow-md shadow-indigo-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:from-[#1d284a] hover:to-[#30416f] hover:shadow-lg hover:shadow-indigo-950/20 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {loading ? "Creating Event..." : "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
}