import adminRoutes from './admin';
import contentApiRoutes from './content-api';

export default {
  admin: {
    type: 'admin',
    routes: adminRoutes,
  },
  'content-api': {
    type: 'content-api',
    routes: contentApiRoutes,
  },
};
