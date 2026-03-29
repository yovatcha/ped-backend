"use strict";

module.exports = {
  async getCategories(ctx) {
    try {
      const response = await fetch(
        "https://dev02.superaffiliate.app/api/ped_category_list.php",
        {
          method: "POST",
          headers: {
            Authorization: ctx.request.headers.authorization,
          },
        },
      );
      const data = await response.json();
      ctx.send(data);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async sendPed(ctx) {
    try {
      const payload = ctx.request.body;
      const response = await fetch(
        "https://dev02.superaffiliate.app/api/ped.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ctx.request.headers.authorization,
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      ctx.send(data);
    } catch (err) {
      ctx.throw(500, err);
    }
  },
};
