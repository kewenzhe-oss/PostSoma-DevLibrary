import { describe, expect, it } from "vitest";
import { parseMarkdownResources } from "../../scripts/pipeline/parseMarkdown";

const sample = `
# Free Programming Books

## JavaScript

### React

* [React Docs](https://react.dev/)
* [Next.js Learn](https://nextjs.org/learn)

## Python

* [Python Tutorial](https://docs.python.org/3/tutorial/)
`;

describe("parseMarkdownResources", () => {
  it("parses category, subcategory, title and url", () => {
    const resources = parseMarkdownResources({
      markdown: sample,
      language: "en",
      collection: "books",
      sourcePath: "books/free-programming-books.md",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(resources).toEqual([
      expect.objectContaining({
        title: "React Docs",
        url: "https://react.dev/",
        language: "en",
        category: "JavaScript",
        subcategory: "React",
      }),
      expect.objectContaining({
        title: "Next.js Learn",
        url: "https://nextjs.org/learn",
        category: "JavaScript",
        subcategory: "React",
      }),
      expect.objectContaining({
        title: "Python Tutorial",
        url: "https://docs.python.org/3/tutorial/",
        category: "Python",
      }),
    ]);
  });

  it("assigns correct fields to each resource", () => {
    const resources = parseMarkdownResources({
      markdown: sample,
      language: "en",
      collection: "books",
      sourcePath: "books/test.md",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(resources[0]).toMatchObject({
      language: "en",
      source: "free-programming-books",
      sourcePath: "books/test.md",
      updatedAt: "2026-01-01T00:00:00.000Z",
      quality: "unchecked",
    });
    expect(resources[0].id).toHaveLength(16);
  });

  it("handles zh language", () => {
    const zhSample = `
## JavaScript

* [现代 JavaScript 教程](https://zh.javascript.info)
`;
    const resources = parseMarkdownResources({
      markdown: zhSample,
      language: "zh",
      collection: "books",
      sourcePath: "books/free-programming-books-zh.md",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(resources[0]).toMatchObject({
      language: "zh",
      title: "现代 JavaScript 教程",
      url: "https://zh.javascript.info",
    });
  });

  it("returns empty array when no resources found", () => {
    const resources = parseMarkdownResources({
      markdown: "# Just a title\n\nSome text.",
      language: "en",
      collection: "books",
      sourcePath: "books/test.md",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(resources).toHaveLength(0);
  });
});
