import { faker } from "@faker-js/faker";
import {
  PropertyType,
  PropertyStatus,
  UserRole,
  ListingType,
  ListingStatus,
  TransactionType,
  TransactionStatus,
} from "../../../core/entities";

export class DataGenerator {
  private static readonly SECTORS = [
    "Palermo",
    "Recoleta",
    "Puerto Madero",
    "San Telmo",
    "La Boca",
    "Belgrano",
    "Villa Crick",
    "Caballito",
    "Barracas",
    "Nuñez",
    "Villa Urquiza",
    "Colegiales",
    "Almagro",
    "Once",
    "Constitución",
  ];

  private static readonly TENANT_IDS = [
    "tenant-alpha",
    "tenant-beta",
    "tenant-gamma",
    "tenant-delta",
    "tenant-test",
  ];

  private static generateEmail() {
    return (
      faker.internet.userName().toLowerCase() +
      "." +
      faker.string.uuid() +
      "@" +
      faker.internet.domainName()
    );
  }

  static generateUser(tenantId?: string) {
    return {
      id: faker.string.uuid(),
      email: this.generateEmail(),
      password: "$2b$10$P6KwPp8mLI8CTjfKveQx8e8mQ5o/YXiejn32OBezCLzmP9RuV8Iyi", // bcrypt hash of 'password123'
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: faker.helpers.arrayElement(Object.values(UserRole)),
      tenantId: tenantId || faker.helpers.arrayElement(this.TENANT_IDS),
      isActive: faker.datatype.boolean(0.95), // 95% active users
      createdAt: faker.date.between({ from: "2020-01-01", to: new Date() }),
      updatedAt: new Date(),
    };
  }

  static generateProperty(ownerId: string, tenantId?: string, options?: { 
    csvBatch?: number; 
    external_id?: string;
    createdAt?: Date;
  }) {
    const latitude = faker.location.latitude({ min: -34.7, max: -34.5 }); // Buenos Aires bounds
    const longitude = faker.location.longitude({ min: -58.7, max: -58.3 });
    const propertyType = faker.helpers.arrayElement(Object.values(PropertyType));
    const basePrice = faker.number.int({ min: 50000, max: 2000000 });
    
    // Simular múltiples cargas CSV históricas
    const csvBatch = options?.csvBatch || faker.number.int({ min: 1, max: 8 });
    const batchDate = options?.createdAt || faker.date.between({ 
      from: new Date(2023, 0, 1), // Enero 2023
      to: new Date() 
    });

    // Generate external_id que simula fuente externa (portal inmobiliario, scraping, etc.)
    const external_id = options?.external_id || `EXT-${faker.helpers.arrayElement([
      'ZONAPROP', 'ARGENPROP', 'ML', 'PROPERATI', 'LAMUDI', 'SOLODUEÑOS'
    ])}-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`;

    return {
      id: faker.string.uuid(),
      external_id,
      title: `${
        propertyType === PropertyType.HOUSE
          ? "Casa"
          : propertyType === PropertyType.APARTMENT
            ? "Departamento"
            : propertyType === PropertyType.COMMERCIAL
              ? "Local Comercial"
              : propertyType === PropertyType.LAND
                ? "Terreno"
                : "Depósito"
      } en ${faker.helpers.arrayElement(this.SECTORS)}`,
      description: faker.lorem.paragraphs(2),
      address: `${faker.location.streetAddress()}, ${faker.helpers.arrayElement(this.SECTORS)}, CABA`,
      sector: faker.helpers.arrayElement(this.SECTORS),
      type: propertyType,
      status: faker.helpers.arrayElement(Object.values(PropertyStatus)),
      price: basePrice,
      area:
        propertyType === PropertyType.LAND
          ? faker.number.int({ min: 200, max: 2000 })
          : faker.number.int({ min: 25, max: 500 }),
      bedrooms: [PropertyType.HOUSE, PropertyType.APARTMENT].includes(propertyType)
        ? faker.number.int({ min: 1, max: 5 })
        : null,
      bathrooms: [PropertyType.HOUSE, PropertyType.APARTMENT].includes(propertyType)
        ? faker.number.int({ min: 1, max: 4 })
        : null,
      parkingSpaces: faker.datatype.boolean(0.7) ? faker.number.int({ min: 0, max: 3 }) : null,
      coordinates: `POINT(${longitude} ${latitude})`,
      valuation: faker.datatype.boolean(0.8)
        ? basePrice * faker.number.float({ min: 0.9, max: 1.1 })
        : null,
      tenantId: tenantId || faker.helpers.arrayElement(this.TENANT_IDS),
      ownerId,
      createdAt: batchDate,
      updatedAt: faker.date.between({ from: batchDate, to: new Date() }),
      // Metadata para tracking del origen de datos
      metadata: {
        csvBatch: `batch-${csvBatch}`,
        source: faker.helpers.arrayElement(['zonaprop', 'argenprop', 'mercadolibre', 'properati']),
        lastCsvUpdate: faker.date.between({ from: batchDate, to: new Date() }),
        importHistory: faker.number.int({ min: 1, max: 5 }) // Veces que se actualizó via CSV
      }
    };
  }

  static generateListing(propertyId: string, tenantId?: string) {
    const listingType = faker.helpers.arrayElement(Object.values(ListingType));
    const basePrice = faker.number.int({
      min: listingType === ListingType.RENT ? 20000 : 50000,
      max: listingType === ListingType.RENT ? 150000 : 2000000,
    });
    const listedDate = faker.date.between({ from: "2020-01-01", to: new Date() });

    return {
      id: faker.string.uuid(),
      type: listingType,
      status: faker.helpers.arrayElement(Object.values(ListingStatus)),
      price: basePrice,
      description: faker.lorem.paragraph(),
      propertyId,
      tenantId: tenantId || faker.helpers.arrayElement(this.TENANT_IDS),
      listedDate,
      expiryDate: faker.datatype.boolean(0.7)
        ? faker.date.future({ years: 1, refDate: listedDate })
        : null,
      views: faker.number.int({ min: 0, max: 500 }),
      inquiries: faker.number.int({ min: 0, max: 50 }),
      createdAt: listedDate,
      updatedAt: new Date(),
    };
  }

  static generateTransaction(
    propertyId: string,
    buyerId?: string,
    sellerId?: string,
    tenantId?: string
  ) {
    const transactionType = faker.helpers.arrayElement(Object.values(TransactionType));
    const amount = faker.number.int({
      min: transactionType === TransactionType.RENT ? 15000 : 50000,
      max: transactionType === TransactionType.RENT ? 120000 : 1800000,
    });
    const transactionDate = faker.date.between({ from: "2020-01-01", to: new Date() });
    const isCompleted = faker.datatype.boolean(0.7);

    return {
      id: faker.string.uuid(),
      type: transactionType,
      status: isCompleted
        ? TransactionStatus.COMPLETED
        : faker.helpers.arrayElement([TransactionStatus.PENDING, TransactionStatus.CANCELLED]),
      amount,
      commissionRate: faker.number.float({ min: 2, max: 6, fractionDigits: 2 }),
      commissionAmount: amount * faker.number.float({ min: 0.02, max: 0.06 }),
      propertyId,
      buyerId: buyerId || null,
      sellerId: sellerId || null,
      tenantId: tenantId || faker.helpers.arrayElement(this.TENANT_IDS),
      transactionDate,
      completionDate: isCompleted
        ? faker.date.between({ from: transactionDate, to: new Date() })
        : null,
      notes: faker.lorem.sentence(),
      metadata: {
        source: faker.helpers.arrayElement(["web", "mobile", "agent"]),
        priority: faker.helpers.arrayElement(["low", "medium", "high"]),
        tags: faker.helpers.arrayElements(["vip", "urgent", "negotiable", "cash"], {
          min: 0,
          max: 2,
        }),
      },
      createdAt: transactionDate,
      updatedAt: new Date(),
    };
  }
}
