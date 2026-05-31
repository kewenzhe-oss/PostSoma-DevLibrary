"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BackLinkInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined" && document.referrer && document.referrer.includes("/resources")) {
      setHasHistory(true);
    }
  }, []);

  const queryString = searchParams ? searchParams.toString() : "";
  const backUrl = `/resources${queryString ? "?" + queryString : ""}`;

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasHistory) {
      router.back();
    } else {
      router.push(backUrl);
    }
  };

  return (
    <a
      href={backUrl}
      onClick={handleBack}
      className="inline-block font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors mb-8"
    >
      ← Back to archive
    </a>
  );
}

export default function BackLink() {
  return (
    <Suspense fallback={
      <a
        href="/resources"
        className="inline-block font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors mb-8"
      >
        ← Back to archive
      </a>
    }>
      <BackLinkInner />
    </Suspense>
  );
}
