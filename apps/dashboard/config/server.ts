import { randomBytes } from "node:crypto";

function resolveEphemeralSecret(envKey: string): string {
  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  console.warn(`[dashboard] Generating instance-isolated ephemeral secret for ${envKey}`);
  return randomBytes(32).toString("hex");
}

export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  host: env("HOST", "127.0.0.1"),
  port: Number(env("PORT", "1337")),
  app: {
    keys: [resolveEphemeralSecret("APP_KEY_1"), resolveEphemeralSecret("APP_KEY_2")],
  },
});
