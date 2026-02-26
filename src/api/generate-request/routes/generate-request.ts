"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/generate-request/my-status",
      handler: "generate-request.getMyStatus",
      config: {
        auth: false, // Auth is handled manually in the controller via ctx.state.user
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/generate-request/submit",
      handler: "generate-request.submitRequest",
      config: {
        auth: false, // Auth is handled manually in the controller via ctx.state.user
        policies: [],
        middlewares: [],
      },
    },
  ],
};
