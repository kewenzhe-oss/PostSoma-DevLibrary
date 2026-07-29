import { describe, expect, it } from "vitest";
import { GA_MEASUREMENT_ID } from "../../lib/config/analytics";

describe("Google Analytics configuration", () => {
  it("uses a valid GA4 measurement ID", () => {
    expect(GA_MEASUREMENT_ID).toMatch(/^G-[A-Z0-9]+$/);
  });
});
