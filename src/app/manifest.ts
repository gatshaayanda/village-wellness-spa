import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Village Wellness Spa",
    short_name: "Village Spa",
    description: "Medical aesthetics, skin health and wellness in The Village, Gaborone, Botswana.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#E52B7C",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["health", "beauty", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
