export default {
  type: 'admin',
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
      path: '/notes/stats',
      handler: 'notesController.stats',
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
    {
      method: 'POST',
      path: '/notes',
      handler: 'notesController.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/notes/:id',
      handler: 'notesController.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/notes/:id',
      handler: 'notesController.delete',
      config: {
        policies: [],
      },
    },
  ],
};
