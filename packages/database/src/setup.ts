import { CreateTableCommand, DescribeTableCommand, DynamoDBClient, ResourceNotFoundException } from '@aws-sdk/client-dynamodb';

const tableName = process.env.DYNAMODB_TABLE ?? 'market-assistant-local';
const endpoint = process.env.DYNAMODB_ENDPOINT;
const client = new DynamoDBClient(endpoint ? { endpoint, region: process.env.AWS_REGION ?? 'eu-central-1',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' } } : {});

try {
  await client.send(new DescribeTableCommand({ TableName: tableName }));
  console.log(`DynamoDB table ${tableName} already exists`);
} catch (error) {
  if (!(error instanceof ResourceNotFoundException)) throw error;
  await client.send(new CreateTableCommand({ TableName: tableName, BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    AttributeDefinitions: [{ AttributeName: 'PK', AttributeType: 'S' }, { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, { AttributeName: 'GSI1SK', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'SK', KeyType: 'RANGE' }],
    GlobalSecondaryIndexes: [{ IndexName: 'GSI1', KeySchema: [{ AttributeName: 'GSI1PK', KeyType: 'HASH' },
      { AttributeName: 'GSI1SK', KeyType: 'RANGE' }], Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 } }] }));
  console.log(`Created DynamoDB table ${tableName}`);
}
