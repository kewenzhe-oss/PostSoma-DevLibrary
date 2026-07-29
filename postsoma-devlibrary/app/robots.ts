import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/draft", "/api"],
      },
      {
        userAgent: [
          "GPTBot",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "Applebot-Extended",
        ],
        allow: "/",
      },
    ],
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}
