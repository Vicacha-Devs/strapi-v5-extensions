/// <reference types="astro/client" />

declare module "starlight-openapi" {
  export interface StarlightOpenAPISchemaConfig {
    base: string;
    schema: string;
    label?: string;
  }
  export default function starlightOpenAPI(
    schemas: StarlightOpenAPISchemaConfig[]
  ): import("@astrojs/starlight/types").StarlightPlugin;
}
