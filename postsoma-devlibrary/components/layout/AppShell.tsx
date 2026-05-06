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
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <span className="font-mono text-xs text-archive-subtle">
            PostSoma DevLibrary
          </span>
          <span className="font-mono text-xs text-archive-subtle opacity-50">
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
        </div>
      </footer>
    </div>
  );
}
