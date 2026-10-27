import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://village-wellness-spa.vercel.app/sitemap.xml",
    host: "https://village-wellness-spa.vercel.app",
  };
}
