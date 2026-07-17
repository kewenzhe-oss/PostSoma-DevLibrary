import AppHeader from "./AppHeader";
import Icon from "@/components/ui/Icon";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="noise-overlay min-h-screen flex flex-col overflow-x-hidden w-full">
      <AppHeader />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8">
        {children}
      </main>
      <footer className="border-t border-archive-border mt-auto pb-20 md:pb-0 bg-archive-surface/20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-archive-subtle uppercase tracking-wider font-semibold">
              POSTSOMA-2050 // ARCHIVE NODE
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2.5 sm:mt-0 font-mono text-[10px] text-archive-subtle/80">
            <span>
              Data:{" "}
              <a
                href="https://github.com/EbookFoundation/free-programming-books"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-archive-accent underline transition-colors"
              >
                free-programming-books
              </a>
            </span>
            <span>·</span>
            <a
              href="https://postsoma-2050.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-archive-accent flex items-center gap-0.5 transition-colors"
            >
              postsoma-2050 <Icon name="external" size={10} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
