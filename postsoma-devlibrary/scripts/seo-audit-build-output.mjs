import fs from 'fs';
import path from 'path';

// Target files configuration
const OUT_DIR = path.join(process.cwd(), 'out');
const RESOURCE_DATA_PATH = path.join(process.cwd(), 'public', 'data', 'resources.json');

async function runAudit() {
  console.log('Starting SEO/ARO QA Audit on build output...');

  if (!fs.existsSync(OUT_DIR)) {
    console.error(`Build output directory not found at "${OUT_DIR}". Please run "npm run build" first.`);
    process.exit(1);
  }

  if (!fs.existsSync(RESOURCE_DATA_PATH)) {
    console.error(`Resources data not found at "${RESOURCE_DATA_PATH}".`);
    process.exit(1);
  }

  const resources = JSON.parse(fs.readFileSync(RESOURCE_DATA_PATH, 'utf8'));
  console.log(`Loaded ${resources.length} resources from data database.`);

  // Sample Selection
  const enResources = resources.filter(r => r.language === 'en');
  const zhResources = resources.filter(r => r.language === 'zh');

  console.log(`Languages available in DB - English: ${enResources.length}, Chinese: ${zhResources.length}`);

  // Select 5 English, 3 Chinese, and ensure 2 of different categories/types
  const samples = [];

  // 5 English
  samples.push(...enResources.slice(100, 105));

  // 3 Chinese
  samples.push(...zhResources.slice(50, 53));

  // 2 of distinct categories / types (not in previous selections)
  const selectedIds = new Set(samples.map(s => s.id));
  const otherCategories = [];
  for (const r of resources) {
    if (!selectedIds.has(r.id) && r.type !== 'book' && r.type !== 'tutorial') {
      otherCategories.push(r);
      selectedIds.add(r.id);
      if (otherCategories.length === 2) break;
    }
  }
  samples.push(...otherCategories);

  console.log(`\nSelected 10 Sample Resources for Audit:`);
  samples.forEach((s, idx) => {
    console.log(`[Sample ${idx + 1}] ID: ${s.id} | Lang: ${s.language} | Type: ${s.type} | Title: "${s.title.substring(0, 40)}"`);
  });

  const auditResults = [];

  for (const resource of samples) {
    const pagePath = path.join(OUT_DIR, 'resource', `${resource.id}.html`);
    const issues = [];
    let title = 'N/A';
    let description = 'N/A';
    let canonical = 'N/A';
    let hasJsonLd = false;
    let hasOg = false;
    let hasTwitter = false;
    let hasSourceLink = false;

    if (!fs.existsSync(pagePath)) {
      issues.push(`HTML output file not found at ${pagePath}`);
      auditResults.push({
        id: resource.id,
        title,
        description,
        canonical,
        jsonld: 'FAIL',
        og: 'FAIL',
        twitter: 'FAIL',
        sourceLink: 'FAIL',
        issues: issues.join('; ')
      });
      continue;
    }

    const html = fs.readFileSync(pagePath, 'utf8');

    // 1. Title verification
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1];
      if (!title.endsWith('— PostSoma DevLibrary')) {
        issues.push(`Title style mismatch: "${title}"`);
      }
    } else {
      issues.push('Missing <title> tag');
    }

    // 2. Meta description
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (descMatch) {
      description = descMatch[1];
      if (description.length === 0) {
        issues.push('Empty description attribute');
      }
    } else {
      issues.push('Missing <meta name="description">');
    }

    // 3. Canonical tag
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
    if (canonicalMatch) {
      canonical = canonicalMatch[1];
      const expectedCanonical = `https://205022.xyz/resource/${resource.id}`;
      if (canonical !== expectedCanonical) {
        issues.push(`Canonical URL mismatch. Got "${canonical}", expected "${expectedCanonical}"`);
      }
    } else {
      issues.push('Missing canonical <link>');
    }

    // 4. Open Graph check
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
    const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
    const ogUrl = html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/i);
    const ogType = html.match(/<meta\s+property="og:type"\s+content="([^"]*)"/i);
    const ogLocale = html.match(/<meta\s+property="og:locale"\s+content="([^"]*)"/i);

    if (ogTitle && ogDesc && ogUrl && ogType && ogLocale) {
      hasOg = true;
      if (ogUrl[1] !== `https://205022.xyz/resource/${resource.id}`) {
        issues.push(`og:url mismatch: "${ogUrl[1]}"`);
      }
      const expectedLocale = resource.language === 'zh' ? 'zh_TW' : 'en_US';
      if (ogLocale[1] !== expectedLocale) {
        issues.push(`og:locale mismatch: "${ogLocale[1]}", expected "${expectedLocale}"`);
      }
    } else {
      const missing = [];
      if (!ogTitle) missing.push('og:title');
      if (!ogDesc) missing.push('og:description');
      if (!ogUrl) missing.push('og:url');
      if (!ogType) missing.push('og:type');
      if (!ogLocale) missing.push('og:locale');
      issues.push(`Missing OG meta: ${missing.join(', ')}`);
    }

    // 5. Twitter metadata check
    const twitterCard = html.match(/<meta\s+name="twitter:card"\s+content="([^"]*)"/i);
    const twitterTitle = html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"/i);
    const twitterDesc = html.match(/<meta\s+name="twitter:description"\s+content="([^"]*)"/i);

    if (twitterCard && twitterTitle && twitterDesc) {
      hasTwitter = true;
    } else {
      const missing = [];
      if (!twitterCard) missing.push('twitter:card');
      if (!twitterTitle) missing.push('twitter:title');
      if (!twitterDesc) missing.push('twitter:description');
      issues.push(`Missing Twitter meta: ${missing.join(', ')}`);
    }

    // 6. JSON-LD structured data check
    const jsonLdMatches = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    if (jsonLdMatches.length > 0) {
      let webPageOk = false;
      let breadcrumbOk = false;

      for (const match of jsonLdMatches) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            const types = parsed['@graph'].map(item => item['@type']);
            if (types.includes('WebPage')) webPageOk = true;
            if (types.includes('BreadcrumbList')) breadcrumbOk = true;
          } else {
            if (parsed['@type'] === 'WebPage') webPageOk = true;
            if (parsed['@type'] === 'BreadcrumbList') breadcrumbOk = true;
          }
        } catch (e) {
          issues.push(`JSON-LD contains malformed JSON: ${e.message}`);
        }
      }

      if (webPageOk && breadcrumbOk) {
        hasJsonLd = true;
      } else {
        issues.push(`Missing schema types in JSON-LD. WebPage: ${webPageOk}, BreadcrumbList: ${breadcrumbOk}`);
      }
    } else {
      issues.push('Missing <script type="application/ld+json"> tag');
    }

    // 7. Accidental noindex check
    const robotsNoIndex = html.match(/<meta\s+name="robots"\s+content="[^"]*noindex[^"]*"/i);
    if (robotsNoIndex) {
      issues.push('Accidental "noindex" robots directive found on detail page');
    }

    // 8. Crawlable content check (Title visible and source URL linked)
    const titleSnippet = resource.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleRegex = new RegExp(titleSnippet, 'i');
    const hasVisibleTitle = titleRegex.test(html);
    if (!hasVisibleTitle) {
      issues.push('Resource title not found in HTML body text');
    }

    const escapedUrl = resource.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const urlRegex = new RegExp(escapedUrl, 'i');
    hasSourceLink = urlRegex.test(html);
    if (!hasSourceLink) {
      issues.push('Original source URL link not found in HTML body text');
    }

    auditResults.push({
      id: resource.id,
      title: title.substring(0, 30) + (title.length > 30 ? '...' : ''),
      description: description.substring(0, 30) + (description.length > 30 ? '...' : ''),
      canonical: canonical,
      jsonld: hasJsonLd ? 'PASS' : 'FAIL',
      og: hasOg ? 'PASS' : 'FAIL',
      twitter: hasTwitter ? 'PASS' : 'FAIL',
      sourceLink: hasSourceLink ? 'PASS' : 'FAIL',
      issues: issues.length === 0 ? 'None' : issues.join('; ')
    });
  }

  // Print results table
  console.log('\n======================================= AUDIT RESULTS SUMMARY =======================================');
  console.log('| URL | Title Unique | Description Unique | Canonical | JSON-LD | OG | Twitter | Source Link | Issues |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  auditResults.forEach(r => {
    const pageUrl = `https://205022.xyz/resource/${r.id}`;
    console.log(`| ${pageUrl} | ${r.title} | ${r.description} | ${r.canonical} | ${r.jsonld} | ${r.og} | ${r.twitter} | ${r.sourceLink} | ${r.issues} |`);
  });
  console.log('=====================================================================================================');

  // Write markdown report component for reference
  const reportPath = path.join(process.cwd(), 'scripts', 'last-audit-run.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`Saved audit results JSON to "${reportPath}".`);
}

runAudit();
