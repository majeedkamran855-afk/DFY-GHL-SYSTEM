import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating a test organization...');
  const org = await prisma.organization.create({
    data: {
      name: 'Test Wholesaling Co',
    },
  });
  console.log('Created organization:', org);

  console.log('Creating a test workspace...');
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Phoenix Metro',
      organizationId: org.id,
      targetZipCodes: ['85001', '85002'],
    },
  });
  console.log('Created workspace:', workspace);

  console.log('Creating a test property...');
  const property = await prisma.property.create({
    data: {
      organizationId: org.id,
      workspaceId: workspace.id,
      addressLine1: '123 Main St',
      city: 'Phoenix',
      state: 'AZ',
      zip: '85001',
      propertyType: 'SINGLE_FAMILY',
      bedrooms: 3,
      squareFootage: 1500,
      distressTags: ['VACANT', 'ABSENTEE_OWNER'],
    },
  });
  console.log('Created property:', property);

  console.log('\nReading it back from the database...');
  const allProperties = await prisma.property.findMany();
  console.log('All properties in database:', allProperties);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });