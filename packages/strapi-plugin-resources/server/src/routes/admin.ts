import { PLUGIN_ID } from "../../../shared";

type ResourceAdminAction = "read" | "manage" | "settings";

function requireAdminPermission(action: ResourceAdminAction) {
  return [
    "admin::isAuthenticatedAdmin",
    {
      name: "admin::hasPermissions",
      config: { actions: [`plugin::${PLUGIN_ID}.${action}`] },
    },
  ];
}

export default [
  {
    method: "GET",
    path: "/hub",
    handler: "resourcesController.getAdminHubOverview",
    config: { policies: requireAdminPermission("read") },
  },
  {
    method: "GET",
    path: "/publications",
    handler: "resourcesController.listAdminPublications",
    config: { policies: requireAdminPermission("read") },
  },
  {
    method: "POST",
    path: "/publications",
    handler: "resourcesController.createPublication",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "PUT",
    path: "/publications/:documentId",
    handler: "resourcesController.updatePublication",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "DELETE",
    path: "/publications/:documentId",
    handler: "resourcesController.deletePublication",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "GET",
    path: "/galleries",
    handler: "resourcesController.listAdminGalleries",
    config: { policies: requireAdminPermission("read") },
  },
  {
    method: "POST",
    path: "/galleries",
    handler: "resourcesController.createGalleryAlbum",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "PUT",
    path: "/galleries/:documentId",
    handler: "resourcesController.updateGalleryAlbum",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "DELETE",
    path: "/galleries/:documentId",
    handler: "resourcesController.deleteGalleryAlbum",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "POST",
    path: "/galleries/:documentId/sync-media-folder",
    handler: "resourcesController.syncAlbumMediaFolder",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "GET",
    path: "/glossary",
    handler: "resourcesController.listAdminGlossary",
    config: { policies: requireAdminPermission("read") },
  },
  {
    method: "POST",
    path: "/glossary",
    handler: "resourcesController.createGlossaryTerm",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "PUT",
    path: "/glossary/:documentId",
    handler: "resourcesController.updateGlossaryTerm",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "DELETE",
    path: "/glossary/:documentId",
    handler: "resourcesController.deleteGlossaryTerm",
    config: { policies: requireAdminPermission("manage") },
  },
  {
    method: "GET",
    path: "/media-folders",
    handler: "resourcesController.listMediaFolders",
    config: { policies: requireAdminPermission("read") },
  },
  {
    method: "GET",
    path: "/media-files",
    handler: "resourcesController.listMediaFiles",
    config: { policies: requireAdminPermission("read") },
  },
  {
    method: "GET",
    path: "/settings",
    handler: "resourcesController.getSettings",
    config: { policies: requireAdminPermission("settings") },
  },
  {
    method: "PUT",
    path: "/settings",
    handler: "resourcesController.updateSettings",
    config: { policies: requireAdminPermission("settings") },
  },
];
