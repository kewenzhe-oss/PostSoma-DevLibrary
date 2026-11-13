export const GA_ROLLUP_ID =
  process.env.NEXT_PUBLIC_GA_ROLLUP_ID || "G-NZ2V582QTN";

export const GA_PROJECT_ID =
  process.env.NEXT_PUBLIC_GA_PROJECT_ID ||
  process.env.NEXT_PUBLIC_GA_ID ||
  "G-DDSKE86NG1";

export const GA_MEASUREMENT_ID = GA_PROJECT_ID;

export const GA_PROJECT_NAME =
  process.env.NEXT_PUBLIC_GA_PROJECT_NAME || "dev_library";

export const GA_COGNITIVE_LAYER =
  process.env.NEXT_PUBLIC_GA_COGNITIVE_LAYER || "Craft";

export const UMAMI_WEBSITE_ID =
  process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ||
  "edb495ae-9e74-4b84-afe5-7482ed6a58d5";

export const UMAMI_SCRIPT_URL =
  process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ||
  "https://pulse.postsoma-2050.website/pulse.js";

export const isGoogleAnalyticsEnabled = process.env.NODE_ENV === "production";

export const CROSS_DOMAIN_LIST = [
  "postsoma-2050.website",
  "postsoma-2050.com",
  "www.205011.xyz",
  "205011.xyz",
  "www.205022.xyz",
  "205022.xyz",
  "www.205044.xyz",
  "205044.xyz",
  "www.205055.xyz",
  "205055.xyz",
  "www.205077.xyz",
  "205077.xyz",
  "quantbrews.win",
  "recipelab.cc",
  "www.readselah.org",
  "readselah.org",
  "prayselah.org",
  "postsomabooks.qzz.io",
];
