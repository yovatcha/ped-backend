"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/super-admin/users",
      handler: "super-admin.listUsers",
      config: {
        auth: {
          scope: [],
        },
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/super-admin/impersonate/:userId",
      handler: "super-admin.impersonate",
      config: {
        auth: {
          scope: [],
        },
        policies: [],
        middlewares: [],
      },
    },
  ],
};
