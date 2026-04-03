module.exports = {
  routes: [
    {
      // Proxy: forwards payload to n8n server-side (avoids browser CORS on n8n webhook)
      method: "POST",
      path: "/generation/trigger",
      handler: "generation.trigger",
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/generation/callback",
      handler: "generation.callback",
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/generation/status/:requestId",
      handler: "generation.status",
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      // Proxy: downloads an external image server-side (no CORS) and uploads to Strapi media library
      method: "POST",
      path: "/generation/upload-from-url",
      handler: "generation.uploadFromUrl",
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
