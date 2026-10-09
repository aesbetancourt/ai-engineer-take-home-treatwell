import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import { customers, treatments } from './db/schema';

export function registerRoutes(app: any) {
  // ---------------------------------------------------------------- customers

  app.get('/customers', async (req: any, reply: any) => {
    const search = req.query.search;
    let rows: any;
    if (search) {
      rows = db.all(
        sql.raw(
          "SELECT id, name, email, phone, created_at AS createdAt FROM customers WHERE name LIKE '%" +
            search +
            "%' OR email LIKE '%" +
            search +
            "%' ORDER BY name"
        )
      );
    } else {
      rows = await db.select().from(customers).orderBy(customers.name);
    }
    return rows;
  });

  app.get('/customers/:id', async (req: any, reply: any) => {
    try {
      const rows = await db.select().from(customers).where(eq(customers.id, Number(req.params.id)));
      if (rows.length === 0) {
        return reply.code(404).send({ message: 'Customer not found' });
      }
      return rows[0];
    } catch (e) {
      console.log(e);
      return reply.code(500).send({ error: 'Something went wrong' });
    }
  });

  app.post('/customers', async (req: any, reply: any) => {
    const body = req.body as any;
    console.log('creating customer', body);
    if (!body || !body.name || typeof body.name !== 'string') {
      return reply.code(400).send({ error: 'name is required' });
    }
    if (!body.email || typeof body.email !== 'string' || body.email.indexOf('@') === -1) {
      return reply.code(400).send({ errors: ['email is invalid'] });
    }
    if (body.phone !== undefined && body.phone !== null && typeof body.phone !== 'string') {
      return reply.code(400).send('phone must be a string');
    }
    const inserted = await db
      .insert(customers)
      .values({
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone || null,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return reply.code(201).send(inserted[0]);
  });

  // --------------------------------------------------------------- treatments

  app.get('/treatments', (req: any, reply: any) => {
    if (req.query.category) {
      return db
        .select()
        .from(treatments)
        .where(eq(treatments.category, req.query.category))
        .then((rows) => rows);
    }
    return db
      .select()
      .from(treatments)
      .orderBy(treatments.category, treatments.name)
      .then((rows) => rows);
  });

  app.get('/treatments/:id', async (request: any, res: any) => {
    const rows = await db.select().from(treatments).where(eq(treatments.id, Number(request.params.id)));
    if (rows.length === 0) {
      return res.code(404).send({ error: 'Treatment not found' });
    }
    return rows[0];
  });

  app.post('/treatments', async (req: any, reply: any) => {
    const body = req.body as any;
    if (!body || !body.name || typeof body.name !== 'string') {
      return reply.code(400).send({ message: 'name is required' });
    }
    if (!body.category || typeof body.category !== 'string') {
      return reply.code(400).send({ message: 'category is required' });
    }
    if (typeof body.price !== 'number' || body.price <= 0) {
      return reply.code(400).send({ message: 'price must be a positive number' });
    }
    if (!Number.isInteger(body.durationMin) || body.durationMin <= 0) {
      return reply.code(400).send({ message: 'durationMin must be a positive integer' });
    }
    const inserted = await db
      .insert(treatments)
      .values({
        name: body.name.trim(),
        category: body.category.trim(),
        price: body.price,
        durationMin: body.durationMin,
      })
      .returning();
    return reply.code(201).send(inserted[0]);
  });
}
