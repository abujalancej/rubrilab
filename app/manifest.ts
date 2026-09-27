import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RubriLab",
    short_name: "RubriLab",
    description: "Laboratory sessions, groups and assessment evidence — all while teaching.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7FAFC",
    theme_color: "#3064F5",
    icons: [
      {
        src: "/rubrilab-icon-transparent.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/rubrilab-icon-transparent.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
