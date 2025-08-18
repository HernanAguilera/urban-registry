import { AppDataSource } from '../data-source';
import { DataGenerator } from './data-generator';
import { User, Property, Listing, Transaction, UserRole } from '../../../core/entities';
import { randomUUID } from 'crypto';

const BATCH_SIZE = 1000;
const TARGET_USERS = 5000;
const TARGET_PROPERTIES = 100000;
const TARGET_LISTINGS = 200000;
const TARGET_TRANSACTIONS = 150000;

async function runSeeds() {
  console.log('🌱 Starting database seeding...');
  const startTime = Date.now();
  console.log(`📊 Target: ${TARGET_USERS.toLocaleString()} users, ${TARGET_PROPERTIES.toLocaleString()} properties, ${TARGET_LISTINGS.toLocaleString()} listings, ${TARGET_TRANSACTIONS.toLocaleString()} transactions`);
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Clear existing data if any
    console.log('🧹 Clearing existing data...');
    await AppDataSource.query('TRUNCATE TABLE transactions CASCADE');
    await AppDataSource.query('TRUNCATE TABLE listings CASCADE');
    await AppDataSource.query('TRUNCATE TABLE properties CASCADE');
    await AppDataSource.query('TRUNCATE TABLE users CASCADE');

    const userRepository = AppDataSource.getRepository(User);
    const propertyRepository = AppDataSource.getRepository(Property);
    const listingRepository = AppDataSource.getRepository(Listing);
    const transactionRepository = AppDataSource.getRepository(Transaction);

    const {adminId, userId} = await createTestUsers();
    
    // === SEED USERS ===
    console.log(`👥 Seeding ${TARGET_USERS.toLocaleString()} users...`);
    const startUsersTime = Date.now();
    const userIds: string[] = [adminId, userId]; // Include test users
    
    for (let i = 0; i < TARGET_USERS; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, TARGET_USERS - i);
      const usersBatch = [];
      
      for (let j = 0; j < batchSize; j++) {
        const user = DataGenerator.generateUser();
        userIds.push(user.id);
        usersBatch.push(user);
      }
      
      await userRepository.save(usersBatch);
      
      if ((i + batchSize) % (BATCH_SIZE * 5) === 0) {
        console.log(`   📝 Users: ${(i + batchSize).toLocaleString()}/${TARGET_USERS.toLocaleString()}`);
      }
    }
    console.log(`✅ Users seeded in ${((Date.now() - startUsersTime) / 1000).toFixed(1)}s`);

    // === SEED PROPERTIES (Simular sistema maduro con múltiples cargas CSV) ===
    console.log(`🏠 Seeding ${TARGET_PROPERTIES.toLocaleString()} properties (simulating mature system)...`);
    const startPropertiesTime = Date.now();
    const propertyIds: string[] = [];
    
    // Simular 8 cargas CSV históricas distribuidas en el tiempo
    const csvBatches = [
      { batch: 1, date: new Date(2023, 0, 15), portion: 0.20 }, // Enero 2023 - 20%
      { batch: 2, date: new Date(2023, 2, 10), portion: 0.15 }, // Marzo 2023 - 15%
      { batch: 3, date: new Date(2023, 4, 20), portion: 0.12 }, // Mayo 2023 - 12%
      { batch: 4, date: new Date(2023, 6, 5), portion: 0.10 },  // Julio 2023 - 10%
      { batch: 5, date: new Date(2023, 8, 15), portion: 0.13 }, // Sept 2023 - 13%
      { batch: 6, date: new Date(2023, 10, 25), portion: 0.10 }, // Nov 2023 - 10%
      { batch: 7, date: new Date(2024, 1, 10), portion: 0.12 }, // Feb 2024 - 12%
      { batch: 8, date: new Date(2024, 3, 20), portion: 0.08 }, // Abril 2024 - 8%
    ];
    
    let totalProcessed = 0;
    
    for (const csvBatch of csvBatches) {
      const batchSize = Math.floor(TARGET_PROPERTIES * csvBatch.portion);
      console.log(`   📥 Simulating CSV batch ${csvBatch.batch} (${csvBatch.date.toLocaleDateString()}) - ${batchSize.toLocaleString()} properties`);
      
      for (let i = 0; i < batchSize; i += BATCH_SIZE) {
        const currentBatchSize = Math.min(BATCH_SIZE, batchSize - i);
        const propertiesBatch = [];
        
        for (let j = 0; j < currentBatchSize; j++) {
          const randomOwnerId = userIds[Math.floor(Math.random() * userIds.length)];
          const property = DataGenerator.generateProperty(randomOwnerId, undefined, {
            csvBatch: csvBatch.batch,
            createdAt: csvBatch.date
          });
          propertyIds.push(property.id);
          propertiesBatch.push(property);
        }
      
      // Use raw query for better performance with PostGIS
      const values = propertiesBatch.map(p => 
        `('${p.id}', '${p.external_id}', '${p.title.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}', '${p.address.replace(/'/g, "''")}', '${p.sector}', '${p.type}', '${p.status}', ${p.price}, ${p.area || 'NULL'}, ${p.bedrooms || 'NULL'}, ${p.bathrooms || 'NULL'}, ${p.parkingSpaces || 'NULL'}, ST_GeomFromText('${p.coordinates}', 4326), ${p.valuation || 'NULL'}, '${p.tenantId}', '${p.ownerId}', '${JSON.stringify(p.metadata).replace(/'/g, "''")}', '${p.createdAt.toISOString()}', '${p.updatedAt.toISOString()}')`
      ).join(',');
        
        await AppDataSource.query(`
          INSERT INTO properties (id, external_id, title, description, address, sector, type, status, price, area, bedrooms, bathrooms, "parkingSpaces", coordinates, valuation, tenant_id, owner_id, metadata, created_at, updated_at)
          VALUES ${values}
        `);
        
        totalProcessed += currentBatchSize;
        
        if ((i + currentBatchSize) % (BATCH_SIZE * 5) === 0) {
          console.log(`     📊 Batch ${csvBatch.batch} progress: ${(i + currentBatchSize).toLocaleString()}/${batchSize.toLocaleString()}`);
        }
      }
    }
    console.log(`✅ Properties seeded (${totalProcessed.toLocaleString()} total) in ${((Date.now() - startPropertiesTime) / 1000).toFixed(1)}s`);

    // === SEED LISTINGS (Múltiples por propiedad, simulando actividad a lo largo del tiempo) ===
    console.log(`📋 Seeding ${TARGET_LISTINGS.toLocaleString()} listings (multiple per property)...`);
    const startListingsTime = Date.now();
    
    // Estrategia: Cada propiedad puede tener 1-3 listings (históricos + actuales)
    const propertiesWithMultipleListings = Math.min(TARGET_LISTINGS, propertyIds.length);
    
    for (let i = 0; i < propertiesWithMultipleListings; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, propertiesWithMultipleListings - i);
      const listingsBatch = [];
      
      for (let j = 0; j < batchSize; j++) {
        const propertyId = propertyIds[i + j];
        
        // 70% propiedades tienen 1 listing, 25% tienen 2, 5% tienen 3
        const listingCount = Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3;
        
        for (let k = 0; k < listingCount; k++) {
          const listing = DataGenerator.generateListing(propertyId);
          listingsBatch.push(listing);
        }
      }
      
      await listingRepository.save(listingsBatch);
      
      if ((i + batchSize) % (BATCH_SIZE * 5) === 0) {
        console.log(`   📋 Listings: ${listingsBatch.length + i * 1.5} estimated / ${TARGET_LISTINGS.toLocaleString()}`);
      }
    }
    console.log(`✅ Listings seeded in ${((Date.now() - startListingsTime) / 1000).toFixed(1)}s`);

    // === SEED TRANSACTIONS (Historial realista de operaciones) ===
    console.log(`💰 Seeding ${TARGET_TRANSACTIONS.toLocaleString()} transactions (realistic history)...`);
    const startTransactionsTime = Date.now();
    
    // Estrategia: 60% de propiedades tienen al menos 1 transacción histórica
    const propertiesWithTransactions = Math.floor(propertyIds.length * 0.6);
    const transactionsPerProperty = Math.ceil(TARGET_TRANSACTIONS / propertiesWithTransactions);
    
    for (let i = 0; i < TARGET_TRANSACTIONS; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, TARGET_TRANSACTIONS - i);
      const transactionsBatch = [];
      
      for (let j = 0; j < batchSize; j++) {
        // Seleccionar propiedades que ya han tenido actividad (más realista)
        const propertyIndex = (i + j) % propertiesWithTransactions;
        const propertyId = propertyIds[propertyIndex];
        
        const randomBuyerId = Math.random() > 0.3 ? userIds[Math.floor(Math.random() * userIds.length)] : undefined;
        const randomSellerId = Math.random() > 0.3 ? userIds[Math.floor(Math.random() * userIds.length)] : undefined;
        const transaction = DataGenerator.generateTransaction(propertyId, randomBuyerId, randomSellerId);
        transactionsBatch.push(transaction);
      }
      
      await transactionRepository.save(transactionsBatch);
      
      if ((i + batchSize) % (BATCH_SIZE * 10) === 0) {
        console.log(`   💰 Transactions: ${(i + batchSize).toLocaleString()}/${TARGET_TRANSACTIONS.toLocaleString()}`);
      }
    }
    console.log(`✅ Transactions seeded in ${((Date.now() - startTransactionsTime) / 1000).toFixed(1)}s`);

    await cretateTestProperties(adminId)

    // === SUMMARY ===
    const totalTime = (Date.now() - startTime) / 1000;
    console.log('\n🎉 Seeding completed successfully!');
    console.log(`📊 Final counts:`);
    console.log(`   👥 Users: ${(await userRepository.count()).toLocaleString()}`);
    console.log(`   🏠 Properties: ${(await propertyRepository.count()).toLocaleString()}`);
    console.log(`   📋 Listings: ${(await listingRepository.count()).toLocaleString()}`);
    console.log(`   💰 Transactions: ${(await transactionRepository.count()).toLocaleString()}`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(1)}s`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  runSeeds();
}


async function createTestUsers(): Promise<{ adminId: string; userId: string; }> {
  const userRepository = AppDataSource.getRepository(User);
  // === SEED TEST USERS FIRST ===
  console.log("👤 Creating test users...");
  const adminId = randomUUID();
  const userId = randomUUID();

  const testUsers = [
    {
      id: adminId,
      email: "admin@test.com",
      password: "$2b$10$P6KwPp8mLI8CTjfKveQx8e8mQ5o/YXiejn32OBezCLzmP9RuV8Iyi", // password123
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMIN,
      tenantId: "tenant-test",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: userId,
      email: "user@test.com",
      password: "$2b$10$P6KwPp8mLI8CTjfKveQx8e8mQ5o/YXiejn32OBezCLzmP9RuV8Iyi", // password123
      firstName: "Regular",
      lastName: "User",
      role: UserRole.USER,
      tenantId: "tenant-test",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await userRepository.save(testUsers);
  console.log("✅ Test users created: admin@test.com / user@test.com (password: password123)");

  return {adminId, userId};
}

async function cretateTestProperties(userId: string) {
  // === SEED TEST PROPERTIES FOR tenant-test ===
  console.log(`🏠 Creating test properties for tenant-test...`);
  const testProperties = [];

  // MUESTRAS CONTROLADAS para testing de UPSERT
  // Estas propiedades tienen valores específicos conocidos para verificar actualizaciones
  const specificTestProperties = [
    {
      id: randomUUID(),
      external_id: "EXT-TEST-001",
      title: "Casa en Palermo ORIGINAL",
      description: "Hermosa casa con jardín en Palermo - DESCRIPCIÓN ORIGINAL",
      address: "Av. Santa Fe 1234",
      sector: "Palermo",
      type: "house",
      status: "active",
      price: 450000, // ANTES: $450,000 → DESPUÉS: $517,500 (+15%)
      area: 120,
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 1,
      coordinates: "POINT(-58.3816 -34.6037)",
      valuation: 465000,
      tenantId: "tenant-test",
      ownerId: userId,
      metadata: { csvBatch: "controlled-sample", source: "manual", importHistory: 1 },
      createdAt: new Date(2024, 0, 15), // Creada hace tiempo
      updatedAt: new Date(2024, 0, 15),
    },
    {
      id: randomUUID(),
      external_id: "EXT-TEST-002",
      title: "Departamento en Recoleta ORIGINAL",
      description: "Departamento moderno en Recoleta - DESCRIPCIÓN ORIGINAL",
      address: "Av. Pueyrredón 456",
      sector: "Recoleta",
      type: "apartment",
      status: "active",
      price: 380000, // ANTES: $380,000 → DESPUÉS: $437,000 (+15%)
      area: 85,
      bedrooms: 2,
      bathrooms: 2,
      parkingSpaces: 1,
      coordinates: "POINT(-58.3965 -34.5913)",
      valuation: 390000,
      tenantId: "tenant-test",
      ownerId: userId,
      metadata: { csvBatch: "controlled-sample", source: "manual", importHistory: 1 },
      createdAt: new Date(2024, 1, 20),
      updatedAt: new Date(2024, 1, 20),
    },
    {
      id: randomUUID(),
      external_id: "EXT-TEST-003",
      title: "Casa en Villa Crespo ORIGINAL",
      description: "Casa familiar en Villa Crespo - DESCRIPCIÓN ORIGINAL",
      address: "Av. Corrientes 2345",
      sector: "Villa Crespo",
      type: "house",
      status: "active",
      price: 320000, // ANTES: $320,000 → DESPUÉS: $368,000 (+15%)
      area: 95,
      bedrooms: 2,
      bathrooms: 1,
      parkingSpaces: 0,
      coordinates: "POINT(-58.4378 -34.5997)",
      valuation: 330000,
      tenantId: "tenant-test",
      ownerId: userId,
      metadata: { csvBatch: "controlled-sample", source: "manual", importHistory: 1 },
      createdAt: new Date(2024, 2, 10),
      updatedAt: new Date(2024, 2, 10),
    },
  ];

  testProperties.push(...specificTestProperties);

  // Agregar algunas propiedades aleatorias adicionales
  for (let i = 0; i < 10; i++) {
    const property = DataGenerator.generateProperty(userId, "tenant-test");
    testProperties.push(property);
  }

  // Use raw query for better performance with PostGIS
  const testValues = testProperties
    .map(
      (p) =>
        `('${p.id}', '${p.external_id}', '${p.title.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}', '${p.address.replace(/'/g, "''")}', '${p.sector}', '${p.type}', '${p.status}', ${p.price}, ${p.area || "NULL"}, ${p.bedrooms || "NULL"}, ${p.bathrooms || "NULL"}, ${p.parkingSpaces || "NULL"}, ST_GeomFromText('${p.coordinates}', 4326), ${p.valuation || "NULL"}, '${p.tenantId}', '${p.ownerId}', '${JSON.stringify(p.metadata).replace(/'/g, "''")}', '${p.createdAt.toISOString()}', '${p.updatedAt.toISOString()}')`
    )
    .join(",");

  await AppDataSource.query(`
      INSERT INTO properties (id, external_id, title, description, address, sector, type, status, price, area, bedrooms, bathrooms, "parkingSpaces", coordinates, valuation, tenant_id, owner_id, metadata, created_at, updated_at)
      VALUES ${testValues}
    `);

  console.log(`✅ Test properties created for tenant-test`);
}