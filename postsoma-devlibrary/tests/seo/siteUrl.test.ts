import { describe, expect, it } from "vitest";
import { absoluteSiteUrl, SITE_HOSTNAME, SITE_URL } from "../../lib/config/site";

describe("public site URL", () => {
  it("uses the final www host as the only public origin", () => {
    expect(SITE_URL).toBe("https://www.205022.xyz");
    expect(SITE_HOSTNAME).toBe("www.205022.xyz");
  });

  it("builds absolute URLs without falling back to the redirecting apex domain", () => {
    expect(absoluteSiteUrl("/")).toBe("https://www.205022.xyz/");
    expect(absoluteSiteUrl("/resources")).toBe("https://www.205022.xyz/resources");
    expect(absoluteSiteUrl("/resource/example#webpage")).toBe(
      "https://www.205022.xyz/resource/example#webpage",
    );
  });
});
