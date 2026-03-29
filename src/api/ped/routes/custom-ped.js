// src/api/ped/routes/ped.js
module.exports = {
  routes: [
    {
      method: "POST",
      path: "/ped/categories",
      handler: "ped.getCategories",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/ped/send",
      handler: "ped.sendPed",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};