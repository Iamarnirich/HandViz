/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",   

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Logos LNH
      {
        protocol: "https",
        hostname: "www.lnh.fr",
        pathname: "/medias/sports_teams/**",
      },
      // Google Drive (uc?id=...)
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/uc*",
      },
      // Drive redirection vers lh3
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
