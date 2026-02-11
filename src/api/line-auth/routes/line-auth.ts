"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/line-auth/login",
      handler: "line-auth.login",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/line-auth/:provider/login",
      handler: "line-auth.login",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
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
    {
      method: "GET",
      path: "/line-auth/:provider/callback",
      handler: "line-auth.callback",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
