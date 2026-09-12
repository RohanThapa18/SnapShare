/**
 * Generic shimmer placeholder for anything still loading — a photo,
 * a stat card, a row of text. Pass a className to control size/shape;
 * defaults to a rounded block that fills its container.
 */
export default function Skeleton({ className = "", rounded = "rounded-lg" }) {
  return <div className={`skeleton ${rounded} ${className}`} aria-hidden="true" />;
}

/** A grid of masonry-style photo skeletons for gallery loading states. */
export function PhotoGridSkeleton({ count = 8 }) {
  // Vary heights so the placeholder grid reads as photos, not tiles.
  const heights = [220, 280, 180, 320, 240, 260, 200, 300];
  return (
    <div className="columns-2 sm:columns-3 md:columns-4 photo-masonry">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton w-full mb-4 break-inside-avoid rounded-xl"
          style={{ height: heights[i % heights.length] }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
