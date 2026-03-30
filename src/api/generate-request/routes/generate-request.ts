"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/generate-request/my-statuses",
      handler: "generate-request.getMyStatuses",
      config: {
        auth: false, // Auth handled manually via getAuthUser
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/generate-request/submit",
      handler: "generate-request.submitRequest",
      config: {
        auth: false, // Auth handled manually via getAuthUser
        policies: [],
        middlewares: [],
      },
    },
  ],
};
