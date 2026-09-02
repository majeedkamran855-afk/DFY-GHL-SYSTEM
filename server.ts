import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'WholesaleOS API is running' });
});

// ---------------- PROPERTIES ----------------
app.get('/properties', async (req, res) => {
  const properties = await prisma.property.findMany();
  res.json(properties);
});

app.post('/properties', async (req, res) => {
  try {
    const property = await prisma.property.create({ data: req.body });
    res.status(201).json(property);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ---------------- CONTACTS ----------------
app.get('/contacts', async (req, res) => {
  const contacts = await prisma.contact.findMany();
  res.json(contacts);
});

app.post('/contacts', async (req, res) => {
  try {
    const contact = await prisma.contact.create({ data: req.body });
    res.status(201).json(contact);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ---------------- DEALS ----------------
app.get('/deals', async (req, res) => {
  const deals = await prisma.deal.findMany();
  res.json(deals);
});

app.post('/deals', async (req, res) => {
  try {
    const deal = await prisma.deal.create({ data: req.body });
    res.status(201).json(deal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ---------------- BUYERS ----------------
app.get('/buyers', async (req, res) => {
  const buyers = await prisma.buyer.findMany();
  res.json(buyers);
});

app.post('/buyers', async (req, res) => {
  try {
    const buyer = await prisma.buyer.create({ data: req.body });
    res.status(201).json(buyer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});