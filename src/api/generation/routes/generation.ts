module.exports = {
    routes: [
      {
        method: 'POST',
        path: '/generation/callback',
        handler: 'generation.callback',
        config: {
          auth: false, // n8n doesn't have auth token
          policies: [],
        },
      },
      {
        method: 'GET',
        path: '/generation/status/:requestId',
        handler: 'generation.status',
        config: {
          auth: false,
          policies: [],
        },
      },
    ],
  };