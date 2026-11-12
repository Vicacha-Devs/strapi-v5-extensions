import { RICH_TEXT_FIELD_NAME } from "../../../shared/src/fields";
import { PLUGIN_ID } from "../../../shared/src/pluginId";

export interface CustomFieldServerRegistration {
  name: string;
  plugin: string;
  type: "text";
  inputSize: {
    default: 4 | 6 | 8 | 12;
    isResizable: boolean;
  };
}

export const richTextField: CustomFieldServerRegistration = {
  name: RICH_TEXT_FIELD_NAME,
  plugin: PLUGIN_ID,
  type: "text",
  inputSize: {
    default: 12,
    isResizable: true,
  },
};
