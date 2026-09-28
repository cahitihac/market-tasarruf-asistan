import type { FastifyInstance, FastifyReply } from 'fastify';
import { createNeedSchema, needConstraintsSchema, updateNeedSchema, type NeedConstraints } from '@market/contracts';
import { normalizeName } from '@market/domain';
import { Prisma } from '@market/database';
import { allCategories, archiveNeed, createNeed, findCategory, getNeed, listNeeds, updateNeed, type NeedRecord } from './needs.repository.js';
import { matchingOffers } from '@market/evaluation';
import { requireConsumer } from './consumer-auth.js';

function validationError(reply: FastifyReply, issues: Array<{ path: (string | number)[]; message: string }>) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', issues: issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) });
}

function serializeNeed(need: NeedRecord) {
  return { id: need.id, name: need.title, category: need.category?.slug ?? null,
    ...needConstraintsSchema.parse(need.constraints), active: need.active, createdAt: need.createdAt };
}

async function resolveCategory(name: string, supplied?: string): Promise<{ id: string | null; error?: string }> {
  if (supplied) {
    const slug = supplied.toLocaleLowerCase('tr-TR').replace(/[\s_]+/g, '-');
    const category = await findCategory(slug);
    return category ? { id: category.id } : { id: null, error: `Unknown category: ${supplied}` };
  }
  const categories = await allCategories();
  const inferred = categories.find(category => normalizeName(category.name) === normalizeName(name) || normalizeName(category.slug) === normalizeName(name));
  return { id: inferred?.id ?? null };
}

function constraintsFromInput(input: Record<string, unknown>): NeedConstraints {
  const { name: _name, category: _category, ...constraints } = input;
  void _name;
  void _category;
  return needConstraintsSchema.parse(constraints);
}

export async function registerNeedRoutes(app: FastifyInstance) {
  app.get('/needs', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    return { needs: (await listNeeds(user.id)).map(serializeNeed) };
  });

  app.post('/needs', async (request, reply) => {
    const parsed = createNeedSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.issues);
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const category = await resolveCategory(parsed.data.name, parsed.data.category);
    if (category.error) return reply.code(422).send({ error: 'UNKNOWN_CATEGORY', message: category.error });
    const need = await createNeed({ userId: user.id, title: parsed.data.name, categoryId: category.id,
      constraints: constraintsFromInput(parsed.data) as Prisma.InputJsonValue });
    return reply.code(201).send(serializeNeed(need));
  });

  app.get<{ Params: { id: string } }>('/needs/:id', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const need = await getNeed(user.id, request.params.id);
    if (!need) return reply.code(404).send({ error: 'NEED_NOT_FOUND' });
    return serializeNeed(need);
  });

  app.patch<{ Params: { id: string } }>('/needs/:id', async (request, reply) => {
    const parsed = updateNeedSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.issues);
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const existing = await getNeed(user.id, request.params.id);
    if (!existing) return reply.code(404).send({ error: 'NEED_NOT_FOUND' });
    const title = parsed.data.name ?? existing.title;
    const category: { id: string | null; error?: string } = parsed.data.category === null ? { id: null } : parsed.data.category !== undefined ? await resolveCategory(title, parsed.data.category)
      : parsed.data.name !== undefined ? await resolveCategory(title) : { id: existing.categoryId };
    if (category.error) return reply.code(422).send({ error: 'UNKNOWN_CATEGORY', message: category.error });
    const constraints: Record<string, unknown> = { ...needConstraintsSchema.parse(existing.constraints) };
    for (const [key, value] of Object.entries(parsed.data)) {
      if (key === 'name' || key === 'category') continue;
      if (value === null) delete constraints[key];
      else constraints[key] = value;
    }
    const updated = await updateNeed(existing.id, { title,
      categoryId: parsed.data.category === null ? null : category.id ?? existing.categoryId,
      constraints: needConstraintsSchema.parse(constraints) as Prisma.InputJsonValue });
    return serializeNeed(updated);
  });

  app.delete<{ Params: { id: string } }>('/needs/:id', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const existing = await getNeed(user.id, request.params.id);
    if (!existing) return reply.code(404).send({ error: 'NEED_NOT_FOUND' });
    await archiveNeed(existing.id);
    return reply.code(204).send();
  });

  app.get<{ Params: { id: string } }>('/needs/:id/offers', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const need = await getNeed(user.id, request.params.id);
    if (!need) return reply.code(404).send({ error: 'NEED_NOT_FOUND' });
    const offers = await matchingOffers(need, needConstraintsSchema.parse(need.constraints));
    return { needId: need.id, count: offers.length, offers };
  });
}
