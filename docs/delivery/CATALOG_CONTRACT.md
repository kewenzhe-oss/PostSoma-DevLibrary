# Catalog Contract & Schema Definition

The PostSoma DevLibrary serves a structured, machine-readable catalog of bilingual programming resources at [resources.json](file:///Users/grangerfdad/Desktop/running%20project/PostSoma%20DevLibrary%20%EF%BC%88205022%EF%BC%89/postsoma-devlibrary/public/data/resources.json).

---

## 1. Resource JSON Schema Fields

Each resource in the catalog adheres to the following interface:

| Field Name | Type | Description | Mandatory |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Unique 16-character SHA/MD5 hash identifier | Yes |
| `title` | `string` | Title of the resource | Yes |
| `url` | `string` | Primary link to access the resource | Yes |
| `language` | `"zh" \| "en"` | Bilingual tag representing Chinese or English | Yes |
| `collection` | `string` | Folder classification (`books`, `courses`, `cheat_sheets`, `interactive`, `github`) | Yes |
| `category` | `string` | Primary subject group (e.g. "Python", "JavaScript") | Yes |
| `subcategory` | `string` | Secondary sub-classification (optional) | No |
| `type` | `string` | Medium format (`book`, `course`, `tutorial`, `documentation`, `interactive`, `article`) | Yes |
| `tags` | `string[]` | Array of topic tags | Yes |
| `quality` | `"featured" \| "standard" \| "unchecked"` | Curation quality benchmark | Yes |
| `source` | `string` | Provenance source identifier (`free-programming-books` or `GitHub`) | Yes |
| `updatedAt` | `string` | ISO timestamp of the last compilation run | Yes |
| `difficulty` | `"beginner" \| "intermediate" \| "advanced"` | Categorized skill level (optional) | No |
| `editorNote` | `string` | Public curator remarks / advice (optional) | No |
| `summary` | `string` | Full descriptive overview (optional) | No |

---

## 2. Evidence Status Derivation Rules

The `evidence_status` is a calculated metric reflecting the level of editorial review and metadata richness. It is derived at runtime or query-time based on the following rules:

*   **High (`high`)**:
    *   Resource possesses a valid description/summary AND
    *   Resource has difficulty marked (`difficulty !== undefined`) OR has a custom note (`editorNote !== undefined`) AND
    *   Resource is selected as featured (`quality === 'featured'`) OR has AI workflow attributes (e.g. `source === 'GitHub'`).
*   **Medium (`medium`)**:
    *   Resource has at least one curation parameter set: possesses a description/summary, difficulty, or custom editorNote, but does not meet all criteria for high evidence.
*   **Low (`low`)**:
    *   Default fallback. Resource has no description/summary, no difficulty rating, and no custom notes (pure catalog index item).
