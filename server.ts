import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(express.json());

// Health check — visit this to confirm the server is alive
app.get('/', (req, res) => {
  res.json({ status: 'WholesaleOS API is running' });
});

// GET all properties
app.get('/properties', async (req, res) => {
  const properties = await prisma.property.findMany();
  res.json(properties);
});

// POST a new property
app.post('/properties', async (req, res) => {
  try {
    const property = await prisma.property.create({
      data: req.body,
    });
    res.status(201).json(property);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});