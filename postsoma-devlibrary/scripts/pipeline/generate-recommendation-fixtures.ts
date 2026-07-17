import fs from "node:fs";
import path from "node:path";
import { matchAndRecommend } from "../../lib/data/recommend";

const catalogPath = path.resolve(__dirname, "../../public/data/resources.json");
const outputPath = path.resolve(__dirname, "../../../docs/delivery/recommendation-fixture-results.json");

const fixtures = [
  {
    fixtureName: "Zero-basis Python Chinese",
    inputs: {
      goal: "零基础 Python",
      difficulty: "beginner",
      language: "zh",
      format: "all"
    }
  },
  {
    fixtureName: "Some JS wants to build websites EN",
    inputs: {
      goal: "javascript website web development",
      difficulty: "intermediate",
      language: "en",
      format: "all"
    }
  },
  {
    fixtureName: "Git cheatsheets only",
    inputs: {
      goal: "git",
      difficulty: "all",
      language: "all",
      format: "documentation"
    }
  }
];

async function run() {
  console.log("Generating recommendation fixture results...");
  const all = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  
  const results = [];
  for (const fix of fixtures) {
    const res = await matchAndRecommend(all, {
      goal: fix.inputs.goal,
      difficulty: fix.inputs.difficulty as any,
      language: fix.inputs.language as any,
      format: fix.inputs.format as any
    });
    results.push({
      fixtureName: fix.fixtureName,
      inputs: fix.inputs,
      funnel: res.funnel,
      picks: res.picks.map(p => ({
        resourceId: p.resourceId,
        title: p.title,
        url: p.url,
        type: p.type,
        language: p.language,
        category: p.category,
        take: p.take,
        explanation: p.explanation
      }))
    });
  }

  // Ensure target folder exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`✓ Fixtures results written to ${outputPath}`);
}

run();
