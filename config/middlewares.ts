module.exports = [
  "global::trust-proxy",
  "strapi::errors",
  {
    name: "strapi::session",
    config: {
      rolling: false,
      renew: false,
      secure: false,
      proxy: true,
    },
  },
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
    name: "strapi::cors",
    config: {
      enabled: true,
      origin: function (ctx) {
        if (ctx.url.startsWith("/uploads")) {
          return "*";
        }
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
];
