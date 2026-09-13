const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const { promisify } = require('node:util');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const scrypt = promisify(crypto.scrypt);
const PORT = Number(process.env.PORT || 3000);
const SESSION_DAYS = 7;

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

function text(value, max = 255) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function required(value, name, max = 255) {
  const result = text(value, max);
  if (!result) throw new Error(`${name} is required`);
  return result;
}
function readCookie(req, name) {
  const cookies = Object.fromEntries(
    String(req.headers.cookie || '').split(';').filter(Boolean).map(part => {
      const index = part.indexOf('=');
      return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
    })
  );
  return cookies[name];
}
function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('Password must contain at least 12 characters');
  }
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${Buffer.from(hash).toString('hex')}`;
}
async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, 'hex'), 64));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
function setSessionCookie(res, token, expiresAt) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`);
}
async function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.session.create({ data: { tokenHash: tokenHash(token), userId, expiresAt } });
  setSessionCookie(res, token, expiresAt);
}
async function requireAuth(req, res, next) {
  try {
    const token = readCookie(req, 'session');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const session = await prisma.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.active) {
      return res.status(401).json({ error: 'Session expired' });
    }
    req.auth = {
      sessionId: session.id,
      userId: session.user.id,
      organizationId: session.user.organizationId,
      role: session.user.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const email = required(req.body.email, 'email').toLowerCase();
    const name = required(req.body.name, 'name');
    const organizationName = required(req.body.organizationName, 'organizationName');
    const passwordHash = await hashPassword(req.body.password);
    const result = await prisma.$transaction(async tx => {
      const organization = await tx.organization.create({ data: { name: organizationName } });
      const workspace = await tx.workspace.create({
        data: { organizationId: organization.id, name: 'Primary Market', targetZipCodes: [] },
      });
      const user = await tx.user.create({
        data: { organizationId: organization.id, email, name, role: 'ADMIN', passwordHash },
      });
      return { organization, workspace, user };
    });
    await createSession(result.user.id, res);
    res.status(201).json({
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
      organization: { id: result.organization.id, name: result.organization.name },
      workspace: result.workspace,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = required(req.body.email, 'email').toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(req.body.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    await createSession(user.id, res);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res, next) => {
  try {
    await prisma.session.deleteMany({ where: { id: req.auth.sessionId } });
    res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { id: true, name: true, email: true, role: true, organization: { select: { id: true, name: true } } },
    });
    const workspaces = await prisma.workspace.findMany({
      where: { organizationId: req.auth.organizationId },
      orderBy: { name: 'asc' },
    });
    res.json({ user, workspaces });
  } catch (error) {
    next(error);
  }
});

app.get('/api/properties', requireAuth, async (req, res, next) => {
  try {
    res.json(await prisma.property.findMany({
      where: { organizationId: req.auth.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));
  } catch (error) { next(error); }
});
app.post('/api/properties', requireAuth, async (req, res, next) => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: { id: required(req.body.workspaceId, 'workspaceId'), organizationId: req.auth.organizationId },
    });
    if (!workspace) return res.status(400).json({ error: 'Invalid workspace' });
    const property = await prisma.property.create({ data: {
      organizationId: req.auth.organizationId,
      workspaceId: workspace.id,
      addressLine1: required(req.body.addressLine1, 'addressLine1'),
      city: required(req.body.city, 'city'),
      state: required(req.body.state, 'state', 2).toUpperCase(),
      zip: required(req.body.zip, 'zip', 10),
      propertyType: text(req.body.propertyType) || 'SINGLE_FAMILY',
      bedrooms: Number.isInteger(req.body.bedrooms) ? req.body.bedrooms : null,
      squareFootage: Number.isInteger(req.body.squareFootage) ? req.body.squareFootage : null,
    }});
    res.status(201).json(property);
  } catch (error) { next(error); }
});

app.get('/api/contacts', requireAuth, async (req, res, next) => {
  try {
    res.json(await prisma.contact.findMany({
      where: { organizationId: req.auth.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));
  } catch (error) { next(error); }
});
app.post('/api/contacts', requireAuth, async (req, res, next) => {
  try {
    const firstName = text(req.body.firstName);
    const lastName = text(req.body.lastName);
    const entityName = text(req.body.entityName);
    if (!firstName && !lastName && !entityName) throw new Error('A person or entity name is required');
    const contact = await prisma.contact.create({ data: {
      organizationId: req.auth.organizationId,
      firstName: firstName || null,
      lastName: lastName || null,
      entityName: entityName || null,
    }});
    res.status(201).json(contact);
  } catch (error) { next(error); }
});

app.get('/api/deals', requireAuth, async (req, res, next) => {
  try {
    res.json(await prisma.deal.findMany({
      where: { organizationId: req.auth.organizationId },
      include: { property: true, primaryContact: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }));
  } catch (error) { next(error); }
});
app.post('/api/deals', requireAuth, async (req, res, next) => {
  try {
    const [workspace, property, contact] = await Promise.all([
      prisma.workspace.findFirst({ where: { id: required(req.body.workspaceId, 'workspaceId'), organizationId: req.auth.organizationId } }),
      prisma.property.findFirst({ where: { id: required(req.body.propertyId, 'propertyId'), organizationId: req.auth.organizationId } }),
      prisma.contact.findFirst({ where: { id: required(req.body.primaryContactId, 'primaryContactId'), organizationId: req.auth.organizationId } }),
    ]);
    if (!workspace || !property || !contact || property.workspaceId !== workspace.id) {
      return res.status(400).json({ error: 'Invalid workspace, property, or contact' });
    }
    const allowedStages = ['NEW_LEAD','COLD_CONTACTED','SELLER_LEAD','APPOINTMENT_SET','OFFER_MADE','UNDER_CONTRACT','DISPO_ACTIVE','BUYER_UNDER_CONTRACT','CLOSING','CLOSED_WON','CLOSED_LOST'];
    const stage = allowedStages.includes(req.body.stage) ? req.body.stage : 'NEW_LEAD';
    const deal = await prisma.$transaction(async tx => {
      const created = await tx.deal.create({ data: {
        organizationId: req.auth.organizationId,
        workspaceId: workspace.id,
        propertyId: property.id,
        primaryContactId: contact.id,
        stage,
        leadSource: text(req.body.leadSource) || null,
      }});
      await tx.dealStageHistory.create({ data: { dealId: created.id, toStage: stage, changedByUserId: req.auth.userId } });
      return created;
    });
    res.status(201).json(deal);
  } catch (error) { next(error); }
});

app.patch('/api/deals/:id/stage', requireAuth, async (req, res, next) => {
  try {
    const allowedStages = ['NEW_LEAD','COLD_CONTACTED','SELLER_LEAD','APPOINTMENT_SET','OFFER_MADE','UNDER_CONTRACT','DISPO_ACTIVE','BUYER_UNDER_CONTRACT','CLOSING','CLOSED_WON','CLOSED_LOST'];
    if (!allowedStages.includes(req.body.stage)) throw new Error('Invalid stage');
    const current = await prisma.deal.findFirst({ where: { id: req.params.id, organizationId: req.auth.organizationId } });
    if (!current) return res.status(404).json({ error: 'Deal not found' });
    const deal = await prisma.$transaction(async tx => {
      const updated = await tx.deal.update({ where: { id: current.id }, data: { stage: req.body.stage } });
      await tx.dealStageHistory.create({ data: {
        dealId: current.id, fromStage: current.stage, toStage: req.body.stage, changedByUserId: req.auth.userId,
      }});
      return updated;
    });
    res.json(deal);
  } catch (error) { next(error); }
});

app.post('/api/calculate-mao', requireAuth, (req, res, next) => {
  try {
    const arv = Number(req.body.arv);
    const repairEstimate = Number(req.body.repairEstimate);
    const wholesaleFeeTarget = Number(req.body.wholesaleFeeTarget);
    const factor = req.body.investorMarginFactor == null ? 0.7 : Number(req.body.investorMarginFactor);
    if (![arv, repairEstimate, wholesaleFeeTarget, factor].every(Number.isFinite) ||
        arv < 0 || repairEstimate < 0 || wholesaleFeeTarget < 0 || factor <= 0 || factor > 1) {
      throw new Error('Provide valid non-negative amounts and a factor between 0 and 1');
    }
    res.json({ maxAllowableOffer: Math.max(0, Math.round(arv * factor - repairEstimate - wholesaleFeeTarget)) });
  } catch (error) { next(error); }
});

app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  const known = error instanceof Error && (
    error.message.includes('required') || error.message.includes('Password') ||
    error.message.includes('Invalid') || error.message.includes('Provide')
  );
  res.status(known ? 400 : 500).json({ error: known ? error.message : 'Internal server error' });
});

const server = app.listen(PORT, () => console.log(`WholesaleOS listening on http://localhost:${PORT}`));
async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
