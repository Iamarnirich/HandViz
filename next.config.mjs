/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Optionnel mais utile pour de meilleures perfs
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Logos LNH (tu l'avais déjà)
      {
        protocol: "https",
        hostname: "www.lnh.fr",
        pathname: "/medias/sports_teams/**",
      },
      // Google Drive "uc?id=..." (chemin = /uc, les query params ne comptent pas dans le pattern)
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/uc*",
      },
      // Parfois Drive redirige vers lh3 pour le rendu image
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
