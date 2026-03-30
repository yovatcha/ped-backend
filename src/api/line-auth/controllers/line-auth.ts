"use strict";

const axios = require("axios");

module.exports = {
  async testEnv(ctx) {
    return ctx.send({
      message: "Current Strapi Environment",
      LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID,
      LINE_CALLBACK_URL: process.env.LINE_CALLBACK_URL,
      FRONTEND_URL: process.env.FRONTEND_URL,
      NODE_ENV: process.env.NODE_ENV,
    });
  },
  async callback(ctx) {
    console.log("=== LINE AUTH CALLBACK STARTED ===");
    console.log("Query params:", ctx.query);
    console.log("Environment variables:");
    console.log("  LINE_CHANNEL_ID:", process.env.LINE_CHANNEL_ID);
    console.log(
      "  LINE_CHANNEL_SECRET:",
      process.env.LINE_CHANNEL_SECRET ? "✓ Set" : "✗ Missing",
    );
    console.log("  LINE_CALLBACK_URL:", process.env.LINE_CALLBACK_URL);
    console.log("  FRONTEND_URL:", process.env.FRONTEND_URL);

    const { code, state, error } = ctx.query;

    // Handle error from LINE
    if (error) {
      console.error("LINE auth error from LINE:", error);
      return ctx.redirect(
        `${process.env.FRONTEND_URL}/login?error=line_auth_failed`,
      );
    }

    if (!code) {
      console.error("No code received from LINE");
      return ctx.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    try {
      console.log("Step 1: Exchanging code for access token...");

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

      console.log("Token exchange successful!");
      const { access_token } = tokenResponse.data;

      console.log("Step 2: Getting user profile from LINE...");

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
      console.log("LINE Profile received:", {
        userId: lineProfile.userId,
        displayName: lineProfile.displayName,
      });

      console.log("Step 2.5: Checking user authorization with external API...");
      try {
        const authCheckResponse = await axios.post(
          "https://dev02.superaffiliate.app/api/ped_login_check.php",
          new URLSearchParams({ uid: lineProfile.userId }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": `Bearer ${process.env.PED_API_TOKEN}`,
            },
          }
        );

        console.log("Authorization API Response:", authCheckResponse.data);

        // Check if the user is allowed to log in
        if (!authCheckResponse.data || authCheckResponse.data.can_login !== true) {
          console.error(
            "User is not authorized:",
            authCheckResponse.data?.message || "Unknown reason"
          );
          return ctx.redirect(`${process.env.FRONTEND_URL}/login?error=not_authorized`);
        }
        
        console.log("User authorized, proceeding with login...");
      } catch (apiError) {
        console.error("Error while checking authorization API:", apiError.message);
        console.error("Auth API response status:", apiError.response?.status);
        console.error("Auth API response data:", apiError.response?.data);
        // Redirect to login if the API validation fails
        return ctx.redirect(`${process.env.FRONTEND_URL}/login?error=auth_check_failed`);
      }

      console.log("Step 3: Finding or creating user in Strapi...");

      // Step 3: Find or create user in Strapi
      const email = lineProfile.userId + "@line.user";

      let user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: email,
          },
        });

      if (!user) {
        console.log("User not found, creating new user...");

        // Get default role (authenticated)
        const defaultRole = await strapi.db
          .query("plugin::users-permissions.role")
          .findOne({
            where: { type: "authenticated" },
          });

        console.log("Default role ID:", defaultRole?.id);

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

        console.log("New user created:", user.id);
      } else {
        console.log("Existing user found:", user.id);
      }

      console.log("Step 4: Generating JWT token...");

      // Step 4: Generate JWT token
      const jwt = strapi.plugins["users-permissions"].services.jwt.issue({
        id: user.id,
      });

      console.log("JWT generated successfully");
      console.log("Step 5: Redirecting to frontend...");

      const redirectUrl = `${process.env.FRONTEND_URL}/auth/line/callback?access_token=${jwt}`;
      console.log("Redirect URL:", redirectUrl);

      // Step 5: Redirect to frontend with token
      ctx.redirect(redirectUrl);
    } catch (error) {
      console.error("=== LINE AUTHENTICATION ERROR ===");
      console.error("Error message:", error.message);
      console.error("Error response:", error.response?.data);
      console.error("Error stack:", error.stack);
      console.error("================================");

      ctx.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  },
};
