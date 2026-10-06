/* Generated from the former relational schema. This is application metadata, not an ORM schema. */
export type ModelField = {
  name: string;
  kind: string;
  type: string;
  isId: boolean;
  isList: boolean;
  isRequired: boolean;
  isUnique: boolean;
  hasDefaultValue: boolean;
  default?: unknown;
  isUpdatedAt: boolean;
  relationFromFields?: string[];
  relationToFields?: string[];
  relationName?: string;
};

export type ModelMetadata = {
  name: string;
  fields: ModelField[];
  uniqueFields: string[][];
};

export const modelMetadata: ModelMetadata[] = [
  {
    "name": "User",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "email",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "passwordHash",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "displayName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "updatedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": true
      },
      {
        "name": "status",
        "kind": "enum",
        "type": "UserStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "ACTIVE",
        "isUpdatedAt": false
      },
      {
        "name": "lastLoginAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "emailVerifiedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "deletedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "needs",
        "kind": "object",
        "type": "UserNeed",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "UserToUserNeed"
      },
      {
        "name": "locations",
        "kind": "object",
        "type": "UserLocation",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "UserToUserLocation"
      },
      {
        "name": "preferences",
        "kind": "object",
        "type": "UserProductPreference",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "UserToUserProductPreference"
      },
      {
        "name": "recommendations",
        "kind": "object",
        "type": "Recommendation",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "RecommendationToUser"
      },
      {
        "name": "alerts",
        "kind": "object",
        "type": "Alert",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "AlertToUser"
      },
      {
        "name": "notifications",
        "kind": "object",
        "type": "Notification",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "NotificationToUser"
      },
      {
        "name": "pushDevices",
        "kind": "object",
        "type": "PushDevice",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "PushDeviceToUser"
      },
      {
        "name": "notificationPreference",
        "kind": "object",
        "type": "NotificationPreference",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "NotificationPreferenceToUser"
      },
      {
        "name": "deals",
        "kind": "object",
        "type": "Deal",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DealToUser"
      },
      {
        "name": "sessions",
        "kind": "object",
        "type": "ConsumerSession",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "ConsumerSessionToUser"
      },
      {
        "name": "accountTokens",
        "kind": "object",
        "type": "ConsumerAccountToken",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "ConsumerAccountTokenToUser"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "ConsumerSession",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "tokenHash",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "lastUsedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "expiresAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "revokedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "clientLabel",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "ipAddress",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "ConsumerSessionToUser"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "ConsumerAccountToken",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "purpose",
        "kind": "enum",
        "type": "ConsumerAccountTokenPurpose",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "tokenHash",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "expiresAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "usedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "ConsumerAccountTokenToUser"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "AdminUser",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "email",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "displayName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "role",
        "kind": "enum",
        "type": "AdminRole",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "VIEWER",
        "isUpdatedAt": false
      },
      {
        "name": "passwordHash",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "active",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": true,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "sessions",
        "kind": "object",
        "type": "AdminSession",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "AdminSessionToAdminUser"
      },
      {
        "name": "auditLogs",
        "kind": "object",
        "type": "AdminAuditLog",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "AdminAuditLogToAdminUser"
      },
      {
        "name": "reviewEvents",
        "kind": "object",
        "type": "ReviewEvent",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "AdminUserToReviewEvent"
      },
      {
        "name": "ingestionReviewEvents",
        "kind": "object",
        "type": "IngestionReviewEvent",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "AdminUserToIngestionReviewEvent"
      },
      {
        "name": "dataSourceApprovalEvents",
        "kind": "object",
        "type": "DataSourceApprovalEvent",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "AdminUserToDataSourceApprovalEvent"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "AdminSession",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "tokenHash",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "expiresAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "revokedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "AdminUser",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "AdminSessionToAdminUser"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "AdminAuditLog",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "actorId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "action",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "entityType",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "entityId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "beforeSnapshot",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "afterSnapshot",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "reason",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "requestId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "metadata",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "actor",
        "kind": "object",
        "type": "AdminUser",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "actorId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "AdminAuditLogToAdminUser"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "StoreChain",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "slug",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "name",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "branches",
        "kind": "object",
        "type": "StoreBranch",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "StoreBranchToStoreChain"
      },
      {
        "name": "retailerProducts",
        "kind": "object",
        "type": "RetailerProduct",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "RetailerProductToStoreChain"
      },
      {
        "name": "promotions",
        "kind": "object",
        "type": "Promotion",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "PromotionToStoreChain"
      },
      {
        "name": "brochures",
        "kind": "object",
        "type": "Brochure",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureToStoreChain"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "StoreBranch",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "chainId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "externalId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "name",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "city",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "latitude",
        "kind": "scalar",
        "type": "Float",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "longitude",
        "kind": "scalar",
        "type": "Float",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "chain",
        "kind": "object",
        "type": "StoreChain",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "chainId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "StoreBranchToStoreChain"
      },
      {
        "name": "observations",
        "kind": "object",
        "type": "PriceObservation",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "PriceObservationToStoreBranch"
      },
      {
        "name": "deals",
        "kind": "object",
        "type": "Deal",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DealToStoreBranch"
      }
    ],
    "uniqueFields": [
      [
        "chainId",
        "externalId"
      ]
    ]
  },
  {
    "name": "Category",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "slug",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "name",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "products",
        "kind": "object",
        "type": "Product",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "CategoryToProduct"
      },
      {
        "name": "needs",
        "kind": "object",
        "type": "UserNeed",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "CategoryToUserNeed"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "Brand",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "slug",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "name",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "products",
        "kind": "object",
        "type": "Product",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrandToProduct"
      },
      {
        "name": "preferences",
        "kind": "object",
        "type": "UserProductPreference",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrandToUserProductPreference"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "Product",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "name",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "normalizedName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "ean",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "categoryId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "brandId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "category",
        "kind": "object",
        "type": "Category",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "categoryId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "CategoryToProduct"
      },
      {
        "name": "brand",
        "kind": "object",
        "type": "Brand",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "brandId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrandToProduct"
      },
      {
        "name": "variants",
        "kind": "object",
        "type": "ProductVariant",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "ProductToProductVariant"
      },
      {
        "name": "deals",
        "kind": "object",
        "type": "Deal",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DealToProduct"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "ProductVariant",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "productId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "label",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "quantity",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "unit",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "packageCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 1,
        "isUpdatedAt": false
      },
      {
        "name": "product",
        "kind": "object",
        "type": "Product",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "productId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "ProductToProductVariant"
      },
      {
        "name": "retailerProducts",
        "kind": "object",
        "type": "RetailerProduct",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "ProductVariantToRetailerProduct"
      }
    ],
    "uniqueFields": [
      [
        "productId",
        "quantity",
        "unit",
        "packageCount"
      ]
    ]
  },
  {
    "name": "RetailerProduct",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "chainId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "externalId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "rawName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "normalizedName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "ean",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "variantId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "matchConfidence",
        "kind": "scalar",
        "type": "Float",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "reviewState",
        "kind": "enum",
        "type": "ReviewState",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "UNMATCHED",
        "isUpdatedAt": false
      },
      {
        "name": "chain",
        "kind": "object",
        "type": "StoreChain",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "chainId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "RetailerProductToStoreChain"
      },
      {
        "name": "variant",
        "kind": "object",
        "type": "ProductVariant",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "variantId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "ProductVariantToRetailerProduct"
      },
      {
        "name": "observations",
        "kind": "object",
        "type": "PriceObservation",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "PriceObservationToRetailerProduct"
      },
      {
        "name": "histories",
        "kind": "object",
        "type": "PriceHistory",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "PriceHistoryToRetailerProduct"
      },
      {
        "name": "promotions",
        "kind": "object",
        "type": "Promotion",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "PromotionToRetailerProduct"
      },
      {
        "name": "brochureOffers",
        "kind": "object",
        "type": "BrochureOffer",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureOfferToRetailerProduct"
      },
      {
        "name": "deals",
        "kind": "object",
        "type": "Deal",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DealToRetailerProduct"
      },
      {
        "name": "ingestionRows",
        "kind": "object",
        "type": "IngestionRow",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "IngestionRowToRetailerProduct"
      }
    ],
    "uniqueFields": [
      [
        "chainId",
        "externalId"
      ]
    ]
  },
  {
    "name": "PriceObservation",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "sourceKey",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "retailerProductId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "branchId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "promotionId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "observedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "priceMinor",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "regularPriceMinor",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "currency",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "TRY",
        "isUpdatedAt": false
      },
      {
        "name": "sourceType",
        "kind": "enum",
        "type": "PriceSourceType",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "DEMO_SEED",
        "isUpdatedAt": false
      },
      {
        "name": "sourceName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "Demo seed",
        "isUpdatedAt": false
      },
      {
        "name": "sourceIdentifier",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceUrl",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "externalProductId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "retrievedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "rawPayloadRef",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "ingestionRunId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "brochureOfferId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "confidence",
        "kind": "scalar",
        "type": "Float",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "verificationStatus",
        "kind": "enum",
        "type": "VerificationStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "DEMO",
        "isUpdatedAt": false
      },
      {
        "name": "retailerProduct",
        "kind": "object",
        "type": "RetailerProduct",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "retailerProductId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "PriceObservationToRetailerProduct"
      },
      {
        "name": "branch",
        "kind": "object",
        "type": "StoreBranch",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "branchId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "PriceObservationToStoreBranch"
      },
      {
        "name": "promotion",
        "kind": "object",
        "type": "Promotion",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "promotionId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "PriceObservationToPromotion"
      },
      {
        "name": "deals",
        "kind": "object",
        "type": "Deal",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DealToPriceObservation"
      },
      {
        "name": "ingestionRun",
        "kind": "object",
        "type": "IngestionRun",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "ingestionRunId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "IngestionRunToPriceObservation"
      },
      {
        "name": "brochureOffer",
        "kind": "object",
        "type": "BrochureOffer",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "brochureOfferId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureOfferToPriceObservation"
      },
      {
        "name": "ingestionRows",
        "kind": "object",
        "type": "IngestionRow",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "IngestionRowToPriceObservation"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "PriceHistory",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "retailerProductId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "day",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "minPriceMinor",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "maxPriceMinor",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sumPriceMinor",
        "kind": "scalar",
        "type": "BigInt",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "observationCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "currency",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "TRY",
        "isUpdatedAt": false
      },
      {
        "name": "retailerProduct",
        "kind": "object",
        "type": "RetailerProduct",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "retailerProductId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "PriceHistoryToRetailerProduct"
      }
    ],
    "uniqueFields": [
      [
        "retailerProductId",
        "day",
        "currency"
      ]
    ]
  },
  {
    "name": "Promotion",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "chainId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "retailerProductId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "brochureOfferId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "title",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "rawText",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "promotionKind",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "SIMPLE_SALE",
        "isUpdatedAt": false
      },
      {
        "name": "percentDiscount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "multiBuyQuantity",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "multiBuyPayQuantity",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "thresholdQuantity",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "thresholdUnit",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "startsAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "endsAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "loyaltyRequired",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": false,
        "isUpdatedAt": false
      },
      {
        "name": "chain",
        "kind": "object",
        "type": "StoreChain",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "chainId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "PromotionToStoreChain"
      },
      {
        "name": "retailerProduct",
        "kind": "object",
        "type": "RetailerProduct",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "retailerProductId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "PromotionToRetailerProduct"
      },
      {
        "name": "brochureOffer",
        "kind": "object",
        "type": "BrochureOffer",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "brochureOfferId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureOfferToPromotion"
      },
      {
        "name": "conditions",
        "kind": "object",
        "type": "PromotionCondition",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "PromotionToPromotionCondition"
      },
      {
        "name": "observations",
        "kind": "object",
        "type": "PriceObservation",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "PriceObservationToPromotion"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "PromotionCondition",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "promotionId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "kind",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "value",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "promotion",
        "kind": "object",
        "type": "Promotion",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "promotionId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "PromotionToPromotionCondition"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "UserLocation",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "label",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "latitude",
        "kind": "scalar",
        "type": "Float",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "longitude",
        "kind": "scalar",
        "type": "Float",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "UserToUserLocation"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "UserNeed",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "title",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "categoryId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "constraints",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "active",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": true,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "UserToUserNeed"
      },
      {
        "name": "category",
        "kind": "object",
        "type": "Category",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "categoryId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "CategoryToUserNeed"
      },
      {
        "name": "preferences",
        "kind": "object",
        "type": "UserProductPreference",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "UserNeedToUserProductPreference"
      },
      {
        "name": "recommendations",
        "kind": "object",
        "type": "Recommendation",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "RecommendationToUserNeed"
      },
      {
        "name": "alerts",
        "kind": "object",
        "type": "Alert",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "AlertToUserNeed"
      },
      {
        "name": "deals",
        "kind": "object",
        "type": "Deal",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DealToUserNeed"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "UserProductPreference",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "needId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "brandId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "kind",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "UserToUserProductPreference"
      },
      {
        "name": "need",
        "kind": "object",
        "type": "UserNeed",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "needId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "UserNeedToUserProductPreference"
      },
      {
        "name": "brand",
        "kind": "object",
        "type": "Brand",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "brandId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrandToUserProductPreference"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "Deal",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "snapshotKey",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "needId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "canonicalProductId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "retailerProductId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "branchId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "observationId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "productName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "retailerName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "branchName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "currentPriceMinor",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "unitPriceMinor",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "unitBasis",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "currency",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "TRY",
        "isUpdatedAt": false
      },
      {
        "name": "matchScore",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "score",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "label",
        "kind": "enum",
        "type": "DealLabel",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "action",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "reasons",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "matchReasons",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "priceStatistics",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "observedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "evaluatedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "status",
        "kind": "enum",
        "type": "DealStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "ACTIVE",
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DealToUser"
      },
      {
        "name": "need",
        "kind": "object",
        "type": "UserNeed",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "needId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DealToUserNeed"
      },
      {
        "name": "canonicalProduct",
        "kind": "object",
        "type": "Product",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "canonicalProductId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DealToProduct"
      },
      {
        "name": "retailerProduct",
        "kind": "object",
        "type": "RetailerProduct",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "retailerProductId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DealToRetailerProduct"
      },
      {
        "name": "branch",
        "kind": "object",
        "type": "StoreBranch",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "branchId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DealToStoreBranch"
      },
      {
        "name": "observation",
        "kind": "object",
        "type": "PriceObservation",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "observationId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DealToPriceObservation"
      },
      {
        "name": "recommendations",
        "kind": "object",
        "type": "Recommendation",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DealToRecommendation"
      },
      {
        "name": "alerts",
        "kind": "object",
        "type": "Alert",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "AlertToDeal"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "Recommendation",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "needId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "dealId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "action",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "RecommendationToUser"
      },
      {
        "name": "need",
        "kind": "object",
        "type": "UserNeed",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "needId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "RecommendationToUserNeed"
      },
      {
        "name": "deal",
        "kind": "object",
        "type": "Deal",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "dealId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DealToRecommendation"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "Alert",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "dedupeKey",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "needId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "dealId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "AlertToUser"
      },
      {
        "name": "need",
        "kind": "object",
        "type": "UserNeed",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "needId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "AlertToUserNeed"
      },
      {
        "name": "deal",
        "kind": "object",
        "type": "Deal",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "dealId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "AlertToDeal"
      },
      {
        "name": "notification",
        "kind": "object",
        "type": "Notification",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "AlertToNotification"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "Notification",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "alertId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "type",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "DEAL_ALERT",
        "isUpdatedAt": false
      },
      {
        "name": "title",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "body",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "readAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "NotificationToUser"
      },
      {
        "name": "alert",
        "kind": "object",
        "type": "Alert",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "alertId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "AlertToNotification"
      },
      {
        "name": "deliveries",
        "kind": "object",
        "type": "NotificationDelivery",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "NotificationToNotificationDelivery"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "PushDevice",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sessionId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "expoPushToken",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "platform",
        "kind": "enum",
        "type": "PushPlatform",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "UNKNOWN",
        "isUpdatedAt": false
      },
      {
        "name": "deviceName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "appVersion",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "updatedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": true
      },
      {
        "name": "lastSeenAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "disabledAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "lastDeliveryAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "PushDeviceToUser"
      },
      {
        "name": "deliveries",
        "kind": "object",
        "type": "NotificationDelivery",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "NotificationDeliveryToPushDevice"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "NotificationPreference",
    "fields": [
      {
        "name": "userId",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "dealAlertsEnabled",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": false,
        "isUpdatedAt": false
      },
      {
        "name": "greatDealEnabled",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": false,
        "isUpdatedAt": false
      },
      {
        "name": "buyEnabled",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "updatedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": true
      },
      {
        "name": "user",
        "kind": "object",
        "type": "User",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "userId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "NotificationPreferenceToUser"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "NotificationDelivery",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "notificationId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "pushDeviceId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "channel",
        "kind": "enum",
        "type": "NotificationDeliveryChannel",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "PUSH",
        "isUpdatedAt": false
      },
      {
        "name": "status",
        "kind": "enum",
        "type": "NotificationDeliveryStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "PENDING",
        "isUpdatedAt": false
      },
      {
        "name": "attemptCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "providerMessageId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "lastError",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sentAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "deliveredAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "failedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "updatedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": true
      },
      {
        "name": "notification",
        "kind": "object",
        "type": "Notification",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "notificationId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "NotificationToNotificationDelivery"
      },
      {
        "name": "pushDevice",
        "kind": "object",
        "type": "PushDevice",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "pushDeviceId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "NotificationDeliveryToPushDevice"
      }
    ],
    "uniqueFields": [
      [
        "notificationId",
        "pushDeviceId",
        "channel"
      ]
    ]
  },
  {
    "name": "EvaluationRun",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "status",
        "kind": "enum",
        "type": "RunStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "RUNNING",
        "isUpdatedAt": false
      },
      {
        "name": "startedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "finishedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "activeNeedsEvaluated",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "matchingProductsFound",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "dealsCreated",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "dealsUpdated",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "alertsCreated",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "notificationsCreated",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "failureCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "errors",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "[]",
        "isUpdatedAt": false
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "IngestionRun",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "dataSourceId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "source",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceType",
        "kind": "enum",
        "type": "PriceSourceType",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "JSON",
        "isUpdatedAt": false
      },
      {
        "name": "sourceIdentifier",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceUrl",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "checksum",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "trigger",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "MANUAL",
        "isUpdatedAt": false
      },
      {
        "name": "jobId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "attempt",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 1,
        "isUpdatedAt": false
      },
      {
        "name": "status",
        "kind": "enum",
        "type": "RunStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "RUNNING",
        "isUpdatedAt": false
      },
      {
        "name": "startedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "finishedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "processedCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "successCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "matchedCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "unmatchedCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "rowCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "createdProductsCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "updatedProductsCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "observationsCreatedCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "duplicatesSkippedCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "promotionsCreatedCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "failureCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "errors",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "[]",
        "isUpdatedAt": false
      },
      {
        "name": "dataSource",
        "kind": "object",
        "type": "DataSource",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "dataSourceId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DataSourceToIngestionRun"
      },
      {
        "name": "observations",
        "kind": "object",
        "type": "PriceObservation",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "IngestionRunToPriceObservation"
      },
      {
        "name": "rows",
        "kind": "object",
        "type": "IngestionRow",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "IngestionRowToIngestionRun"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "DataSource",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "slug",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "name",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "owner",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "ownerContact",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "connectorType",
        "kind": "enum",
        "type": "PriceSourceType",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "authorizationStatus",
        "kind": "enum",
        "type": "SourceAuthorizationStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "UNVERIFIED",
        "isUpdatedAt": false
      },
      {
        "name": "permittedCommercialUse",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": false,
        "isUpdatedAt": false
      },
      {
        "name": "allowedDataRetentionDays",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "geographicCoverage",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "credentialRequirements",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "feedSpecificationUrl",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "feedSpecification",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "onboardingStatus",
        "kind": "enum",
        "type": "DataSourceOnboardingStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "PROPOSED",
        "isUpdatedAt": false
      },
      {
        "name": "enabled",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": false,
        "isUpdatedAt": false
      },
      {
        "name": "scheduleEveryMs",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "freshnessHours",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 72,
        "isUpdatedAt": false
      },
      {
        "name": "rateLimitPerMinute",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "timeoutMs",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 30000,
        "isUpdatedAt": false
      },
      {
        "name": "maxAttempts",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 3,
        "isUpdatedAt": false
      },
      {
        "name": "config",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "fictional",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": false,
        "isUpdatedAt": false
      },
      {
        "name": "notes",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "operationalStatus",
        "kind": "enum",
        "type": "DataSourceOperationalStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "DISABLED",
        "isUpdatedAt": false
      },
      {
        "name": "lastRunAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "lastSuccessfulRunAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "lastRunStatus",
        "kind": "enum",
        "type": "RunStatus",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "lastRunId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "lastRecordCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "lastFailureMessage",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "updatedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": true
      },
      {
        "name": "ingestionRuns",
        "kind": "object",
        "type": "IngestionRun",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DataSourceToIngestionRun"
      },
      {
        "name": "operationalAlerts",
        "kind": "object",
        "type": "OperationalAlert",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DataSourceToOperationalAlert"
      },
      {
        "name": "approvalEvents",
        "kind": "object",
        "type": "DataSourceApprovalEvent",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "DataSourceToDataSourceApprovalEvent"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "DataSourceApprovalEvent",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "dataSourceId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "actorId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "fromStatus",
        "kind": "enum",
        "type": "DataSourceOnboardingStatus",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "toStatus",
        "kind": "enum",
        "type": "DataSourceOnboardingStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "authorizationStatus",
        "kind": "enum",
        "type": "SourceAuthorizationStatus",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "note",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "metadata",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "dataSource",
        "kind": "object",
        "type": "DataSource",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "dataSourceId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DataSourceToDataSourceApprovalEvent"
      },
      {
        "name": "actor",
        "kind": "object",
        "type": "AdminUser",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "actorId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "AdminUserToDataSourceApprovalEvent"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "OperationalAlert",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "dedupeKey",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "dataSourceId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "severity",
        "kind": "enum",
        "type": "OperationalAlertSeverity",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "WARNING",
        "isUpdatedAt": false
      },
      {
        "name": "status",
        "kind": "enum",
        "type": "OperationalAlertStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "OPEN",
        "isUpdatedAt": false
      },
      {
        "name": "kind",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "title",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "message",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "metadata",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "lastExternalSentAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "externalSendCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "externalLastError",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "firstSeenAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "lastSeenAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "resolvedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "dataSource",
        "kind": "object",
        "type": "DataSource",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "dataSourceId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "DataSourceToOperationalAlert"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "IngestionRow",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "runId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "rowNumber",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "status",
        "kind": "enum",
        "type": "IngestionRowStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "rawPayloadHash",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "rawPayload",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "reason",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "retailerProductId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "observationId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "run",
        "kind": "object",
        "type": "IngestionRun",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "runId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "IngestionRowToIngestionRun"
      },
      {
        "name": "retailerProduct",
        "kind": "object",
        "type": "RetailerProduct",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "retailerProductId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "IngestionRowToRetailerProduct"
      },
      {
        "name": "observation",
        "kind": "object",
        "type": "PriceObservation",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "observationId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "IngestionRowToPriceObservation"
      },
      {
        "name": "ingestionReviewItem",
        "kind": "object",
        "type": "IngestionReviewItem",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "IngestionReviewItemToIngestionRow"
      }
    ],
    "uniqueFields": [
      [
        "runId",
        "rowNumber"
      ]
    ]
  },
  {
    "name": "IngestionReviewItem",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "ingestionRowId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "state",
        "kind": "enum",
        "type": "MatchingReviewState",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "PENDING",
        "isUpdatedAt": false
      },
      {
        "name": "rawValues",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "proposedValues",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "candidateMatches",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "[]",
        "isUpdatedAt": false
      },
      {
        "name": "reason",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "selectedVariantId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "resolvedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "ingestionRow",
        "kind": "object",
        "type": "IngestionRow",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "ingestionRowId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "IngestionReviewItemToIngestionRow"
      },
      {
        "name": "events",
        "kind": "object",
        "type": "IngestionReviewEvent",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "IngestionReviewEventToIngestionReviewItem"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "IngestionReviewEvent",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "ingestionReviewItemId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "actorId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "action",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "fromState",
        "kind": "enum",
        "type": "MatchingReviewState",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "toState",
        "kind": "enum",
        "type": "MatchingReviewState",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "note",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "metadata",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "ingestionReviewItem",
        "kind": "object",
        "type": "IngestionReviewItem",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "ingestionReviewItemId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "IngestionReviewEventToIngestionReviewItem"
      },
      {
        "name": "actor",
        "kind": "object",
        "type": "AdminUser",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "actorId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "AdminUserToIngestionReviewEvent"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "Brochure",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "chainId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "source",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceIdentifier",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceUrl",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "fileHash",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceAuthorizationStatus",
        "kind": "enum",
        "type": "SourceAuthorizationStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "MANUAL_UPLOAD",
        "isUpdatedAt": false
      },
      {
        "name": "sourceOwner",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "allowedUsage",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "verificationPolicy",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceNotes",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceEffectiveFrom",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceEffectiveTo",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "mediaType",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "originalFilename",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "validFrom",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "validTo",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "importedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "status",
        "kind": "enum",
        "type": "BrochureStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "IMPORTED",
        "isUpdatedAt": false
      },
      {
        "name": "extractionRaw",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "reviewState",
        "kind": "enum",
        "type": "ReviewState",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "NEEDS_REVIEW",
        "isUpdatedAt": false
      },
      {
        "name": "chain",
        "kind": "object",
        "type": "StoreChain",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "chainId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureToStoreChain"
      },
      {
        "name": "pages",
        "kind": "object",
        "type": "BrochurePage",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureToBrochurePage"
      },
      {
        "name": "extractionRuns",
        "kind": "object",
        "type": "ExtractionRun",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureToExtractionRun"
      },
      {
        "name": "offers",
        "kind": "object",
        "type": "BrochureOffer",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureToBrochureOffer"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "BrochureOffer",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "brochureId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "pageId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "extractionRunId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "retailerProductId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "observationId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "promotionId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceKey",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": true,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceLocation",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "productName",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "brand",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "ean",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "packageQuantity",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "packageUnit",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "packageCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 1,
        "isUpdatedAt": false
      },
      {
        "name": "currentPriceMinor",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "regularPriceMinor",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "promotionText",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "loyaltyRequired",
        "kind": "scalar",
        "type": "Boolean",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": false,
        "isUpdatedAt": false
      },
      {
        "name": "multiBuyText",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "validFrom",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "validTo",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "rawExtraction",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "normalizedOutput",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "confidence",
        "kind": "scalar",
        "type": "Float",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "matchConfidence",
        "kind": "scalar",
        "type": "Float",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "reviewState",
        "kind": "enum",
        "type": "ReviewState",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "NEEDS_REVIEW",
        "isUpdatedAt": false
      },
      {
        "name": "reviewReason",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "brochure",
        "kind": "object",
        "type": "Brochure",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "brochureId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureToBrochureOffer"
      },
      {
        "name": "page",
        "kind": "object",
        "type": "BrochurePage",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "pageId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureOfferToBrochurePage"
      },
      {
        "name": "extractionRun",
        "kind": "object",
        "type": "ExtractionRun",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "extractionRunId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureOfferToExtractionRun"
      },
      {
        "name": "retailerProduct",
        "kind": "object",
        "type": "RetailerProduct",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "retailerProductId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureOfferToRetailerProduct"
      },
      {
        "name": "observation",
        "kind": "object",
        "type": "PriceObservation",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureOfferToPriceObservation"
      },
      {
        "name": "promotion",
        "kind": "object",
        "type": "Promotion",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureOfferToPromotion"
      },
      {
        "name": "reviewItems",
        "kind": "object",
        "type": "ReviewItem",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureOfferToReviewItem"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "BrochurePage",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "brochureId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "pageNumber",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "contentHash",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "textContent",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "imageRef",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "previewFormat",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "previewWidth",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "previewHeight",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "previewGeneratedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "rawMetadata",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "brochure",
        "kind": "object",
        "type": "Brochure",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "brochureId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureToBrochurePage"
      },
      {
        "name": "offers",
        "kind": "object",
        "type": "BrochureOffer",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureOfferToBrochurePage"
      }
    ],
    "uniqueFields": [
      [
        "brochureId",
        "pageNumber"
      ]
    ]
  },
  {
    "name": "ExtractionRun",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "brochureId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "provider",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "model",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "configVersion",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "status",
        "kind": "enum",
        "type": "RunStatus",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "RUNNING",
        "isUpdatedAt": false
      },
      {
        "name": "startedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "finishedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "processedCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "successCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "reviewCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "duplicateCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "failureCount",
        "kind": "scalar",
        "type": "Int",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": 0,
        "isUpdatedAt": false
      },
      {
        "name": "rawInputRef",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "rawOutput",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "errors",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "[]",
        "isUpdatedAt": false
      },
      {
        "name": "brochure",
        "kind": "object",
        "type": "Brochure",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "brochureId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureToExtractionRun"
      },
      {
        "name": "offers",
        "kind": "object",
        "type": "BrochureOffer",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "BrochureOfferToExtractionRun"
      },
      {
        "name": "reviewItems",
        "kind": "object",
        "type": "ReviewItem",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "ExtractionRunToReviewItem"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "ReviewItem",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "brochureOfferId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "extractionRunId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "state",
        "kind": "enum",
        "type": "MatchingReviewState",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "PENDING",
        "isUpdatedAt": false
      },
      {
        "name": "rawValues",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "normalizedValues",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "candidateMatches",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "[]",
        "isUpdatedAt": false
      },
      {
        "name": "confidence",
        "kind": "scalar",
        "type": "Float",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "reason",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "sourceLocation",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "selectedVariantId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "resolvedAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "brochureOffer",
        "kind": "object",
        "type": "BrochureOffer",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "brochureOfferId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "BrochureOfferToReviewItem"
      },
      {
        "name": "extractionRun",
        "kind": "object",
        "type": "ExtractionRun",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "extractionRunId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "ExtractionRunToReviewItem"
      },
      {
        "name": "events",
        "kind": "object",
        "type": "ReviewEvent",
        "isId": false,
        "isList": true,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [],
        "relationToFields": [],
        "relationName": "ReviewEventToReviewItem"
      }
    ],
    "uniqueFields": []
  },
  {
    "name": "ReviewEvent",
    "fields": [
      {
        "name": "id",
        "kind": "scalar",
        "type": "String",
        "isId": true,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "cuid",
          "args": [
            1
          ]
        },
        "isUpdatedAt": false
      },
      {
        "name": "reviewItemId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "actorId",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "action",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "fromState",
        "kind": "enum",
        "type": "MatchingReviewState",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "toState",
        "kind": "enum",
        "type": "MatchingReviewState",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "note",
        "kind": "scalar",
        "type": "String",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false
      },
      {
        "name": "metadata",
        "kind": "scalar",
        "type": "Json",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": "{}",
        "isUpdatedAt": false
      },
      {
        "name": "createdAt",
        "kind": "scalar",
        "type": "DateTime",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": true,
        "default": {
          "name": "now",
          "args": []
        },
        "isUpdatedAt": false
      },
      {
        "name": "reviewItem",
        "kind": "object",
        "type": "ReviewItem",
        "isId": false,
        "isList": false,
        "isRequired": true,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "reviewItemId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "ReviewEventToReviewItem"
      },
      {
        "name": "actor",
        "kind": "object",
        "type": "AdminUser",
        "isId": false,
        "isList": false,
        "isRequired": false,
        "isUnique": false,
        "hasDefaultValue": false,
        "isUpdatedAt": false,
        "relationFromFields": [
          "actorId"
        ],
        "relationToFields": [
          "id"
        ],
        "relationName": "AdminUserToReviewEvent"
      }
    ],
    "uniqueFields": []
  }
];

