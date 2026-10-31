export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/notes',
      handler: 'notesController.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/notes/:id',
      handler: 'notesController.findOne',
      config: {
        policies: [],
      },
    },
  ],
};
