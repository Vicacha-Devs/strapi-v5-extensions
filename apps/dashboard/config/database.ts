import path from "node:path";

export default ({
  env,
}: {
  env: (key: string, defaultValue?: string) => string;
}) => ({
  connection: {
    client: "sqlite",
    connection: {
      filename: path.resolve(
        process.cwd(),
        env("DATABASE_FILENAME", ".tmp/data.db")
      ),
    },
    useNullAsDefault: true,
  },
});
