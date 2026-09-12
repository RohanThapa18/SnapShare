/**
 * Consistent empty-state block: icon, headline, short supporting copy,
 * and an optional action. Used anywhere a list/gallery has nothing to
 * show yet instead of a bare "No results" string.
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
          <Icon className="text-primary" size={26} />
        </div>
      )}
      <h3 className="font-display text-lg font-medium text-text mb-1">{title}</h3>
      {description && <p className="text-sm text-text-muted max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
