import settings from './settings';
import formService from './formService';
import submissionService from './submissionService';
import subscriberService from './subscriberService';
import alertService from './alertService';

const services: Record<string, unknown> = {
  settings,
  formService,
  submissionService,
  subscriberService,
  alertService,
};

export default services;
