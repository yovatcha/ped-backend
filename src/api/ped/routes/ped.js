"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/ped/categories",
      handler: "ped.getCategories",
      config: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/ped/send",
      handler: "ped.sendPed",
      config: {
        auth: false,
      },
    },
  ],
};
