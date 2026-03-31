module.exports = [
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": ["'self'", "data:", "blob:", "https:"],
          "media-src": ["'self'", "data:", "blob:", "https:"],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: "strapi::session",
    config: {
      secure: true,
      proxy: true, // ← add this
    },
  },
  {
    name: "strapi::cors",
    config: {
      enabled: true,
      origin: function (ctx) {
        // Allow all origins for public uploads (needed for n8n, AI services, etc.)
        if (ctx.url.startsWith("/uploads")) {
          return "*";
        }
        // Restrict API endpoints to specific origins
        const allowedOrigins = [
          "http://localhost:5173",
          "https://dev1.superaffiliate.app",
          "https://dev2.superaffiliate.app",
          "https://dev02.superaffiliate.app",
          "https://eagle1.superaffiliate.app",
          "https://oslo.superaffiliate.app",
        ];
        return allowedOrigins;
      },
      headers: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    },
  },
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::favicon",
  "strapi::public",
  // {
  //   name: 'global::filter-channel',
  //   config: {
  //     // your configuration properties here
  //   },
  // },
];
