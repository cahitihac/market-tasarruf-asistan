/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-namespace */
import { DatabaseRequestError } from './dynamo.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type InputJsonValue = JsonValue;

export class Database {
  static readonly JsonNull = null;
  static readonly RequestError = DatabaseRequestError;
}

export namespace Database {
  export type JsonValue = import('./types.js').JsonValue;
  export type JsonObject = import('./types.js').JsonObject;
  export type InputJsonValue = import('./types.js').InputJsonValue;
  export type DataSourceGetPayload<Selection> = Selection extends unknown ? any : never;
  export type NotificationDeliveryGetPayload<Selection> = Selection extends unknown ? any : never;
  export type EnumBrochureStatusFilter = { equals?: string; in?: string[]; notIn?: string[]; not?: string };
  export type EnumMatchingReviewStateFilter = EnumBrochureStatusFilter;
  export type EnumPriceSourceTypeFilter = EnumBrochureStatusFilter;
  export type EnumRunStatusFilter = EnumBrochureStatusFilter;
  export type EnumVerificationStatusFilter = EnumBrochureStatusFilter;
}

export type UserNeed = any;
export type Deal = any;
export type Alert = any;
export type Notification = any;
export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'INVALID_TOKEN' | 'SKIPPED';
export type PushPlatform = 'IOS' | 'ANDROID';
