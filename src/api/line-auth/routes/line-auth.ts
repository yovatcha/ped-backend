"use strict";

module.exports = {
  routes: [
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
