import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createDb } from "./db/client.js";

const db = createDb();
const app = createApp({ db });

app.listen(env.port, () => {
  console.log(`test1 API listening on port ${env.port}`);
});
