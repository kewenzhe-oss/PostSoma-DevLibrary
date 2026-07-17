import type { MetadataRoute } from "next";
import { getAllResources } from "@/lib/data/resources";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://205022.xyz";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/recommend`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Restrained sitemap: Only index resources marked as "featured" (curated) to avoid indexing thin pages.
  const resources = await getAllResources();
  const featuredResources = resources.filter((r) => r.quality === "featured");

  const resourceRoutes = featuredResources.map((resource) => {
    let lastModified = new Date();
    if (resource.updatedAt) {
      const parsedDate = new Date(resource.updatedAt);
      if (!isNaN(parsedDate.getTime())) {
        lastModified = parsedDate;
      }
    }

    return {
      url: `${baseUrl}/resource/${resource.id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...resourceRoutes];
}
