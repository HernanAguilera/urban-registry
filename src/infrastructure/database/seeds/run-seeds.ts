import { AppDataSource } from '../data-source';
import { DataGenerator } from './data-generator';
import { User, Property, Listing, Transaction } from '../../../core/entities';

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

    // === SEED USERS ===
    console.log(`👥 Seeding ${TARGET_USERS.toLocaleString()} users...`);
    const startUsersTime = Date.now();
    const userIds: string[] = [];
    
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

    // === SEED PROPERTIES ===
    console.log(`🏠 Seeding ${TARGET_PROPERTIES.toLocaleString()} properties...`);
    const startPropertiesTime = Date.now();
    const propertyIds: string[] = [];
    
    for (let i = 0; i < TARGET_PROPERTIES; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, TARGET_PROPERTIES - i);
      const propertiesBatch = [];
      
      for (let j = 0; j < batchSize; j++) {
        const randomOwnerId = userIds[Math.floor(Math.random() * userIds.length)];
        const property = DataGenerator.generateProperty(randomOwnerId);
        propertyIds.push(property.id);
        propertiesBatch.push(property);
      }
      
      // Use raw query for better performance with PostGIS
      const values = propertiesBatch.map(p => 
        `('${p.id}', '${p.title.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}', '${p.address.replace(/'/g, "''")}', '${p.sector}', '${p.type}', '${p.status}', ${p.price}, ${p.area || 'NULL'}, ${p.bedrooms || 'NULL'}, ${p.bathrooms || 'NULL'}, ${p.parkingSpaces || 'NULL'}, ST_GeomFromText('${p.coordinates}', 4326), ${p.valuation || 'NULL'}, '${p.tenantId}', '${p.ownerId}', '${p.createdAt.toISOString()}', '${p.updatedAt.toISOString()}')`
      ).join(',');
      
      await AppDataSource.query(`
        INSERT INTO properties (id, title, description, address, sector, type, status, price, area, bedrooms, bathrooms, "parkingSpaces", coordinates, valuation, tenant_id, owner_id, created_at, updated_at)
        VALUES ${values}
      `);
      
      if ((i + batchSize) % (BATCH_SIZE * 10) === 0) {
        console.log(`   🏠 Properties: ${(i + batchSize).toLocaleString()}/${TARGET_PROPERTIES.toLocaleString()}`);
      }
    }
    console.log(`✅ Properties seeded in ${((Date.now() - startPropertiesTime) / 1000).toFixed(1)}s`);

    // === SEED LISTINGS ===
    console.log(`📋 Seeding ${TARGET_LISTINGS.toLocaleString()} listings...`);
    const startListingsTime = Date.now();
    
    for (let i = 0; i < TARGET_LISTINGS; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, TARGET_LISTINGS - i);
      const listingsBatch = [];
      
      for (let j = 0; j < batchSize; j++) {
        const randomPropertyId = propertyIds[Math.floor(Math.random() * propertyIds.length)];
        const listing = DataGenerator.generateListing(randomPropertyId);
        listingsBatch.push(listing);
      }
      
      await listingRepository.save(listingsBatch);
      
      if ((i + batchSize) % (BATCH_SIZE * 10) === 0) {
        console.log(`   📋 Listings: ${(i + batchSize).toLocaleString()}/${TARGET_LISTINGS.toLocaleString()}`);
      }
    }
    console.log(`✅ Listings seeded in ${((Date.now() - startListingsTime) / 1000).toFixed(1)}s`);

    // === SEED TRANSACTIONS ===
    console.log(`💰 Seeding ${TARGET_TRANSACTIONS.toLocaleString()} transactions...`);
    const startTransactionsTime = Date.now();
    
    for (let i = 0; i < TARGET_TRANSACTIONS; i += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, TARGET_TRANSACTIONS - i);
      const transactionsBatch = [];
      
      for (let j = 0; j < batchSize; j++) {
        const randomPropertyId = propertyIds[Math.floor(Math.random() * propertyIds.length)];
        const randomBuyerId = Math.random() > 0.3 ? userIds[Math.floor(Math.random() * userIds.length)] : undefined;
        const randomSellerId = Math.random() > 0.3 ? userIds[Math.floor(Math.random() * userIds.length)] : undefined;
        const transaction = DataGenerator.generateTransaction(randomPropertyId, randomBuyerId, randomSellerId);
        transactionsBatch.push(transaction);
      }
      
      await transactionRepository.save(transactionsBatch);
      
      if ((i + batchSize) % (BATCH_SIZE * 10) === 0) {
        console.log(`   💰 Transactions: ${(i + batchSize).toLocaleString()}/${TARGET_TRANSACTIONS.toLocaleString()}`);
      }
    }
    console.log(`✅ Transactions seeded in ${((Date.now() - startTransactionsTime) / 1000).toFixed(1)}s`);

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