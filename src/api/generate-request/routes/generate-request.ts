"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/generate-request/my-status",
      handler: "generate-request.getMyStatus",
      config: {
        auth: { scope: [] },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/generate-request/submit",
      handler: "generate-request.submitRequest",
      config: {
        auth: { scope: [] },
        policies: [],
        middlewares: [],
      },
    },
  ],
};
