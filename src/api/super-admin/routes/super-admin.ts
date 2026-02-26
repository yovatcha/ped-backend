"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/super-admin/users",
      handler: "super-admin.listUsers",
      config: {
        auth: { scope: [] },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/super-admin/impersonate/:userId",
      handler: "super-admin.impersonate",
      config: {
        auth: { scope: [] },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/super-admin/generate-requests",
      handler: "super-admin.listGenerateRequests",
      config: {
        auth: { scope: [] },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/super-admin/generate-requests/:id/approve",
      handler: "super-admin.approveRequest",
      config: {
        auth: { scope: [] },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/super-admin/generate-requests/:id/deny",
      handler: "super-admin.denyRequest",
      config: {
        auth: { scope: [] },
        policies: [],
        middlewares: [],
      },
    },
  ],
};
