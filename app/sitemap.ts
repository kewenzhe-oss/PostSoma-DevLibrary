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
  ];

  // Dynamic routes based on the compiled resource database
  const resources = await getAllResources();
  const dynamicRoutes = resources.map((resource) => {
    // Determine the modification date or default to current date
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
      priority: 0.8,
    };
  });

  return [...staticRoutes, ...dynamicRoutes];
}
