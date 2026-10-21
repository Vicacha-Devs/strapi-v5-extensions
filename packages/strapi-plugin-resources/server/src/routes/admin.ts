export default [
  {
    method: 'GET',
    path: '/hub',
    handler: 'resourcesController.getHubOverview',
    config: { policies: [] },
  },
  {
    method: 'GET',
    path: '/publications',
    handler: 'resourcesController.listPublications',
    config: { policies: [] },
  },
  {
    method: 'POST',
    path: '/publications',
    handler: 'resourcesController.createPublication',
    config: { policies: [] },
  },
  {
    method: 'GET',
    path: '/galleries',
    handler: 'resourcesController.listGalleries',
    config: { policies: [] },
  },
  {
    method: 'POST',
    path: '/galleries',
    handler: 'resourcesController.createGalleryAlbum',
    config: { policies: [] },
  },
  {
    method: 'POST',
    path: '/galleries/:documentId/sync-media-folder',
    handler: 'resourcesController.syncAlbumMediaFolder',
    config: { policies: [] },
  },
  {
    method: 'GET',
    path: '/glossary',
    handler: 'resourcesController.listGlossary',
    config: { policies: [] },
  },
  {
    method: 'POST',
    path: '/glossary',
    handler: 'resourcesController.createGlossaryTerm',
    config: { policies: [] },
  },
  {
    method: 'GET',
    path: '/media-folders',
    handler: 'resourcesController.listMediaFolders',
    config: { policies: [] },
  },
  {
    method: 'GET',
    path: '/settings',
    handler: 'resourcesController.getSettings',
    config: { policies: [] },
  },
  {
    method: 'PUT',
    path: '/settings',
    handler: 'resourcesController.updateSettings',
    config: { policies: [] },
  },
];
