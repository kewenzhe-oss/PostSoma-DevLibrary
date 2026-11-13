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
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "Applebot-Extended",
          "Google-Extended",
          "GoogleOther",
          "Amazonbot",
          "Bytespider",
          "CCBot",
          "Diffbot",
        ],
        allow: "/",
      },
    ],
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}
