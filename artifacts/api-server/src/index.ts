import app from "./app.js";
import logger from "./logger.js";

const PORT = Number(process.env.PORT ?? 8080);

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, "API server started");
});
