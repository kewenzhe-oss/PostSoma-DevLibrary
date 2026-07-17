import { NextRequest, NextResponse } from "next/server";
import { matchAndRecommend } from "@/lib/data/recommend";
import { getAllResources } from "@/lib/data/resources";
import type { Difficulty } from "@/lib/types/resource";

export async function GET(request: NextRequest) {
  // In production static export, route handlers must be static.
  // We return a static fallback placeholder to bypass webpack pre-render errors,
  // since recommendations in production run entirely on the client side.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({
      status: "static_export",
      message: "Recommendations in production build run entirely client-side."
    });
  }

  const { searchParams } = new URL(request.url);

  const goal = searchParams.get("goal") || "";
  const difficulty = (searchParams.get("difficulty") || "all") as "all" | Difficulty;
  const language = (searchParams.get("language") || "all") as "all" | "zh" | "en";
  const format = (searchParams.get("format") || "all") as
    | "all"
    | "book"
    | "course"
    | "tutorial"
    | "documentation"
    | "interactive";
  const apiKey = searchParams.get("apiKey") || undefined;

  try {
    const all = await getAllResources();
    const result = await matchAndRecommend(all, {
      goal,
      difficulty,
      language,
      format,
      apiKey,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API recommend error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation.", details: error.message },
      { status: 500 }
    );
  }
}
