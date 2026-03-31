export default () => {
  return async (ctx, next) => {
    // Force ctx.secure = true when behind Cloudflare/Traefik proxy
    if (
      ctx.headers['x-forwarded-proto'] === 'https' ||
      ctx.headers['cf-visitor']?.includes('"scheme":"https"')
    ) {
      ctx.request.socket['encrypted'] = true;
    }
    await next();
  };
};
