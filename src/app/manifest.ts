import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Village Wellness Spa",
    short_name: "Village Spa",
    description: "Medical aesthetics, skin health and wellness in Mississauga.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#E52B7C",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["health", "beauty", "lifestyle"],
    icons: [
      { src: "/villagespa.jpg", sizes: "any", type: "image/jpeg", purpose: "any" },
      { src: "/villagespa.jpg", sizes: "any", type: "image/jpeg", purpose: "maskable" }
    ]
  };
}