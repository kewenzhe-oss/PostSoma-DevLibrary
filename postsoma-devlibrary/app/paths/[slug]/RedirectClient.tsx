"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface RedirectClientProps {
  slug: string;
}

export default function RedirectClient({ slug }: RedirectClientProps) {
  const router = useRouter();

  useEffect(() => {
    if (slug === "python-beginner") {
      router.replace("/recommend?goal=Python&lang=zh&level=beginner&format=all");
    } else {
      router.replace("/recommend");
    }
  }, [slug, router]);

  return (
    <div className="min-h-screen bg-archive-bg flex items-center justify-center font-mono text-xs text-archive-subtle">
      Redirecting to recommendation engine...
    </div>
  );
}
