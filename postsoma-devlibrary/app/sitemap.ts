import type { MetadataRoute } from "next";
import { getAllResources } from "@/lib/data/resources";
import { absoluteSiteUrl } from "@/lib/config/site";
import { getSitemapIndexability } from "@/lib/seo/sitemap-quality";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteSiteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: absoluteSiteUrl("/resources"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteSiteUrl("/recommend"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Index only standalone, featured resource pages with enough real editorial context.
  const resources = await getAllResources();
  const featuredResources = resources.filter(
    (resource) => getSitemapIndexability(resource).indexable,
  );

  const resourceRoutes = featuredResources.map((resource) => {
    let lastModified = new Date();
    if (resource.updatedAt) {
      const parsedDate = new Date(resource.updatedAt);
      if (!isNaN(parsedDate.getTime())) {
        lastModified = parsedDate;
      }
    }

    return {
      url: absoluteSiteUrl(`/resource/${resource.id}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...resourceRoutes];
}
