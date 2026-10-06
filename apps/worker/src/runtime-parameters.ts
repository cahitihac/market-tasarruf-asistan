import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

type SsmClient = { send(command: unknown): Promise<{ Parameter?: { Value?: string } }> };
type SsmModule = {
  SSMClient: new (config?: unknown) => SsmClient;
  GetParameterCommand: new (input: { Name: string; WithDecryption: boolean }) => unknown;
};

let client: SsmClient | undefined;
let loaded: Promise<void> | undefined;

function ssmModule() {
  return require('@aws-sdk/client-ssm') as SsmModule;
}

function ssm() {
  return client ??= new (ssmModule().SSMClient)({});
}

/** Load runtime-only secrets once per warm Lambda environment. */
export function loadRuntimeParameters() {
  return loaded ??= (async () => {
    const name = process.env.EXPO_PUSH_ACCESS_TOKEN_PARAMETER;
    if (!name || process.env.EXPO_PUSH_ACCESS_TOKEN) return;
    const module = ssmModule();
    const response = await ssm().send(new module.GetParameterCommand({ Name: name, WithDecryption: true }));
    const value = response.Parameter?.Value;
    if (!value) throw new Error(`SSM parameter ${name} has no value`);
    process.env.EXPO_PUSH_ACCESS_TOKEN = value;
  })();
}
