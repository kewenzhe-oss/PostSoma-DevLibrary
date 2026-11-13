"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GA_ROLLUP_ID,
  GA_PROJECT_ID,
  GA_PROJECT_NAME,
  GA_COGNITIVE_LAYER,
  UMAMI_WEBSITE_ID,
  UMAMI_SCRIPT_URL,
  CROSS_DOMAIN_LIST,
} from "@/lib/config/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local")
  );
}

function isValidGaId(id?: string): id is string {
  return Boolean(
    id &&
      id !== "PENDING" &&
      !id.startsWith("G-XXXXXXXX") &&
      id.startsWith("G-")
  );
}

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);
  const lastTrackedPathRef = useRef<string | null>(null);

  const isProduction = process.env.NODE_ENV === "production";

  useEffect(() => {
    if (!isProduction || typeof window === "undefined") return;
    if (isLocalHostname(window.location.hostname)) return;

    const hasRollup = isValidGaId(GA_ROLLUP_ID);
    const hasProject =
      isValidGaId(GA_PROJECT_ID) && GA_PROJECT_ID !== GA_ROLLUP_ID;
    const primaryGaId = hasRollup ? GA_ROLLUP_ID : hasProject ? GA_PROJECT_ID : "";

    if (primaryGaId && !document.getElementById("postsoma-ga4-gtag")) {
      const gtagScript = document.createElement("script");
      gtagScript.id = "postsoma-ga4-gtag";
      gtagScript.async = true;
      gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryGaId)}`;
      document.head.appendChild(gtagScript);

      window.dataLayer = window.dataLayer || [];
      const gtag = function (...args: unknown[]) {
        window.dataLayer?.push(args);
      };
      (window as any).gtag = (window as any).gtag || gtag;

      (window as any).gtag("js", new Date());
      (window as any).gtag("set", "linker", { domains: CROSS_DOMAIN_LIST });
      (window as any).gtag("set", {
        project_name: GA_PROJECT_NAME,
        cognitive_layer: GA_COGNITIVE_LAYER,
      });

      if (hasRollup) {
        (window as any).gtag("config", GA_ROLLUP_ID, {
          project_name: GA_PROJECT_NAME,
          cognitive_layer: GA_COGNITIVE_LAYER,
          send_page_view: false,
        });
      }

      if (hasProject) {
        (window as any).gtag("config", GA_PROJECT_ID, {
          project_name: GA_PROJECT_NAME,
          cognitive_layer: GA_COGNITIVE_LAYER,
          send_page_view: false,
        });
      }

      initializedRef.current = true;
    }

    if (
      UMAMI_WEBSITE_ID &&
      UMAMI_SCRIPT_URL &&
      !document.getElementById("postsoma-umami-script")
    ) {
      const umamiScript = document.createElement("script");
      umamiScript.id = "postsoma-umami-script";
      umamiScript.defer = true;
      umamiScript.src = UMAMI_SCRIPT_URL;
      umamiScript.setAttribute("data-website-id", UMAMI_WEBSITE_ID);
      document.head.appendChild(umamiScript);
    }
  }, [isProduction]);

  useEffect(() => {
    if (!isProduction || typeof window === "undefined") return;
    if (isLocalHostname(window.location.hostname)) return;
    if (!initializedRef.current || typeof (window as any).gtag !== "function") return;

    const queryString = searchParams?.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    if (lastTrackedPathRef.current === fullPath) return;
    lastTrackedPathRef.current = fullPath;

    (window as any).gtag("event", "page_view", {
      page_path: fullPath,
      page_location: window.location.href,
      page_title: document.title,
      project_name: GA_PROJECT_NAME,
      cognitive_layer: GA_COGNITIVE_LAYER,
    });
  }, [pathname, searchParams, isProduction]);

  return null;
}

export default function PostSomaAnalytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}
