import bootstrap from './bootstrap';
import contentTypes from './content-types';
import controllers from './controllers';
import routes from './routes';
import services from './services';

const register = () => {};
const destroy = () => {};
const config = {
  default: {},
  validator() {},
};

export default {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies: {},
  middlewares: {},
};
