export default [
  {
    method: 'GET',
    path: '/hub',
    handler: 'resourcesController.getHubOverview',
    config: { auth: false, policies: [] },
  },
  {
    method: 'GET',
    path: '/publications',
    handler: 'resourcesController.listPublications',
    config: { auth: false, policies: [] },
  },
  {
    method: 'GET',
    path: '/publications/:slug',
    handler: 'resourcesController.getPublicationBySlug',
    config: { auth: false, policies: [] },
  },
  {
    method: 'POST',
    path: '/publications/:slug/download',
    handler: 'resourcesController.downloadPublication',
    config: { auth: false, policies: [] },
  },
  {
    method: 'GET',
    path: '/galleries',
    handler: 'resourcesController.listGalleries',
    config: { auth: false, policies: [] },
  },
  {
    method: 'GET',
    path: '/galleries/:slug',
    handler: 'resourcesController.getGalleryBySlug',
    config: { auth: false, policies: [] },
  },
  {
    method: 'GET',
    path: '/glossary',
    handler: 'resourcesController.listGlossary',
    config: { auth: false, policies: [] },
  },
];
