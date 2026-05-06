import AppHeader from "./AppHeader";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="noise-overlay min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-archive-border mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
          <span className="font-mono text-[10px] sm:text-xs text-archive-subtle">
            PostSoma DevLibrary
          </span>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 font-mono text-[10px] sm:text-xs text-archive-subtle opacity-50">
            <span>
              Data from{" "}
              <a
                href="https://github.com/EbookFoundation/free-programming-books"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-archive-subtle transition-colors"
              >
                free-programming-books
              </a>
            </span>
            <span className="hidden sm:inline">·</span>
            <span>postsoma-2050</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
