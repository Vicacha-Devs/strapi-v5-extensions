import alertService from "./alertService";
import formService from "./formService";
import settings from "./settings";
import submissionService from "./submissionService";
import subscriberService from "./subscriberService";

const services: Record<string, unknown> = {
  settings,
  formService,
  submissionService,
  subscriberService,
  alertService,
};

export default services;
