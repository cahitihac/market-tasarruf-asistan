import { config as loadDotEnv } from 'dotenv';
import { DynamoDataClient } from './dynamo.js';

loadDotEnv({ path: new URL('../../../.env', import.meta.url).pathname });
const globalDatabase = globalThis as unknown as { database?: DynamoDataClient };
export const database = globalDatabase.database ?? new DynamoDataClient();
globalDatabase.database = database;
export { Database } from './types.js';
export { DatabaseRequestError } from './dynamo.js';
export type { UserNeed, Deal, Alert, Notification, NotificationDeliveryStatus, PushPlatform } from './types.js';
