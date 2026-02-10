"use strict";

const axios = require("axios");

module.exports = {
  async login(ctx) {
    const lineChannelId = process.env.LINE_CHANNEL_ID;
    const callbackUrl = process.env.LINE_CALLBACK_URL;

    if (!lineChannelId || !callbackUrl) {
      return ctx.badRequest("LINE configuration is missing");
    }

    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // Build LINE authorization URL
    const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", lineChannelId);
    authUrl.searchParams.append("redirect_uri", callbackUrl);
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", "profile openid email");

    // Redirect to LINE authorization page
    ctx.redirect(authUrl.toString());
  },

  async callback(ctx) {
    const { code, state, error } = ctx.query;

    // Handle error from LINE
    if (error) {
      console.error("LINE auth error:", error);
      return ctx.redirect(
        `${process.env.FRONTEND_URL}/login?error=line_auth_failed`,
      );
    }

    if (!code) {
      return ctx.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    try {
      // Step 1: Exchange authorization code for access token
      const tokenResponse = await axios.post(
        "https://api.line.me/oauth2/v2.1/token",
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: process.env.LINE_CALLBACK_URL,
          client_id: process.env.LINE_CHANNEL_ID,
          client_secret: process.env.LINE_CHANNEL_SECRET,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const { access_token } = tokenResponse.data;

      // Step 2: Get user profile from LINE
      const profileResponse = await axios.get(
        "https://api.line.me/v2/profile",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      const lineProfile = profileResponse.data;
      console.log("LINE Profile:", lineProfile);

      // Step 3: Find or create user in Strapi
      const email = lineProfile.userId + "@line.user"; // LINE doesn't always provide email

      let user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: email,
          },
        });

      if (!user) {
        // Get default role (authenticated)
        const defaultRole = await strapi.db
          .query("plugin::users-permissions.role")
          .findOne({
            where: { type: "authenticated" },
          });

        // Create new user
        user = await strapi.db.query("plugin::users-permissions.user").create({
          data: {
            username: lineProfile.displayName || `line_${lineProfile.userId}`,
            email: email,
            provider: "line",
            confirmed: true,
            blocked: false,
            role: defaultRole.id,
          },
        });
      }

      // Step 4: Generate JWT token
      const jwt = strapi.plugins["users-permissions"].services.jwt.issue({
        id: user.id,
      });

      // Step 5: Redirect to frontend with token
      ctx.redirect(
        `${process.env.FRONTEND_URL}/auth/line/callback?access_token=${jwt}`,
      );
    } catch (error) {
      console.error(
        "LINE authentication error:",
        error.response?.data || error.message,
      );
      ctx.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  },
};
