module.exports = {
  routes: [
    {
      method: "POST",
      path: "/generation/upload-from-url",
      handler: "generation.uploadFromUrl",
      config: {
        auth: {
          strategies: ["users-permissions"],
        },
      },
    },
  ],
};
