# AWS cost and architecture notes

This is a relative design review, not a quote. Actual spend depends on region, traffic, storage, logs, and current provider pricing.

| Area | Previous baseline | Current baseline |
|---|---|---|
| Database | Aurora PostgreSQL Serverless v2 | One DynamoDB table plus one GSI, both provisioned at 5 RCU / 5 WCU |
| Secrets | Two Secrets Manager secrets for database credentials and URL | One externally bootstrapped SSM Parameter Store Standard SecureString for the optional Expo token |
| Lambda artifact | Two container images in ECR | Per-function ZIP bundles built with Serverless Framework v4 esbuild |
| Networking | Two private subnets, interface endpoints, security groups | No application VPC resources; AWS SDK calls use service public endpoints |
| Local development | PostgreSQL and Redis in Docker | DynamoDB Local and Redis in Docker |

## Cost implications

- DynamoDB provisioned capacity is billed while allocated, even when idle. The table and GSI each allocate 5 RCU and 5 WCU; monitor throttles and consumed capacity before lowering, raising, or autoscaling them.
- Standard Parameter Store parameters have a different pricing model from Secrets Manager, but API interactions and a customer-managed KMS key can still incur charges. This stack uses the default AWS-managed SSM key.
- ZIP deployment removes ECR image storage and scanning from this service. Lambda execution, API Gateway, SQS, S3, CloudWatch, and data transfer still incur normal charges.
- Removing VPC interface endpoints avoids their hourly and data-processing charges. It also means Lambda-to-AWS-service traffic is no longer forced through private endpoints.
- Point-in-time recovery and DynamoDB backups add storage charges but are enabled to protect a retained source-of-truth table.

## Operational trigger points

Revisit capacity when `ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits`, or throttled-request metrics approach the provisioned limit. Add Application Auto Scaling if traffic becomes variable but predictable enough to remain in provisioned mode. Revisit GSIs only from concrete access patterns because each provisioned GSI adds both write amplification and standing capacity cost.
