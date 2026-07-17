import type { Resource } from "@/lib/types/resource";
import { getProviderLabel } from "./provider";

export const TYPE_LABELS: Record<Resource["type"], string> = {
  book: "book",
  course: "course",
  tutorial: "tutorial",
  documentation: "docs",
  interactive: "interactive",
  article: "article",
  app: "app",
  library: "library",
  framework: "framework",
  cli: "cli",
  collection: "collection",
  extension: "extension",
  unknown: "resource",
};

export function getCleanCategory(category: string, isZh: boolean = false): string {
  const upper = category.toUpperCase().trim();
  
  if (upper === "BY PROGRAMMING LANGUAGE") {
    return isZh ? "编程语言" : "Programming Languages";
  }
  if (upper === "BY SUBJECT") {
    return isZh ? "计算机科学" : "Computer Science";
  }
  if (upper === "语言无关") {
    return isZh ? "软件开发通用" : "Software Development";
  }
  if (upper === "语言相关") {
    return isZh ? "编程语言" : "Programming Languages";
  }

  // Remove numeric prefixes like "0 - MOOC" or "1 - CS"
  return category.replace(/^\d+\s*-\s*/, "").trim();
}

interface EditorialData {
  cardSummary: string;
  detailSummary: string;
  bestFor: string[];
  accessNote: string;
}

interface TechConcept {
  zh: {
    whatItIs: string;      // 想要表达什么
    whatInside: string;    // 里面能看到什么
    whatToLearn: string;   // 能学到什么
  };
  en: {
    whatItIs: string;
    whatInside: string;
    whatToLearn: string;
  };
}

// Highly semantic knowledge base answering what it is, what is inside, and what to learn for standard programming domains
const TECHNICAL_INTELLIGENCE: Record<string, TechConcept> = {
  angular: {
    zh: {
      whatItIs: "Angular 框架組件聲明、模版控制與依賴注入的語法模板",
      whatInside: "彙整了常用 @Component 裝飾器配置、RxJS 異步數據流以及常用模板指令",
      whatToLearn: "學會如何規範配置組件生命週期、進行模版雙向數據綁定與工程服務的注入"
    },
    en: {
      whatItIs: "Angular framework components declaration, template binding, and dependency injection syntax templates",
      whatInside: "summarized Component decorations, templates directives, and RxJS reactive streams",
      whatToLearn: "how to structure scalable web components, manage templates binding, and implement modular services"
    }
  },
  react: {
    zh: {
      whatItIs: "React 聲明式 UI 架構與 Hooks 的核心狀態管理邏輯",
      whatInside: "包含了 useState, useEffect 等高頻 Hook 的使用樣板、自定義 Hook 封裝與上下文傳遞",
      whatToLearn: "學會如何正確管理組件內部狀態、控制副作用生命週期並優化大規模組件渲染效能"
    },
    en: {
      whatItIs: "React declarative UI architecture and hook management logic",
      whatInside: "useState, useEffect, and useContext templates with custom hooks code blocks",
      whatToLearn: "how to control component state, handle render cycles, and write clean reusable hooks"
    }
  },
  vue: {
    zh: {
      whatItIs: "Vue 響應式原理、組件通信與組合式 API (Composition API) 實戰",
      whatInside: "整理了 ref, reactive, watch 等核心響應式 API、生命週期鉤子及前端路由配置",
      whatToLearn: "學會編寫響應式組件、管理複雜的前端狀態並建立模塊化單頁應用"
    },
    en: {
      whatItIs: "Vue reactive system patterns, state management, and Composition API syntax",
      whatInside: "refs, reactive scopes, watcher syntax, component hooks, and Router routing configuration",
      whatToLearn: "how to orchestrate reactive component hierarchies and scale single page web apps"
    }
  },
  apl: {
    zh: {
      whatItIs: "GNU APL 符號系統與多維數組操作的語法規律",
      whatInside: "整理了單目與雙目運算符、數組變形函數及常用數學符號的代碼速查表格",
      whatToLearn: "學會用極簡的 APL 符號進行矩陣與矢量運算，並理解 APL 的右結合求值機制"
    },
    en: {
      whatItIs: "GNU APL syntax rules, arrays transformations, and mathematical symbol mappings",
      whatInside: "detailed monadic and dyadic operators, shape manipulations, and vector operations",
      whatToLearn: "how to program math array algorithms using compact symbols and understand right-associative evaluation"
    }
  },
  docker: {
    zh: {
      whatItIs: "Docker 容器生命週期管理、容器互聯與 Dockerfile 構建規範",
      whatInside: "包含 Docker run/ps/rm 常用命令行指令、數據卷掛載配置以及 Dockerfile 指令大綱",
      whatToLearn: "學會編寫輕量化 Docker 鏡像、管理多容器數據共享並進行端口對接與網絡配置"
    },
    en: {
      whatItIs: "Docker containers containerization workflow and Dockerfile instructions",
      whatInside: "common lifecycle commands (run, rm, exec), container networks, and volume configuration",
      whatToLearn: "how to write efficient Dockerfiles, map storage volumes, and bridge container networks"
    }
  },
  sql: {
    zh: {
      whatItIs: "關係型數據庫 SQL 語法、多表聯查與高性能查詢的優化技巧",
      whatInside: "涵蓋 SELECT 篩選、JOIN 聯接、GROUP BY 聚合以及常用數據庫索引配置命令",
      whatToLearn: "學會編寫高效率的數據庫查詢語句，並理解如何利用索引和執行計劃提升檢索性能"
    },
    en: {
      whatItIs: "relational database SQL queries, multi-table joins, and optimization tips",
      whatInside: "SELECT filters, JOIN combinations, aggregations, and indices indexing syntax",
      whatToLearn: "how to compose high-performance relational queries and avoid full table scans"
    }
  },
  python: {
    zh: {
      whatItIs: "Python 程式設計的核心語法、面向對象特徵與日常腳本開發",
      whatInside: "涵蓋列表推導式、裝飾器、生成器、常用庫函數以及標準 OOP 類定義實踐",
      whatToLearn: "學會編寫優雅且符合 Pythonic 規範的代碼，並掌握基本的文件操作與數據處理"
    },
    en: {
      whatItIs: "Python programming language paradigms and dynamic data structures",
      whatInside: "list comprehensions, decorator blocks, generators, and OOP class setups",
      whatToLearn: "how to write clean Pythonic scripts and manage standard database or file workflows"
    }
  },
  javascript: {
    zh: {
      whatItIs: "JavaScript 異步編程、原型鏈機制與 ES6+ 現代語法特性",
      whatInside: "包含 Promise 鍊式調用、async/await 機制、閉包、原型繼承與模組化導入導出",
      whatToLearn: "學會處理複雜的非同步網路請求，並理解 JS 內部的事件循環與記憶體管理"
    },
    en: {
      whatItIs: "JavaScript asynchronous loops, closures, and ES6+ prototype rules",
      whatInside: "Promise chaining, async/await handlers, prototype scopes, and ESM modular modules",
      whatToLearn: "how to implement network requests and understand standard event loops"
    }
  },
  typescript: {
    zh: {
      whatItIs: "TypeScript 靜態強類型系統、接口聲明與泛型編程的架構規範",
      whatInside: "涵蓋 Type 和 Interface 聲明對比、聯合類型、泛型函數限制及高級類型收窄的實踐",
      whatToLearn: "學會利用類型安全機制在編譯期規避運行時錯誤，並編寫高可維護性的模塊代碼"
    },
    en: {
      whatItIs: "TypeScript static type safety system, interface setups, and generics",
      whatInside: "type vs interface constructs, union types, generic constraints, and compiler options",
      whatToLearn: "how to prevent runtime software errors and design type-safe component parameters"
    }
  },
  git: {
    zh: {
      whatItIs: "Git 分佈式版本控制系統的分支協作流與日常衝突解決",
      whatInside: "彙整了 commit、rebase、cherry-pick 常用命令行語法與分支合併策略",
      whatToLearn: "學會如何流暢管理團隊多人分支協作、快速定位代碼歷史並恢復損壞的版本狀態"
    },
    en: {
      whatItIs: "Git distributed version control collaboration and conflict resolution",
      whatInside: "daily branch actions (commit, rebase, checkout), log inspections, and cherry-picking",
      whatToLearn: "how to resolve merging conflicts and maintain a clean git history graph"
    }
  },
  blockchain: {
    zh: {
      whatItIs: "區塊鏈去中心化賬本共識機制、智能合約語法與密碼學基礎理論",
      whatInside: "包含 PoW/PoS 機制對比、以太坊賬戶模型、哈希鏈表以及公私鑰加密技術的大綱",
      whatToLearn: "學會理解分佈式賬本的防篡改原理，並釐清智能合約在以太坊上的執行邏輯"
    },
    en: {
      whatItIs: "blockchain distributed ledgers, consensus algorithms, and smart contracts theory",
      whatInside: "PoW vs PoS specs, Ethereum accounts, cryptography hashes, and distributed ledger rules",
      whatToLearn: "how consensus resolves trust issues and how smart contracts execute on EVM"
    }
  },
  ai: {
    zh: {
      whatItIs: "人工智能大模型 API 調用、RAG 向量檢索與機器學習基本原理",
      whatInside: "包含了大模型參數配置、嵌入向量計算、卷積神經網絡與 Agent 工作流的基礎知識",
      whatToLearn: "學會如何為特定業務場景配置 AI Agent，並理解神經網絡的訓練與微調流程"
    },
    en: {
      whatItIs: "artificial intelligence deep networks, vector embeddings, and RAG architectures",
      whatInside: "LLM API usage, semantic vector searching, embedding logic, and agents parameters",
      whatToLearn: "how to deploy neural networks and configure search pipelines for RAG projects"
    }
  },
  bash: {
    zh: {
      whatItIs: "Linux Bash 命令行基本指令與 Shell 腳本自動化運維開發",
      whatInside: "包含文件流重定向、環境變量配置、常用管道符命令及基本循環與分支腳本語法",
      whatToLearn: "學會利用腳本編寫常規系統運維任務，並掌握日常終端開發環境的提效操作"
    },
    en: {
      whatItIs: "Linux Bash syntax rules and automation Shell scripts execution",
      whatInside: "streams redirection, variables setup, pipe utilities, and loop scripting logic",
      whatToLearn: "how to automate system backup routines and handle file processing pipelines"
    }
  },
  css: {
    zh: {
      whatItIs: "CSS Flexbox/Grid 網格佈局、響應式界面設計與現代動畫效果語法",
      whatInside: "彙集了 Flex 屬性、CSS Grid 網格配置、媒體查詢以及 CSS Transition 動畫的常用代碼",
      whatToLearn: "學會快速編寫適配多端屏幕的精美網頁佈局，並理解瀏覽器的渲染重排機制"
    },
    en: {
      whatItIs: "CSS Flexbox, Grid layout engines, and responsive media setups",
      whatInside: "flex alignments, grid layouts, fluid media queries, and transition utilities",
      whatToLearn: "how to build complex responsive web templates with minimal code footprint"
    }
  },
  general: {
    zh: {
      whatItIs: "軟體工程核心理論與編程代碼開發的核心實踐",
      whatInside: "整理了項目工程配置、基礎語法定義以及主流開發實踐與配置範例",
      whatToLearn: "學會如何規範編寫高質量代碼，並掌握軟體工程架構與邏輯設計的核心思維"
    },
    en: {
      whatItIs: "core software engineering principles and structured programming paradigms",
      whatInside: "essential syntax configurations, code frameworks, and modern development recipes",
      whatToLearn: "how to compose clean maintainable code and adopt structural architectural patterns"
    }
  }
};

// Simple hash helper to diversify template choices
function getHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function generateEditorialData(resource: Resource): EditorialData {
  // If the resource already has manually polished editorial fields, return immediately
  if (resource.cardSummary && resource.detailSummary && resource.bestFor && resource.accessNote) {
    return {
      cardSummary: resource.cardSummary,
      detailSummary: resource.detailSummary,
      bestFor: resource.bestFor,
      accessNote: resource.accessNote,
    };
  }

  const isZh = resource.language === "zh";
  const cleanCat = getCleanCategory(resource.category, isZh);
  const cleanSub = resource.subcategory || "";
  const provider = getProviderLabel(resource.url) || (isZh ? "開源社區" : "the open-source community");
  
  // Clean tags
  const cleanTags = (resource.tags || [])
    .map(t => t.trim())
    .filter(t => {
      const u = t.toUpperCase();
      return (
        u !== resource.category.toUpperCase() &&
        u !== (resource.subcategory || "").toUpperCase() &&
        u !== "BY PROGRAMMING LANGUAGE" &&
        u !== "BY SUBJECT" &&
        u !== "语言无关" &&
        u !== "语言相关" &&
        !/^\d+\s*-\s*/.test(t)
      );
    });
  
  const tags = cleanTags.slice(0, 3);
  const hash = getHash(resource.title);

  // Match domain knowledge item
  const titleLower = resource.title.toLowerCase();
  const catLower = resource.category.toLowerCase();
  const subLower = cleanSub.toLowerCase();
  const tagsStr = cleanTags.join(" ").toLowerCase();

  let matchKey = "general";
  for (const key of Object.keys(TECHNICAL_INTELLIGENCE)) {
    if (
      titleLower.includes(key) ||
      catLower.includes(key) ||
      subLower.includes(key) ||
      tagsStr.includes(key)
    ) {
      matchKey = key;
      break;
    }
  }

  const tech = TECHNICAL_INTELLIGENCE[matchKey] || TECHNICAL_INTELLIGENCE.general;
  const concept = isZh ? tech.zh : tech.en;

  if (isZh) {
    let cardSummary = "";
    let detailSummary = "";
    let bestFor: string[] = [];
    let accessNote = "";

    const focusTopic = cleanSub || cleanCat || resource.title;

    if (resource.type === "book") {
      const cardTemplates = [
        `一本系統性剖析 ${concept.whatItIs} 的圖書。裡面詳細拆解了 ${concept.whatInside}，幫助讀者真正學會 ${concept.whatToLearn}。`,
        `這部教程著重於介紹 ${concept.whatItIs}。內容包含 ${concept.whatInside}，幫助你快速掌握 ${concept.whatToLearn} 的核心技能。`,
        `這是一部極具學習價值的書籍。旨在梳理 ${concept.whatItIs}，涵蓋了 ${concept.whatInside}，引導你深入理解 ${concept.whatToLearn}。`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `本資源旨在闡明 ${concept.whatItIs}，深入淺出地解構核心概念。在內容中，讀者將能看到 ${concept.whatInside}。通過系統學習，讀者將能紮實學會 ${concept.whatToLearn}。更適合想要建立系統性技術拼圖的學習者。`;
      bestFor = [
        `尋求在 ${focusTopic} 領域快速建立知識網絡的開發人員`,
        `抗拒碎片化博客、需要結構化教材的自主學習者`
      ];
      accessNote = "建議直接點擊 Open 打開外部原鏈接進行在線閱讀，或作為案頭參考書查閱。";
    } 
    else if (resource.type === "course") {
      const cardTemplates = [
        `這是一套旨在解密 ${concept.whatItIs} 的實戰教程。學習者不僅能從中看到 ${concept.whatInside}，更將全面掌握 ${concept.whatToLearn}。`,
        `由 ${provider} 打造的實踐型課程，聚焦於 ${concept.whatItIs}。課程彙整了 ${concept.whatInside}，引導你學會 ${concept.whatToLearn}。`,
        `該課程著重於 ${concept.whatItIs} 的開發工作流。裡面詳細拆解了 ${concept.whatInside}，手把手教你如何學會 ${concept.whatToLearn}。`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `本實戰課程專注於 ${concept.whatItIs}，注重工程應用與動手操作。在課程模組中，您可以清晰地看到 ${concept.whatInside}。在實踐中，您將會學到 ${concept.whatToLearn}，特別推薦給需要循序漸進練習的工程師。`;
      bestFor = [
        `需要動手實踐案例、拒絕純理論學習的開發人員`,
        `希望依照標準路線圖快速上手 ${focusTopic} 的初中級開發者`
      ];
      accessNote = "建議點擊 View Details 查看本站決策背景，確認其前置門檻後再前往原站學習。";
    }
    else if (resource.type === "documentation") {
      const cardTemplates = [
        `官方出品的 ${focusTopic} 技術手冊，聚焦於 ${concept.whatItIs}。裡面記錄了 ${concept.whatInside}，是查閱 ${concept.whatToLearn} 的必備手冊。`,
        `這份官方權威文檔旨在規範 ${concept.whatItIs}。文檔羅列了 ${concept.whatInside}，是開發中快速對齊 ${concept.whatToLearn} 的首選。`,
        `針對 ${focusTopic} 的官方參考規範。覆蓋最新的 API 設定，包含 ${concept.whatInside}，幫助工程師在實戰中正確實現 ${concept.whatToLearn}。`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `該文檔擁有極高的權威度，詳細記錄了 ${concept.whatItIs} 的 API 引數、配置選項與性能優化建議。更適合作為日常擼碼時的案頭速查參考，不適宜零基礎通讀。`;
      bestFor = [
        `日常開發中需要精確核對 ${focusTopic} API 引數與配置的工程師`,
        `需要參考官方最佳實踐進行架構排錯的研發負責人`
      ];
      accessNote = "建議點擊 Open 直接跳轉至官方文檔，將其加入書籤以供開發時快速查閱。";
    }
    else if (resource.type === "interactive") {
      const cardTemplates = [
        `可直接在瀏覽器運行的 ${focusTopic} 互動練習沙盒。免安裝環境，在趣味實驗中快速掌握 ${concept.whatToLearn}。`,
        `這款實時互動學習工具旨在演示 ${concept.whatItIs}。支持網頁調試與代碼沙盒，帶你實時探索 ${concept.whatInside}。`,
        `針對 ${focusTopic} 的即時反饋實踐平台。支持免安裝直接擼碼，在趣味實驗中快速掌握 ${concept.whatToLearn}。`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `本工具移除了繁瑣的本地環境搭建環節，直接在網頁中提供代碼編譯與運行結果反饋。學習反饋極快，更適合快速上手與短期概念驗證。`;
      bestFor = [
        `欲快速體驗 ${focusTopic} 語法、抗拒本地複雜配置的新手`,
        `需要利用即時反饋機制加深語法記憶的實踐派學習者`
      ];
      accessNote = "建議直接點擊 Open 開啟互動界面，免安裝即可開始動手練習。";
    }
    else {
      // Cheat Sheets, Articles, etc.
      const cardTemplates = [
        `一份高密度的 ${focusTopic} 速查語法卡片。旨在精煉呈現 ${concept.whatItIs}，裡面包含 ${concept.whatInside}，便於隨時查閱。`,
        `專門梳理 ${focusTopic} 關鍵特性的速查指南。高濃度匯集了常用技巧，是隨手查閱 ${concept.whatToLearn} 的極佳備忘錄。`,
        `這份針對 ${focusTopic} 的速查工具集。裡面匯集了常用的命令與語法模板，幫你快速查閱並學會 ${concept.whatToLearn}。`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `本資源集中整理了 ${tags.join("、") || focusTopic} 的核心代碼語法與速查大綱。內容緊湊、信息密度高，適合已有基礎的開發者作為案頭備忘快速檢索。`;
      bestFor = [
        `需要高效率速查代碼句法、不想通讀冗長教程的開發者`,
        `需要快速獲取 ${focusTopic} 模版配置的工程師`
      ];
      accessNote = "建議直接開啟原鏈接，以便在開發時隨時進行快速檢索。";
    }

    return { cardSummary, detailSummary, bestFor, accessNote };
  } 
  // Generate English Text
  else {
    let cardSummary = "";
    let detailSummary = "";
    let bestFor: string[] = [];
    let accessNote = "";

    const focusTopic = cleanSub || cleanCat || resource.title;

    if (resource.type === "book") {
      const cardTemplates = [
        `A structured textbook focusing on ${concept.whatItIs}. Within this guide, you will explore ${concept.whatInside}, helping you master ${concept.whatToLearn}.`,
        `Dedicated to mastering ${concept.whatItIs}. Offers detailed engineering blueprints covering ${concept.whatInside} for building ${concept.whatToLearn}.`,
        `An essential book covering ${concept.whatItIs}. It breaks down ${concept.whatInside} in detail, helping you master ${concept.whatToLearn} step-by-step.`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `This textbook provides a thorough walkthrough of ${concept.whatItIs}, complete with rich snippets and exercises. Inside, you can see ${concept.whatInside}. You will learn ${concept.whatToLearn}.`;
      bestFor = [
        `Developers looking to build a structured foundation in ${focusTopic}`,
        `Self-learners who prefer comprehensive, deep-dive technical material`
      ];
      accessNote = "Recommended to open the resource directly to bookmark the chapters for regular study.";
    }
    else if (resource.type === "course") {
      const cardTemplates = [
        `A hands-on learning pathway for ${focusTopic} provided by ${provider}. Learn ${concept.whatToLearn} by composing ${concept.whatInside}.`,
        `An interactive curriculum covering ${concept.whatItIs}. Features step-by-step codes detailing ${concept.whatInside}.`,
        `A structured training course built to master ${concept.whatItIs}. You will explore ${concept.whatInside} and practice ${concept.whatToLearn}.`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `This course walks you through the actual coding pipeline for ${concept.whatItIs}, featuring practical lab assignments. Inside, you can see ${concept.whatInside}. You will learn ${concept.whatToLearn}.`;
      bestFor = [
        `Junior to mid-level engineers who prefer practical project challenges over textbooks`,
        `Developers transitioning into ${focusTopic} needing structured instructions`
      ];
      accessNote = "Check our details page to evaluate prerequisite requirements before entering the course.";
    }
    else if (resource.type === "documentation") {
      const cardTemplates = [
        `Official reference manual for ${focusTopic} covering ${concept.whatItIs}. Details parameter layouts of ${concept.whatInside}.`,
        `Authorized documentation covering ${concept.whatItIs} specifications. The single source of truth for checking ${concept.whatToLearn}.`,
        `Official documentation and deployment configurations for ${focusTopic}. Highlights standard syntax of ${concept.whatInside}.`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `An authoritative guide compiled by the framework maintainers, detailing API endpoints, configuration variables, and performance tuning. Highly recommended for lookup during active coding.`;
      bestFor = [
        `Software developers looking to verify exact API methods and parameter bounds for ${focusTopic}`,
        `Systems architects debugging deployment files or performance bottlenecks`
      ];
      accessNote = "Open this directly to keep the official documentation close at hand during development.";
    }
    else if (resource.type === "interactive") {
      const cardTemplates = [
        `A click-to-run interactive code sandbox for learning ${concept.whatItIs}. Practice ${concept.whatToLearn} in the browser.`,
        `A hands-on browser workspace built to practice ${concept.whatItIs}. Write code directly with no local environment setup.`,
        `An interactive tutorial with gamified syntax challenges. Experiment with live compiler outputs in real time.`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `This tool eliminates local package installation overhead, letting you test ideas instantly in a sandbox. Ideal for rapid feedback loops and code exercises.`;
      bestFor = [
        `Beginners who want to try out ${focusTopic} syntax without installing a local toolchain`,
        `Practical learners seeking immediate compiler validation for their code inputs`
      ];
      accessNote = "Open the tool directly to begin playing in the browser, no installation required.";
    }
    else {
      const cardTemplates = [
        `A curated cheat sheet focused on ${concept.whatItIs}. Summarizes parameter syntax of ${concept.whatInside} for desk reference.`,
        `A highly condensed lookup sheet for ${focusTopic}. Streamlines active writing by listing how to compose ${concept.whatToLearn}.`,
        `A quick-access cheat sheet detailing high-frequency syntax patterns for ${concept.whatItIs}. Best for rapid desk reference.`
      ];
      cardSummary = cardTemplates[hash % cardTemplates.length];
      detailSummary = `This resource packs key ${tags.join(", ") || focusTopic} commands and methods into a high-density lookup sheet. Highly optimized for experienced developers seeking a quick reminder.`;
      bestFor = [
        `Developers searching for quick template snippets or CLI syntax sheets`,
        `Experienced developers looking for a fast reminder of ${focusTopic} methods`
      ];
      accessNote = "Recommended to open this link directly to utilize it as a rapid desk reference.";
    }

    return { cardSummary, detailSummary, bestFor, accessNote };
  }
}

export function generateDescription(resource: Resource, uiLanguage: "all" | "zh" | "en" = "all"): string {
  if (resource.cardSummary) {
    return resource.cardSummary;
  }
  if (resource.summary) {
    return resource.summary;
  }

  const editorial = generateEditorialData(resource);
  return editorial.cardSummary;
}
