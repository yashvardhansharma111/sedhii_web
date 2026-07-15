import { Db, MongoClient, MongoClientOptions } from "mongodb";

function maskUri(u: string) {
  try {
    // mask credentials in the URI for safe logging
    return u.replace(/(mongodb(?:\+srv)?:\/\/)(.*@)/, "$1***:***@");
  } catch (e) {
    return "(invalid-uri)";
  }
}

const rawUri = process.env.MONGO_URI ?? process.env.MONGODB_URI ?? process.env.MONGO_URL;
const uri = rawUri?.trim();

if (!uri || !/^mongodb/i.test(uri)) {
  const sample = "mongodb+srv://<user>:<pass>@cluster0.example.net/<dbname>?retryWrites=true&w=majority";
  throw new Error([
    "MONGO_URI is missing or invalid.",
    "Set the environment variable `MONGO_URI` (or `MONGODB_URI`/`MONGO_URL`) to a valid MongoDB connection string.",
    "For local dev use a .env.local file; for Vercel add the variable in Project Settings > Environment Variables.",
    `Current value: ${uri ? maskUri(uri) : "undefined"}`,
    `Example: ${sample}`,
  ].join(" "));
}

const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 8_000,  // fail fast instead of hanging 30s
  connectTimeoutMS: 8_000,
  socketTimeoutMS: 20_000,          // fail fast on stale sockets
  maxPoolSize: 5,
  minPoolSize: 1,
  maxIdleTimeMS: 30_000,            // close idle connections after 30s — before NAT/firewall drops them (~60s)
  heartbeatFrequencyMS: 10_000,     // ping Atlas every 10s to detect dead nodes fast
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  // eslint-disable-next-line no-console
  console.info("Connecting to MongoDB using:", maskUri(uri!));
  const c = new MongoClient(uri!, options);
  const p = c.connect();
  // If this connection attempt fails, clear the cached promise so the
  // next request creates a fresh connection instead of re-awaiting a
  // permanently-rejected promise.
  p.catch(() => { global._mongoClientPromise = undefined; });
  return p;
}

export async function getDb(dbName = process.env.MONGO_DB_NAME || "marketpulse"): Promise<Db> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connect();
  }
  const client = await global._mongoClientPromise;
  return client.db(dbName);
}

export default { then: (r: any, e: any) => getDb().then(r, e) } as unknown as Promise<MongoClient>;

