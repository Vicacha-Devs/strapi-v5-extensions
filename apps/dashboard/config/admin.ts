import { randomBytes } from "node:crypto";

function resolveSecret(envKey: string): string {
  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  const isProdRuntime =
    process.env.NODE_ENV === "production" && !process.argv.includes("build");
  if (isProdRuntime) {
    throw new Error(
      `[dashboard] Missing required production environment variable: ${envKey}`
    );
  }
  console.warn(
    `[dashboard] Generating instance-isolated ephemeral secret for ${envKey}`
  );
  return randomBytes(32).toString("hex");
}

export default () => ({
  auth: {
    secret: resolveSecret("ADMIN_JWT_SECRET"),
  },
  apiToken: {
    salt: resolveSecret("API_TOKEN_SALT"),
  },
  transfer: {
    token: {
      salt: resolveSecret("TRANSFER_TOKEN_SALT"),
    },
  },
  secrets: {
    encryptionKey: resolveSecret("ENCRYPTION_KEY"),
  },
});
