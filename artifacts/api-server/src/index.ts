import app from "./app.js";
import logger from "./logger.js";
import { runMigrations } from "./migrate.js";

const PORT = Number(process.env.PORT ?? 8080);

runMigrations()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      logger.info({ port: PORT }, "API server started");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Startup failed — aborting");
    process.exit(1);
  });
