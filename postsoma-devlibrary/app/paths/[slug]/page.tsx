import RedirectClient from "./RedirectClient";

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
