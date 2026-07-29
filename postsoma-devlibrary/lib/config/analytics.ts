/**
 * Google Analytics 4 measurement IDs are public site identifiers, not secrets.
 * Keep the site-wide tag configuration here so future analytics changes do not
 * require searching through page components.
 */
export const GA_MEASUREMENT_ID = "G-NST9E3MCDG";

export const isGoogleAnalyticsEnabled =
  process.env.NODE_ENV === "production";
