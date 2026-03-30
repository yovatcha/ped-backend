"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/super-admin/users",
      handler: "super-admin.listUsers",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/super-admin/impersonate/:userId",
      handler: "super-admin.impersonate",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/super-admin/generate-requests",
      handler: "super-admin.listGenerateRequests",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/super-admin/generate-requests/:id/approve",
      handler: "super-admin.approveRequest",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/super-admin/generate-requests/:id/deny",
      handler: "super-admin.denyRequest",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
