import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({
  fallback = "/dashboard",
  label = "Back",
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/dashboard");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className="
        group
        inline-flex
        items-center
        gap-2
        mb-5
        rounded-xl
        border
        border-[#E8E9F6]
        bg-[#E8E9F6]
        px-3
        py-2
        text-sm
        font-medium
        text-text-muted
        transition-all
        duration-200
        ease-out

        hover:-translate-x-0.5
        hover:border-[#E8E9F6]
        hover:bg-[#E8E9F6]
        hover:text-primary
        hover:shadow-[0_3px_10px_rgba(55,67,117,0.08)]

        active:translate-x-0
        active:scale-[0.97]

        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-primary/30
      "
    >
      <span
        className="
          flex
          items-center
          justify-center
          transition-transform
          duration-200
          ease-out
          group-hover:-translate-x-0.5
        "
      >
        <ArrowLeft
          size={18}
          strokeWidth={2}
        />
      </span>

      <span>{label}</span>
    </button>
  );
}