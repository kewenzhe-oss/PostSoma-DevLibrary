// Provider Display Name Normalization Map
export const PROVIDER_MAP: Record<string, string> = {
  // Global platforms
  "github.com": "GitHub",
  "raw.githubusercontent.com": "GitHub",
  "gist.github.com": "GitHub Gist",
  "freecodecamp.org": "freeCodeCamp",
  "freecodecamp.cn": "freeCodeCamp",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "coursera.org": "Coursera",
  "edx.org": "edX",
  "udemy.com": "Udemy",
  "medium.com": "Medium",
  "dev.to": "Dev.to",
  "gitbooks.io": "GitBook",
  "gitbook.com": "GitBook",
  "gitbook.io": "GitBook",
  "oreilly.com": "O'Reilly",
  "deeplearning.ai": "DeepLearning.AI",
  "theodinproject.com": "The Odin Project",
  "aws.amazon.com": "AWS",
  "awscloud.com": "AWS",
  "aws.training": "AWS",
  "udacity.com": "Udacity",
  "codecademy.com": "Codecademy",
  "khanacademy.org": "Khan Academy",
  "mit.edu": "MIT OCW",
  "ocw.mit.edu": "MIT OCW",
  "stanford.edu": "Stanford",
  "web.stanford.edu": "Stanford",
  "cs.stanford.edu": "Stanford",
  "online.stanford.edu": "Stanford Online",
  "google.com": "Google",
  "grow.google": "Google",
  "withgoogle.com": "Google",
  "google.github.io": "Google",
  "cloud.google.com": "Google Cloud",
  "developers.google.com": "Google Developers",
  "datastructur.es": "UC Berkeley CS61B",
  "spring.io": "Spring.io",
  "developer.mozilla.org": "MDN Web Docs",
  "mozilla.org": "Mozilla",
  "w3schools.com": "W3Schools",
  "roadmap.sh": "Roadmap.sh",
  "uaceit.com": "UAceIt",

  // Microsoft (subdomain-aware)
  "docs.microsoft.com": "Microsoft Docs",
  "learn.microsoft.com": "Microsoft Learn",
  "microsoft.com": "Microsoft",
  "azure.microsoft.com": "Azure",
  "developer.microsoft.com": "Microsoft Dev",

  // Open-source / standards bodies
  "gnu.org": "GNU",
  "www.gnu.org": "GNU",
  "arxiv.org": "arXiv",
  "en.wikibooks.org": "Wikibooks",
  "en.wikipedia.org": "Wikipedia",
  "web.archive.org": "Internet Archive",
  "archive.org": "Internet Archive",

  // Publisher / book platforms
  "goalkicker.com": "GoalKicker",
  "syncfusion.com": "Syncfusion",
  "leanpub.com": "Leanpub",
  "programming-books.io": "Programming Books",
  "red-gate.com": "Red Gate",
  "riptutorial.com": "RIP Tutorial",
  "greenteapress.com": "Green Tea Press",
  "packtpub.com": "Packt",
  "flaviocopes.com": "Flavio Copes",
  "bookdown.org": "Bookdown",

  // Learning / tutorial platforms
  "tutorialspoint.com": "Tutorials Point",
  "geeksforgeeks.org": "GeeksForGeeks",
  "digitalocean.com": "DigitalOcean",
  "zerotomastery.io": "Zero to Mastery",
  "scrimba.com": "Scrimba",
  "v2.scrimba.com": "Scrimba",
  "code.sololearn.com": "SoloLearn",
  "sololearn.com": "SoloLearn",
  "cognitiveclass.ai": "Cognitive Class",
  "datacamp.com": "DataCamp",
  "scaler.com": "Scaler",
  "devhints.io": "Devhints",
  "cheatography.com": "Cheatography",
  "learnbyexample.github.io": "Learn By Example",
  "codewithharry.com": "Code With Harry",
  "infoq.com": "InfoQ",
  "launchschool.com": "Launch School",

  // AI / ML platforms
  "huggingface.co": "Hugging Face",
  "learn.nvidia.com": "NVIDIA",
  "nvidia.com": "NVIDIA",

  // University / institutional
  "cs.usfca.edu": "USF CS",
  "cslibrary.stanford.edu": "Stanford CS Lib",
  "nptel.ac.in": "NPTEL",
  "matlabacademy.mathworks.com": "MathWorks",
  "mathworks.com": "MathWorks",

  // Developer portals
  "developer.android.com": "Android Dev",
  "developer.apple.com": "Apple Dev",
  "docs.oracle.com": "Oracle Docs",
  "docs.aws.amazon.com": "AWS Docs",

  // SVN & Git Scm
  "git-scm.com": "Git Official",
  "svnbook.red-bean.com": "SVN Book",

  // Specific high-signal sites (Chinese & English)
  "liaoxuefeng.com": "Liao Xuefeng",
  "refactoring.guru": "Refactoring Guru",
  "refactoringguru.cn": "Refactoring Guru",
  "d2l.ai": "D2L AI",
  "learnopengl-cn.github.io": "LearnOpenGL",
  "nndl.github.io": "NNDL",
  "ifeve.com": "Concurrent Programming Wiki",
  "w3cschool.cn": "w3cschool",
  "w3cschool.com.cn": "w3cschool",
  "runoob.com": "Runoob",
  "wangdoc.com": "Wang Doc",
  "shiyanlou.com": "Lanqiao",
  "xuetangx.com": "XuetangX",
  "imooc.com": "iMOOC",
  "jikexueyuan.com": "Jike Academy",
  "kancloud.cn": "KanCloud",
  "elixirschool.com": "Elixir School",
  "learnxinyminutes.com": "Learn X in Y Minutes",
  "readthedocs.io": "Read the Docs",
  "readthedocs.org": "Read the Docs",
  "douban.com": "Douban",
  "hackmd.io": "HackMD",
  "go-zh.org": "Go Tour",
  "tour.go-zh.org": "Go Tour",
  "learnyouahaskell.com": "Learn You a Haskell",
  "redux.js.org": "Redux",
  "learngitbranching.js.org": "Learn Git Branching",
  "deno-tutorial.js.org": "Deno Tutorial",
  "mythbusters.js.org": "MythBusters JS",
};

export function getProviderLabel(url: string): string {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase().replace("www.", "");
    
    // 1. Exact or partial match from PROVIDER_MAP
    for (const [key, value] of Object.entries(PROVIDER_MAP)) {
      if (host === key || host.endsWith("." + key) || key.endsWith(host)) {
        return value;
      }
    }

    // 1.5 Dynamic parser for generic js.org subdomains
    if (host.endsWith(".js.org")) {
      const sub = host.slice(0, -7);
      return sub
        .replace(/[-_]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    
    // 2. Extra domain / subdomain keyword rules (order matters — specific before generic)
    if (host.includes("docs.microsoft")) return "Microsoft Docs";
    if (host.includes("learn.microsoft")) return "Microsoft Learn";
    if (host.includes("microsoft")) return "Microsoft";
    if (host.includes("cloud.google")) return "Google Cloud";
    if (host.includes("developers.google")) return "Google Developers";
    if (host.includes("google")) return "Google";
    if (host === "aws.amazon.com" || host.includes("aws")) return "AWS";
    if (host.includes("amazon")) return "Amazon";
    if (host.includes("odinproject")) return "The Odin Project";
    if (host.includes("deeplearning")) return "DeepLearning.AI";
    if (host.includes("mit.edu")) return "MIT OCW";
    if (host.includes("stanford")) return "Stanford";
    if (host.includes("freecodecamp")) return "freeCodeCamp";
    if (host.includes("youtube") || host === "youtu.be") return "YouTube";
    if (host.includes("github.io")) return "GitHub Pages";
    if (host.includes("githubusercontent")) return "GitHub";
    if (host.includes("nvidia")) return "NVIDIA";
    if (host.includes("huggingface")) return "Hugging Face";
    
    // 3. Fallback: extract domain name and format beautifully with spaces and casing
    const parts = host.split(".");
    let mainPart = parts[parts.length - 2] || parts[0];
    if (!mainPart) return "Outbound";
    
    // Camelcase splitting and hyphen cleanup
    mainPart = mainPart
      .replace(/[-_]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2");
      
    return mainPart
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return "Outbound";
  }
}
