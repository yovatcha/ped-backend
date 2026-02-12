"use strict";

module.exports = {
  routes: [
    // ADD THIS ROUTE
    {
      method: "GET",
      path: "/line-auth/test-env",
      handler: "line-auth.testEnv",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/line-auth/callback",
      handler: "line-auth.callback",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
