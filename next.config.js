const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://routeasy-backend.onrender.com/:path*",
      },
    ];
  },
};

module.exports = nextConfig;