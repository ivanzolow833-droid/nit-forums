import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CloudWorld — официальный форум",
    short_name: "CloudWorld",
    description: "Новости, игровые разделы, обращения, заявки и сообщество CloudWorld.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090d",
    theme_color: "#090b0f",
    lang: "ru",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
