// src/api/ped/routes/ped.js
"use strict";

const { createCoreRouter } = require("@strapi/strapi").factories;

// Override the core router completely with only our custom routes
module.exports = {
  routes: [
    {
      method: "POST",
      path: "/ped/categories",
      handler: "ped.getCategories",
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: "POST",
      path: "/ped/send",
      handler: "ped.sendPed",
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
