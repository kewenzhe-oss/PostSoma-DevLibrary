import RedirectClient from "./RedirectClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning Path Redirect — PostSoma DevLibrary",
  alternates: {
    canonical: "/recommend",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export async function generateStaticParams() {
  // Statically compile fallback route for previously promoted path slug
  return [{ slug: "python-beginner" }];
}

interface PathDetailPageProps {
  params: { slug: string };
}

export default function PathDetailPage({ params }: PathDetailPageProps) {
  return <RedirectClient slug={params.slug} />;
}
