"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BackLinkInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLibrary = searchParams.get("from") === "library";
  const queryString = searchParams ? searchParams.toString() : "";
  const backUrl = fromLibrary ? "/library" : `/resources${queryString ? "?" + queryString : ""}`;

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(backUrl);
  };

  return (
    <a
      href={backUrl}
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 py-2.5 pr-4 font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors mb-5 md:mb-8"
    >
      ← {fromLibrary ? "返回我的收藏" : "返回资源库"}
    </a>
  );
}

export default function BackLink() {
  return (
    <Suspense fallback={
      <a
        href="/resources"
        className="inline-flex items-center gap-1.5 py-2.5 pr-4 font-mono text-xs text-archive-subtle hover:text-archive-text transition-colors mb-5 md:mb-8"
      >
        ← 返回资源库
      </a>
    }>
      <BackLinkInner />
    </Suspense>
  );
}
