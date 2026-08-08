import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Grimoire",
    short_name: "Grimoire",
    description: "Restaurante privado para dos con recetas, cartas y cocina creativa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#21170f",
    theme_color: "#173a2f",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
