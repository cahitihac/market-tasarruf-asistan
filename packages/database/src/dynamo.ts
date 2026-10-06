/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { modelMetadata, type ModelField, type ModelMetadata } from './model-metadata.js';

type Row = Record<string, any>;
type Delegate = {
  findMany(args?: Row): Promise<Row[]>;
  findFirst(args?: Row): Promise<Row | null>;
  findUnique(args?: Row): Promise<Row | null>;
  findFirstOrThrow(args?: Row): Promise<Row>;
  findUniqueOrThrow(args?: Row): Promise<Row>;
  create(args: Row): Promise<Row>;
  update(args: Row): Promise<Row>;
  upsert(args: Row): Promise<Row>;
  createMany(args: Row): Promise<{ count: number }>;
  updateMany(args?: Row): Promise<{ count: number }>;
  delete(args: Row): Promise<Row>;
  deleteMany(args?: Row): Promise<{ count: number }>;
  count(args?: Row): Promise<number>;
};
type Model = ModelMetadata;
type Field = ModelField;
type Change = { kind: 'put'; model: string; id: string; value: Row } | { kind: 'delete'; model: string; id: string };
const models = new Map(modelMetadata.map(model => [model.name, model]));
const delegateName = (name: string) => name[0]!.toLowerCase() + name.slice(1);
const idField = (model: Model) => model.fields.find(field => field.isId)?.name ?? 'id';

export class DatabaseRequestError extends Error {
  constructor(message: string, readonly code: string) { super(message); this.name = 'DatabaseRequestError'; }
}

interface Store {
  list(model: string): Promise<Row[]>;
  get(model: string, id: string): Promise<Row | null>;
  put(model: string, id: string, value: Row): Promise<void>;
  delete(model: string, id: string): Promise<void>;
  commit(changes: Change[]): Promise<void>;
  ready(): Promise<void>;
}

const memory = new Map<string, Map<string, Row>>();
let memoryUnique = new Map<string, string>();
class MemoryStore implements Store {
  private values(model: string) { let value = memory.get(model); if (!value) memory.set(model, value = new Map()); return value; }
  async list(model: string) { return [...this.values(model).values()].map(value => structuredClone(value)); }
  async get(model: string, id: string) { const value = this.values(model).get(id); return value ? structuredClone(value) : null; }
  async put(model: string, id: string, value: Row) { await this.commit([{ kind: 'put', model, id, value }]); }
  async delete(model: string, id: string) { await this.commit([{ kind: 'delete', model, id }]); }
  async commit(changes: Change[]) {
    const touched = new Map<string, Map<string, Row>>(); const nextUnique = new Map(memoryUnique);
    for (const change of changes) if (!touched.has(change.model)) touched.set(change.model, new Map(this.values(change.model)));
    for (const change of changes) {
      const current = touched.get(change.model)!.get(change.id);
      for (const marker of uniqueMarkers(change.model, current ?? {})) {
        const key = `${marker.PK}\u0000${marker.SK}`; if (nextUnique.get(key) === change.id) nextUnique.delete(key);
      }
    }
    for (const change of changes) if (change.kind === 'put') for (const marker of uniqueMarkers(change.model, change.value)) {
      const key = `${marker.PK}\u0000${marker.SK}`; const owner = nextUnique.get(key);
      if (owner && owner !== change.id) throw new DatabaseRequestError('Unique constraint failed', 'P2002');
      nextUnique.set(key, change.id);
    }
    for (const change of changes) {
      const values = touched.get(change.model)!;
      if (change.kind === 'put') values.set(change.id, structuredClone(change.value)); else values.delete(change.id);
    }
    for (const [model, values] of touched) memory.set(model, values); memoryUnique = nextUnique;
  }
  async ready() {}
}

function mapValue(value: any, decode = false): any {
  if (!decode && value instanceof Date) return value.toISOString();
  if (decode && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return new Date(value);
  if (Array.isArray(value)) return value.map(item => mapValue(item, decode));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapValue(item, decode)]));
  return value;
}
function itemValue(item: Row) { const { PK: _pk, SK: _sk, GSI1PK: _gpk, GSI1SK: _gsk, entityType: _type,
  schemaVersion: _version, expiresAtEpoch: _ttl, ...value } = item; return mapValue(value, true); }
function dynamoItem(model: string, id: string, value: Row) { const time = value.createdAt ?? value.startedAt ?? value.importedAt ?? value.updatedAt;
  const expiresAtEpoch = value.expiresAt instanceof Date ? Math.floor(value.expiresAt.getTime() / 1000) : undefined;
  return { ...mapValue(value), PK: `MODEL#${model}`, SK: `ID#${id}`, GSI1PK: `ENTITY#${model}`,
    GSI1SK: `${time instanceof Date ? time.toISOString() : time ?? '0'}#${id}`, entityType: model, schemaVersion: 1,
    ...(expiresAtEpoch ? { expiresAtEpoch } : {}) }; }
function uniqueMarkers(modelName: string, value: Row) {
  const model = models.get(modelName); if (!model) return [];
  const keys = [...model.fields.filter(field => field.isUnique).map(field => [field.name]), ...model.uniqueFields];
  return keys.filter(fields => fields.every(field => value[field] != null)).map(fields => ({
    PK: `UNIQUE#${modelName}`, SK: `FIELDS#${fields.join('+')}#${encodeURIComponent(JSON.stringify(fields.map(field => mapValue(value[field]))))}`,
  }));
}

class DynamoStore implements Store {
  private readonly base: DynamoDBClient;
  private readonly document: DynamoDBDocumentClient;
  constructor(private readonly table: string) {
    const endpoint = process.env.DYNAMODB_ENDPOINT ?? (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8000');
    this.base = new DynamoDBClient(endpoint ? { endpoint, region: process.env.AWS_REGION ?? 'eu-central-1',
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' } } : {});
    this.document = DynamoDBDocumentClient.from(this.base, { marshallOptions: { removeUndefinedValues: true } });
  }
  async list(model: string) {
    const rows: Row[] = []; let key: Row | undefined;
    do { const result = await this.document.send(new QueryCommand({ TableName: this.table,
      KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': `MODEL#${model}` }, ExclusiveStartKey: key }));
      rows.push(...(result.Items ?? []).map(itemValue)); key = result.LastEvaluatedKey; } while (key);
    return rows;
  }
  async get(model: string, id: string) { const result = await this.document.send(new GetCommand({ TableName: this.table,
    Key: { PK: `MODEL#${model}`, SK: `ID#${id}` }, ConsistentRead: true })); return result.Item ? itemValue(result.Item) : null; }
  async put(model: string, id: string, value: Row) { await this.commit([{ kind: 'put', model, id, value }]); }
  async delete(model: string, id: string) { await this.commit([{ kind: 'delete', model, id }]); }
  async commit(changes: Change[]) {
    if (!changes.length) return;
    const prepared = await Promise.all(changes.map(async change => ({ change, current: await this.get(change.model, change.id) })));
    const claims = new Map<string, string>(); const operations: Row[] = [];
    for (const { change, current } of prepared) {
      const oldMarkers = uniqueMarkers(change.model, current ?? {}); const nextMarkers = change.kind === 'put' ? uniqueMarkers(change.model, change.value) : [];
      const nextKeys = new Set(nextMarkers.map(marker => `${marker.PK}\u0000${marker.SK}`));
      operations.push(change.kind === 'put'
        ? { Put: { TableName: this.table, Item: dynamoItem(change.model, change.id, change.value) } }
        : { Delete: { TableName: this.table, Key: { PK: `MODEL#${change.model}`, SK: `ID#${change.id}` } } });
      for (const marker of oldMarkers) if (!nextKeys.has(`${marker.PK}\u0000${marker.SK}`)) operations.push({ Delete: {
        TableName: this.table, Key: marker, ConditionExpression: 'attribute_not_exists(PK) OR ownerId = :ownerId',
        ExpressionAttributeValues: { ':ownerId': change.id },
      } });
      for (const marker of nextMarkers) {
        const key = `${marker.PK}\u0000${marker.SK}`; const owner = claims.get(key);
        if (owner && owner !== change.id) throw new DatabaseRequestError('Unique constraint failed', 'P2002');
        claims.set(key, change.id);
        operations.push({ Put: { TableName: this.table, Item: { ...marker, entityType: 'UniqueConstraint', ownerId: change.id },
          ConditionExpression: 'attribute_not_exists(PK) OR ownerId = :ownerId', ExpressionAttributeValues: { ':ownerId': change.id } } });
      }
    }
    if (operations.length > 100) throw new DatabaseRequestError('A DynamoDB transaction supports at most 100 writes including unique keys', 'TRANSACTION_TOO_LARGE');
    try { await this.document.send(new TransactWriteCommand({ TransactItems: operations })); }
    catch (error) { if ((error as Row).CancellationReasons?.some((reason: Row) => reason.Code === 'ConditionalCheckFailed')) {
      throw new DatabaseRequestError('Unique constraint failed', 'P2002'); } throw error; }
  }
  async ready() { await this.base.send(new DescribeTableCommand({ TableName: this.table })); }
}

class TransactionStore implements Store {
  private readonly changes = new Map<string, Change>();
  constructor(private readonly base: Store) {}
  private key(model: string, id: string) { return `${model}\u0000${id}`; }
  async list(model: string) { const values = new Map((await this.base.list(model)).map(row => [String(row.id), row]));
    for (const change of this.changes.values()) if (change.model === model) {
      if (change.kind === 'put') values.set(change.id, structuredClone(change.value)); else values.delete(change.id);
    } return [...values.values()]; }
  async get(model: string, id: string) { const change = this.changes.get(this.key(model, id));
    if (change) return change.kind === 'put' ? structuredClone(change.value) : null; return this.base.get(model, id); }
  async put(model: string, id: string, value: Row) { this.changes.set(this.key(model, id), { kind: 'put', model, id, value: structuredClone(value) }); }
  async delete(model: string, id: string) { this.changes.set(this.key(model, id), { kind: 'delete', model, id }); }
  async commit(changes: Change[]) { for (const change of changes) this.changes.set(this.key(change.model, change.id), change); }
  async flush() { await this.base.commit([...this.changes.values()]); }
  async ready() { await this.base.ready(); }
}

function equal(left: any, right: any) { if (left instanceof Date || right instanceof Date) return new Date(left).getTime() === new Date(right).getTime();
  return left === right || typeof left === 'bigint' && String(left) === String(right); }
function compare(left: any, right: any) { const a = left instanceof Date ? left.getTime() : left; const b = right instanceof Date ? right.getTime() : right;
  return a < b ? -1 : a > b ? 1 : 0; }
function defaultValue(field: Field) {
  const value: any = field.default; if (value?.name === 'now') return new Date(); if (value?.name === 'cuid' || value?.name === 'uuid') return crypto.randomUUID();
  if (typeof value === 'string' && field.type === 'Json') try { return JSON.parse(value); } catch { return value; }
  return value;
}

export class DynamoDataClient {
  readonly user!: Delegate;
  readonly consumerSession!: Delegate;
  readonly consumerAccountToken!: Delegate;
  readonly adminUser!: Delegate;
  readonly adminSession!: Delegate;
  readonly adminAuditLog!: Delegate;
  readonly storeChain!: Delegate;
  readonly storeBranch!: Delegate;
  readonly category!: Delegate;
  readonly brand!: Delegate;
  readonly product!: Delegate;
  readonly productVariant!: Delegate;
  readonly retailerProduct!: Delegate;
  readonly priceObservation!: Delegate;
  readonly priceHistory!: Delegate;
  readonly promotion!: Delegate;
  readonly promotionCondition!: Delegate;
  readonly userLocation!: Delegate;
  readonly userNeed!: Delegate;
  readonly userProductPreference!: Delegate;
  readonly deal!: Delegate;
  readonly recommendation!: Delegate;
  readonly alert!: Delegate;
  readonly notification!: Delegate;
  readonly pushDevice!: Delegate;
  readonly notificationPreference!: Delegate;
  readonly notificationDelivery!: Delegate;
  readonly evaluationRun!: Delegate;
  readonly ingestionRun!: Delegate;
  readonly dataSource!: Delegate;
  readonly dataSourceApprovalEvent!: Delegate;
  readonly operationalAlert!: Delegate;
  readonly ingestionRow!: Delegate;
  readonly ingestionReviewItem!: Delegate;
  readonly ingestionReviewEvent!: Delegate;
  readonly brochure!: Delegate;
  readonly brochureOffer!: Delegate;
  readonly brochurePage!: Delegate;
  readonly extractionRun!: Delegate;
  readonly reviewItem!: Delegate;
  readonly reviewEvent!: Delegate;
  private readonly store: Store;
  constructor(store?: Store) {
    if (store) { this.store = store; for (const model of models.values()) (this as Row)[delegateName(model.name)] = this.delegate(model); return; }
    const inMemory = process.env.NODE_ENV === 'test' || process.env.DYNAMODB_ENDPOINT === 'memory';
    const table = process.env.DYNAMODB_TABLE ?? (process.env.NODE_ENV === 'production' ? undefined : 'market-assistant-local');
    if (!inMemory && !table) throw new Error('DYNAMODB_TABLE is required; use DYNAMODB_ENDPOINT=memory only for isolated tests');
    this.store = inMemory ? new MemoryStore() : new DynamoStore(table!);
    for (const model of models.values()) (this as Row)[delegateName(model.name)] = this.delegate(model);
  }
  private relation(model: Model, field: Field) {
    if (field.relationFromFields?.length) return { model: models.get(field.type)!, local: field.relationFromFields[0], target: field.relationToFields?.[0] ?? 'id', many: false };
    const target = models.get(field.type)!; const opposite = target.fields.find(item => item.kind === 'object' && item.relationName === field.relationName && item.relationFromFields?.length);
    return { model: target, foreign: opposite?.relationFromFields?.[0], source: opposite?.relationToFields?.[0] ?? idField(model), many: field.isList };
  }
  private async related(model: Model, record: Row, field: Field) {
    const relation = this.relation(model, field); const rows = await this.store.list(relation.model.name);
    if (relation.local) return rows.find(row => equal(row[relation.target!], record[relation.local!])) ?? null;
    const found = rows.filter(row => equal(row[relation.foreign!], record[relation.source!])); return relation.many ? found : found[0] ?? null;
  }
  private async matches(model: Model, record: Row, where?: Row): Promise<boolean> {
    if (!where) return true;
    if (where.AND && !(await Promise.all((Array.isArray(where.AND) ? where.AND : [where.AND]).map((part: Row) => this.matches(model, record, part)))).every(Boolean)) return false;
    if (where.OR && !(await Promise.all((Array.isArray(where.OR) ? where.OR : [where.OR]).map((part: Row) => this.matches(model, record, part)))).some(Boolean)) return false;
    if (where.NOT && (await Promise.all((Array.isArray(where.NOT) ? where.NOT : [where.NOT]).map((part: Row) => this.matches(model, record, part)))).every(Boolean)) return false;
    for (const [name, ruleValue] of Object.entries(where)) {
      if (['AND', 'OR', 'NOT'].includes(name) || ruleValue === undefined) continue; const field = model.fields.find(item => item.name === name);
      if (!field && ruleValue && typeof ruleValue === 'object') { if (!(await this.matches(model, record, ruleValue))) return false; continue; }
      if (field?.kind === 'object') { const relation = this.relation(model, field); const value = await this.related(model, record, field); const rule = ruleValue as Row;
        if (relation.many) { const rows = value as Row[];
          if (rule.some && !(await Promise.all(rows.map(row => this.matches(relation.model, row, rule.some)))).some(Boolean)) return false;
          if (rule.none && (await Promise.all(rows.map(row => this.matches(relation.model, row, rule.none)))).some(Boolean)) return false;
          if (rule.every && !(await Promise.all(rows.map(row => this.matches(relation.model, row, rule.every)))).every(Boolean)) return false;
        } else if (value == null || !(await this.matches(relation.model, value, rule.is ?? rule))) return false; continue; }
      const value = record[name]; const rule = ruleValue as any;
      if (rule && typeof rule === 'object' && !Array.isArray(rule) && !(rule instanceof Date)) {
        if ('equals' in rule && !equal(value, rule.equals) || rule.in && !rule.in.some((item: any) => equal(value, item)) || rule.notIn && rule.notIn.some((item: any) => equal(value, item))) return false;
        if ('lt' in rule && compare(value, rule.lt) >= 0 || 'lte' in rule && compare(value, rule.lte) > 0 || 'gt' in rule && compare(value, rule.gt) <= 0 || 'gte' in rule && compare(value, rule.gte) < 0) return false;
        const text = (item: any) => rule.mode === 'insensitive' ? String(item ?? '').toLowerCase() : String(item ?? '');
        if ('contains' in rule && !text(value).includes(text(rule.contains)) || 'startsWith' in rule && !text(value).startsWith(text(rule.startsWith))) return false;
        if ('not' in rule && (typeof rule.not === 'object' ? await this.matches(model, record, { [name]: rule.not }) : equal(value, rule.not))) return false;
      } else if (!equal(value, rule)) return false;
    } return true;
  }
  private order(rows: Row[], value: any) { const rules = value ? Array.isArray(value) ? value : [value] : [];
    return [...rows].sort((a, b) => { for (const rule of rules) for (const [field, direction] of Object.entries(rule)) { const result = compare(a[field], b[field]); if (result) return direction === 'desc' ? -result : result; } return 0; }); }
  private async output(model: Model, row: Row, args: Row = {}) {
    if (args.select) { const result: Row = {}; for (const [name, option] of Object.entries(args.select)) if (option) { const field = model.fields.find(item => item.name === name);
      result[name] = field?.kind === 'object' ? await this.relationOutput(model, row, field, option) : row[name]; } return result; }
    const result = { ...row }; for (const [name, option] of Object.entries(args.include ?? {})) if (option) {
      if (name === '_count') { const count: Row = {}; for (const key of Object.keys((option as Row).select ?? {})) { const field = model.fields.find(item => item.name === key)!;
        const value = await this.related(model, row, field); count[key] = Array.isArray(value) ? value.length : value ? 1 : 0; } result._count = count;
      } else { const field = model.fields.find(item => item.name === name)!; result[name] = await this.relationOutput(model, row, field, option); } } return result;
  }
  private async relationOutput(model: Model, row: Row, field: Field, option: any) { const relation = this.relation(model, field); const value = await this.related(model, row, field);
    if (value == null || option === true) return value; const args = typeof option === 'object' ? option : {};
    if (!Array.isArray(value)) return this.output(relation.model, value, args); let rows = value;
    if (args.where) rows = (await Promise.all(rows.map(async item => await this.matches(relation.model, item, args.where) ? item : null))).filter((item): item is Row => item !== null);
    rows = this.order(rows, args.orderBy); if (args.take != null) rows = rows.slice(0, args.take); return Promise.all(rows.map(item => this.output(relation.model, item, args)));
  }
  private createRow(model: Model, data: Row) { const row: Row = {};
    for (const field of model.fields.filter(item => item.kind !== 'object')) { if (!field.isRequired) row[field.name] = null;
      if (field.hasDefaultValue) row[field.name] = defaultValue(field); if (field.isUpdatedAt) row[field.name] = new Date(); }
    for (const [name, value] of Object.entries(data)) if (value !== undefined) row[name] = value;
    row[idField(model)] ??= crypto.randomUUID(); return row; }
  private updateRow(model: Model, row: Row, data: Row) { const value = { ...row }; for (const [name, change] of Object.entries(data)) {
    if (change === undefined) continue;
    if (change && typeof change === 'object' && !Array.isArray(change) && !(change instanceof Date)) value[name] = 'increment' in change ? (value[name] ?? 0) + change.increment : 'decrement' in change ? (value[name] ?? 0) - change.decrement : 'set' in change ? change.set : change;
    else value[name] = change; } for (const field of model.fields) if (field.isUpdatedAt) value[field.name] = new Date(); return value; }
  private delegate(model: Model) {
    const findMany = async (args: Row = {}) => { let rows = (await Promise.all((await this.store.list(model.name)).map(async row => await this.matches(model, row, args.where) ? row : null))).filter((row): row is Row => row !== null);
      rows = this.order(rows, args.orderBy); if (args.skip) rows = rows.slice(args.skip); if (args.take != null) rows = rows.slice(0, args.take); return Promise.all(rows.map(row => this.output(model, row, args))); };
    const findFirst = async (args: Row = {}) => (await findMany({ ...args, take: 1 }))[0] ?? null; const findUnique = findFirst;
    const required = (method: any) => async (args: Row) => { const value = await method(args); if (!value) throw new DatabaseRequestError(`${model.name} not found`, 'P2025'); return value; };
    const create = async (args: Row) => { const row = this.createRow(model, args.data); await this.store.put(model.name, String(row[idField(model)]), row); return this.output(model, row, args); };
    const update = async (args: Row) => { const current = await findUnique({ where: args.where }); if (!current) throw new DatabaseRequestError(`${model.name} not found`, 'P2025'); const row = this.updateRow(model, current, args.data);
      await this.store.put(model.name, String(row[idField(model)]), row); return this.output(model, row, args); };
    return { findMany, findFirst, findUnique, findFirstOrThrow: required(findFirst), findUniqueOrThrow: required(findUnique), create, update,
      upsert: async (args: Row) => await findUnique({ where: args.where }) ? update({ ...args, data: args.update }) : create({ ...args, data: args.create }),
      createMany: async (args: Row) => { let count = 0; for (const data of args.data) try { await create({ data }); count++; } catch (error) { if (!args.skipDuplicates || !(error instanceof DatabaseRequestError) || error.code !== 'P2002') throw error; } return { count }; },
      updateMany: async (args: Row = {}) => { const rows = await findMany({ where: args.where }); for (const row of rows) { const value = this.updateRow(model, row, args.data); await this.store.put(model.name, String(value[idField(model)]), value); } return { count: rows.length }; },
      delete: async (args: Row) => { const row = await required(findUnique)({ where: args.where }); await this.store.delete(model.name, String(row[idField(model)])); return row; },
      deleteMany: async (args: Row = {}) => { const rows = await findMany({ where: args.where }); for (const row of rows) await this.store.delete(model.name, String(row[idField(model)])); return { count: rows.length }; },
      count: async (args: Row = {}) => (await findMany({ where: args.where })).length };
  }
  async $transaction<T>(callback: (database: DynamoDataClient) => Promise<T>, _options?: { timeout?: number }) {
    if (typeof callback !== 'function') throw new DatabaseRequestError('Transactions require a callback', 'INVALID_TRANSACTION');
    const store = new TransactionStore(this.store); const result = await callback(new DynamoDataClient(store)); await store.flush(); return result;
  }
  async $disconnect() {}
  async $queryRaw(_query?: TemplateStringsArray) { await this.store.ready(); return [{ ok: 1 }]; }
}
