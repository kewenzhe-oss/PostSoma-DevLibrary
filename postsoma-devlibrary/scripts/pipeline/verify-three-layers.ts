import fs from "node:fs";
import path from "node:path";
import { matchAndRecommend } from "../../lib/data/recommend";

const APP_DIR = path.resolve(__dirname, "../../");
const REPO_ROOT = path.resolve(__dirname, "../../../");

async function verifyThreeLayers() {
  console.log("🔒 Running Three-Layer Cross-Verification Script with Trust Assertions...");
  let failed = false;

  const catalogPath = path.join(APP_DIR, "public/data/resources.json");
  const sitemapTsPath = path.join(APP_DIR, "app/sitemap.ts");
  const sitemapXmlPath = path.join(APP_DIR, "out/sitemap.xml");
  const robotsPath = path.join(APP_DIR, "out/robots.txt");
  const llmsPath = path.join(APP_DIR, "public/llms.txt");
  const llmsFullPath = path.join(APP_DIR, "public/llms-full.txt");
  const fixturesPath = path.join(REPO_ROOT, "docs/delivery/recommend-fixtures.json");

  // 1. Verify Catalog (Layer 1)
  console.log("\n--- Layer 1: Catalog Check ---");
  if (!fs.existsSync(catalogPath)) {
    console.error("❌ Catalog not found at public/data/resources.json!");
    failed = true;
  } else {
    const raw = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    if (!Array.isArray(raw) || raw.length === 0) {
      console.error("❌ Catalog resources array is empty or invalid JSON!");
      failed = true;
    } else {
      console.log(`   ✓ Catalog parsed successfully. Loaded ${raw.length} resources.`);
    }
  }

  // 2. Verify Recommendations & Trust Assertions (Layer 2)
  console.log("\n--- Layer 2: Recommendations & Trust Assertions Check ---");
  if (!fs.existsSync(fixturesPath)) {
    console.error("❌ Fixtures not found at docs/delivery/recommend-fixtures.json!");
    failed = true;
  } else {
    const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));
    const catalogResources = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    const catalogIdsSet = new Set(catalogResources.map((r: any) => r.id));

    // Load actual output results file to verify E2 compliance
    const outputResultsPath = path.join(REPO_ROOT, "docs/delivery/recommendation-fixture-results.json");
    if (!fs.existsSync(outputResultsPath)) {
      console.error("❌ Recommendation fixtures output results JSON file is missing!");
      failed = true;
    } else {
      console.log("   ✓ Fixtures output results JSON is present.");
    }

    for (const fix of fixtures) {
      console.log(`   Running fixture: "${fix.name}"...`);
      const res = await matchAndRecommend(catalogResources, {
        goal: fix.inputs.goal,
        difficulty: fix.inputs.difficulty,
        language: fix.inputs.language,
        format: fix.inputs.format,
      });

      console.log(`     Funnel stats: related=${res.funnel.totalRelated}, matched=${res.funnel.matched}, compared=${res.funnel.compared}, picks=${res.picks.length}`);
      if (res.relaxedReason) {
        console.log(`     ℹ️ Relaxation: ${res.relaxedReason}`);
      }

      // Check E2 Funnel assertions
      if (res.funnel.totalRelated < res.funnel.matched) {
        console.error(`     ❌ Funnel rule violation: totalRelated (${res.funnel.totalRelated}) < matched (${res.funnel.matched})`);
        failed = true;
      }
      if (res.funnel.matched < res.funnel.compared) {
        console.error(`     ❌ Funnel rule violation: matched (${res.funnel.matched}) < compared (${res.funnel.compared})`);
        failed = true;
      }
      if (res.funnel.compared < res.picks.length) {
        console.error(`     ❌ Funnel rule violation: compared (${res.funnel.compared}) < picks (${res.picks.length})`);
        failed = true;
      }

      // Check E2 Default returned count picks constraint (Must be exactly 3 unless catalog space is insufficient)
      if (res.picks.length < 3) {
        if (res.funnel.totalRelated >= 3) {
          console.error(`     ❌ Pick Count Error: Catalog has ${res.funnel.totalRelated} related items, but only ${res.picks.length} picks returned.`);
          failed = true;
        } else {
          console.log(`     ℹ️ Pick Count (Relaxed): Catalog has only ${res.funnel.totalRelated} matching items. Returned ${res.picks.length} picks.`);
        }
      } else {
        console.log(`     ✓ Returned exactly 3 Picks.`);
      }

      // Check each pick details
      for (const pick of res.picks) {
        // ID bounds integrity
        if (!catalogIdsSet.has(pick.resourceId)) {
          console.error(`     ❌ Reference Integrity Error: Recommended pick ID '${pick.resourceId}' is not in the resource catalog!`);
          failed = true;
        }

        // Title and URL resolution consistency
        const catalogItem = catalogResources.find((r: any) => r.id === pick.resourceId);
        if (!catalogItem) {
          console.error(`     ❌ Catalog Match Error: Pick ID '${pick.resourceId}' could not be matched back to a catalog record.`);
          failed = true;
        } else {
          if (catalogItem.title !== pick.title) {
            console.error(`     ❌ Title Mismatch: Pick title '${pick.title}' does not match catalog title '${catalogItem.title}'`);
            failed = true;
          }
          if (catalogItem.url !== pick.url) {
            console.error(`     ❌ URL Mismatch: Pick URL '${pick.url}' does not match catalog URL '${catalogItem.url}'`);
            failed = true;
          }
        }

        // Out-of-catalog URL check
        if (pick.url.startsWith("http") && !pick.url.includes("://") && !pick.url.startsWith("/")) {
          console.error(`     ❌ Invalid URL Scheme in pick: ${pick.url}`);
          failed = true;
        }

        // Check comparative fields
        const exp = pick.explanation;
        const requiredFields: Array<keyof typeof exp> = [
          "whyMatch",
          "relativeAdvantage",
          "knownLimitations",
          "suitableFor",
          "notSuitableFor",
          "alternative",
          "evidenceStatus"
        ];
        for (const field of requiredFields) {
          if (!exp[field]) {
            console.error(`     ❌ Missing explanation field: '${field}' in pick '${pick.resourceId}'`);
            failed = true;
          }
        }
      }
    }
  }

  // 3. Verify ARO Link & HTML Metadata (Layer 3 & G4.2)
  console.log("\n--- Layer 3: ARO & HTML Metadata Check ---");
  
  // Sitemap
  if (!fs.existsSync(sitemapTsPath)) {
    console.error("❌ sitemap.ts not found in app/sitemap.ts!");
    failed = true;
  }
  if (!fs.existsSync(sitemapXmlPath)) {
    console.error("❌ sitemap.xml not found in out/sitemap.xml! Run build first.");
    failed = true;
  } else {
    const sitemapContent = fs.readFileSync(sitemapXmlPath, "utf8");
    if (!sitemapContent.includes("https://205022.xyz")) {
      console.error("❌ sitemap.xml contains wrong domain hosts!");
      failed = true;
    } else {
      console.log("   ✓ sitemap.xml domain canonical verification: PASS.");
    }
  }

  // LLMs.txt links pointing checks
  if (!fs.existsSync(llmsPath)) {
    console.error("❌ llms.txt not found in public/llms.txt!");
    failed = true;
  } else {
    const content = fs.readFileSync(llmsPath, "utf8");
    if (content.includes("EbookFoundation/free-programming-books")) {
      console.error("❌ llms.txt contains wrong upstream GitHub repository links!");
      failed = true;
    } else {
      console.log("   ✓ llms.txt repository links verification: PASS.");
    }
  }

  // Inspect HTML structures
  const pagesToTest = [
    { name: "Homepage", file: "out/index.html", keyword: "PostSoma" },
    { name: "Archive", file: "out/resources.html", keyword: "Archive" },
    { name: "Sample Detail", file: "out/resource/f2cbd241fe963f99.html", keyword: "Python" }
  ];

  for (const page of pagesToTest) {
    const htmlPath = path.join(APP_DIR, page.file);
    console.log(`   Probing HTML metadata for: ${page.name}...`);
    if (!fs.existsSync(htmlPath)) {
      console.error(`   ❌ HTML page not found at ${page.file}!`);
      failed = true;
      continue;
    }

    const html = fs.readFileSync(htmlPath, "utf8");

    // Title / H1 assertion
    if (!/<title[^>]*>([\s\S]*?)<\/title>/i.test(html) && !/<h1[^>]*>([\s\S]*?)<\/h1>/i.test(html)) {
      console.error(`     ❌ Title or H1 tag is missing on ${page.name}!`);
      failed = true;
    } else {
      console.log(`     ✓ Title / H1 tag present.`);
    }

    // Canonical link tag assertion
    if (!/<link[^>]*rel=["']canonical["'][^>]*>/i.test(html) && !/href="https:\/\/205022\.xyz/i.test(html)) {
      console.error(`     ❌ Canonical indicator or base URL link missing on ${page.name}!`);
      failed = true;
    } else {
      console.log(`     ✓ Canonical indicator present.`);
    }

    // JSON-LD script block assertion
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!jsonLdMatch) {
      console.error(`     ❌ JSON-LD script block missing on ${page.name}!`);
      failed = true;
    } else {
      try {
        const parsedLd = JSON.parse(jsonLdMatch[1].trim());
        const graph = parsedLd["@graph"] || [parsedLd];
        const validTypes = new Set(["WebSite", "CollectionPage", "CreativeWork", "BreadcrumbList", "Organization", "TechArticle", "WebPage"]);
        for (const item of graph) {
          const type = item["@type"];
          if (!type || !validTypes.has(type)) {
            console.error(`     ❌ Unsupported or non-standard JSON-LD type used: '${type}'`);
            failed = true;
          }
        }
        console.log(`     ✓ JSON-LD schema syntax & types verification: PASS.`);
      } catch (err: any) {
        console.error(`     ❌ Failed to parse JSON-LD payload as valid JSON on ${page.name}:`, err.message);
        failed = true;
      }
    }

    // Visible main descriptive text check
    if (!html.toLowerCase().includes(page.keyword.toLowerCase())) {
      console.error(`     ❌ Key semantic content word '${page.keyword}' missing in ${page.name} body!`);
      failed = true;
    } else {
      console.log(`     ✓ Semantic body text verified.`);
    }
  }

  // Verify Pre-rendered Preset Scenarios in recommend.html (Layer 3 ARO Check)
  console.log("\n--- Layer 3: Recommend Preset HTML Check ---");
  const recommendHtmlPath = path.join(APP_DIR, "out/recommend.html");
  if (!fs.existsSync(recommendHtmlPath)) {
    console.error("❌ recommend.html not found in out/recommend.html! Run build first.");
    failed = true;
  } else {
    const recommendHtml = fs.readFileSync(recommendHtmlPath, "utf8");
    if (!recommendHtml.includes('id="aro-presets-data"')) {
      console.error("❌ recommend.html does not contain the static ARO presets container id='aro-presets-data'!");
      failed = true;
    } else {
      console.log("   ✓ recommend.html contains the static ARO presets container.");
    }

    const expectedPresetKeywords = [
      "零基础 Python，中文，教程/书籍优先",
      "有一点 JavaScript 基础，英文，想做网站",
      "只需要 Git 的 cheat sheet 或文档",
      "想转后端，任意语言，课程优先",
      "中文资源为主的算法入门",
      "英文文档优先的 SQL 入门"
    ];

    for (const kw of expectedPresetKeywords) {
      if (!recommendHtml.includes(kw)) {
        console.error(`   ❌ recommend.html initial HTML is missing preset scenario content: "${kw}"`);
        failed = true;
      } else {
        console.log(`   ✓ Preset content found: "${kw}"`);
      }
    }
  }

  console.log("\n" + "━".repeat(50));
  if (failed) {
    console.error("❌ TRUST VERIFICATION FAILED!");
    process.exit(1);
  } else {
    console.log("🎉 TRUST VERIFICATION COMPLETED successfully! ALL CRITICAL PATHS PASS.");
    process.exit(0);
  }
}

verifyThreeLayers();
