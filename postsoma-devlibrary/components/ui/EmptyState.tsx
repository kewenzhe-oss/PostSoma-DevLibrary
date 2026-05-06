interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: "search" | "bookmark" | "archive";
}

function SearchIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-archive-muted">
      <circle cx="18" cy="18" r="11" stroke="currentColor" strokeWidth="1.5" />
      <path d="M27 27L35 35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 18H21M18 15V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-archive-muted">
      <path
        d="M10 8h20a2 2 0 0 1 2 2v22l-12-6-12 6V10a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-archive-muted">
      <rect x="6" y="8" width="28" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 14v18a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 22h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function EmptyState({
  title,
  description,
  action,
  icon = "archive",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 animate-fade-in">
      <div className="opacity-40">
        {icon === "search" && <SearchIcon />}
        {icon === "bookmark" && <BookmarkIcon />}
        {icon === "archive" && <ArchiveIcon />}
      </div>
      <div className="text-center max-w-xs">
        <h3 className="font-display text-lg text-archive-text mb-2">{title}</h3>
        <p className="font-sans text-sm text-archive-subtle leading-relaxed">
          {description}
        </p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-outline mt-1"
          id="empty-state-action-btn"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
