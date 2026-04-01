// src/api/ped/controllers/ped.js
"use strict";

module.exports = {
  async getCategories(ctx) {
    try {
      const response = await fetch(
        `${process.env.PED_API_BASE_URL}/api/ped_category_list.php`,
        {
          method: "POST",
          headers: {
            Authorization: ctx.request.headers.authorization,
          },
        }
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
        `${process.env.PED_API_BASE_URL}/api/ped.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ctx.request.headers.authorization,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      ctx.send(data);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async debugEnv(ctx) {
    const token = process.env.PED_API_TOKEN || "";
    ctx.send({
      tokenLength: token.length,
      tokenPreview: token ? `${token.slice(0, 4)}...${token.slice(-4)}` : "EMPTY",
      baseUrl: process.env.PED_API_BASE_URL || "EMPTY",
    });
  },

  async shopSearch(ctx) {
    try {
      const { phone } = ctx.request.body as { phone: string };
      if (!phone) return ctx.badRequest("phone is required");

      const formData = new FormData();
      formData.append("phone", phone);

      const response = await fetch(
        `${process.env.PED_API_BASE_URL}/api/ped_shop_search.php`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PED_API_TOKEN}`,
          },
          body: formData,
        }
      );
      const text = await response.text();
      console.log("[shopSearch] status:", response.status, "body:", text);
      const data = JSON.parse(text);
      ctx.send(data);
    } catch (err) {
      ctx.throw(500, err);
    }
  },
};