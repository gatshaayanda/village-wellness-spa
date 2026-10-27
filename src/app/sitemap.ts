import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://village-wellness-spa.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/treatments`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/book`, changeFrequency: "weekly", priority: 0.95 },
  ];
}