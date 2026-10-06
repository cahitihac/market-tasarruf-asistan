# AWS serverless deployment foundation

Serverless Framework v4 is the source of truth for the AWS dev/beta environment. The root configuration is [`serverless.yml`](serverless.yml); CloudFormation fragments are in [`resources/`](resources/).

The stack targets `eu-central-1` and the `dev` stage by default. It provisions API Gateway HTTP API, ZIP-based Node.js Lambdas, a provisioned-capacity DynamoDB table, SQS queues and DLQs, EventBridge schedules, private S3 storage, and CloudWatch logs and alarms. It does not provision Aurora, Secrets Manager, ECR repositories, a VPC, NAT gateways, or interface endpoints.

## Lambda packaging

Serverless Framework v4's built-in esbuild support bundles the TypeScript entry points in [`handlers/`](handlers/) into individual ZIP artifacts. No Docker daemon or ECR image build is involved.

```sh
pnpm aws:print
pnpm aws:package
```

`serverless package` writes artifacts under `.serverless/` and does not create application resources. Serverless Framework v4 may require account authentication even for packaging.

## DynamoDB

`resources/database.yml` creates `market-assistant-<stage>` with:

- provisioned capacity: 5 RCU and 5 WCU on the table and `GSI1`;
- generic `PK`/`SK` primary keys and `GSI1PK`/`GSI1SK` access-pattern keys;
- point-in-time recovery, AWS-owned KMS encryption, and an `expiresAtEpoch` TTL attribute;
- retained data if the stack or table resource is replaced.

Capacity is intentionally fixed and conservative for the first environment. Review CloudWatch consumed-capacity and throttling metrics before changing it or adding autoscaling.

The application runtime uses the DynamoDB compatibility client in `@market/database`. Review its transaction and access-pattern hardening notes before production rollout. See [`docs/DYNAMODB_MIGRATION.md`](../../docs/DYNAMODB_MIGRATION.md).

## SSM Parameter Store SecureString

CloudFormation cannot create an `AWS::SSM::Parameter` whose type is `SecureString`. Bootstrap the Standard-tier parameter outside CloudFormation, without placing the value in source or command history:

```sh
read -rs EXPO_PUSH_ACCESS_TOKEN
export EXPO_PUSH_ACCESS_TOKEN
aws ssm put-parameter \
  --region eu-central-1 \
  --name /market-assistant/dev/expo-push-access-token \
  --type SecureString \
  --tier Standard \
  --value "$EXPO_PUSH_ACCESS_TOKEN" \
  --overwrite
unset EXPO_PUSH_ACCESS_TOKEN
```

The public-push Lambda receives only the parameter name. It calls `GetParameter` with decryption once per warm execution environment. The shared Lambda role is restricted to that stage-qualified parameter ARN. If Expo push security is not enabled, either create the parameter with an intentionally managed placeholder or remove the function-level parameter setting and IAM grant.

## Remaining deployment requirements

- Define and run a one-time PostgreSQL-to-DynamoDB import if existing data must be retained.
- Create the SSM SecureString for each stage that will send authenticated Expo pushes.
- Confirm AWS account, deployment identity, budgets, desired stage names, CORS/admin origins, and data retention requirements.
- Validate ZIP contents and sizes with `unzip -Z1 infra/aws/.serverless/*.zip` after packaging.

See [`docs/AWS_COST_NOTES.md`](../../docs/AWS_COST_NOTES.md) for cost tradeoffs.
