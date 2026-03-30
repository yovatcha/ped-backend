export default ({ env }) => ({
  upload: {
    config: {
      sizeLimit: 250 * 1024 * 1024, // 250MB
      providerOptions: {
        localServer: {
          maxage: 300000, // Cache for 5 minutes
        },
      },
      // Responsive image breakpoints for automatic optimization
      breakpoints: {
        xlarge: 1920,
        large: 1000,
        medium: 750,
        small: 500,
        xsmall: 64,
      },
    },
  },
});
