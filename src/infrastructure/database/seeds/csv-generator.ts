import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DataGenerator } from './data-generator';

export interface CsvGeneratorOptions {
  count: number;
  tenantId?: string;
  includeExternalId?: boolean;
  outputPath?: string;
  filename?: string;
  updateMode?: boolean; // Para generar CSVs que actualicen propiedades existentes
  useExistingExternalIds?: boolean; // Para usar external_ids del seeder 
}

export class CsvGenerator {
  
  static generatePropertiesCsv(options: CsvGeneratorOptions): string {
    const {
      count,
      tenantId = 'tenant-test',
      includeExternalId = true,
      outputPath = '/app/uploads',
      filename,
      updateMode = false,
      useExistingExternalIds = false
    } = options;

    // Generate appropriate filename based on mode
    const defaultFilename = updateMode 
      ? `update_properties_${count}_rows.csv`
      : `properties_${count}_rows.csv`;
    const finalFilename = filename || defaultFilename;

    console.log(`🏗️  Generating ${updateMode ? 'UPDATE' : 'INSERT'} CSV with ${count} properties...`);
    if (useExistingExternalIds) {
      console.log(`🔗 Using existing external_ids from seeder for UPSERT testing`);
    }

    // Ensure upload directory exists
    try {
      mkdirSync(outputPath, { recursive: true });
    } catch (error) {
      console.warn('Directory already exists or could not be created');
    }

    // Generate CSV header
    const headers = includeExternalId
      ? ['external_id', 'title', 'description', 'address', 'sector', 'type', 'status', 'price', 'area', 'bedrooms', 'bathrooms', 'parkingSpaces', 'latitude', 'longitude']
      : ['title', 'description', 'address', 'sector', 'type', 'status', 'price', 'area', 'bedrooms', 'bathrooms', 'parkingSpaces', 'latitude', 'longitude'];

    const csvLines = [headers.join(',')];

    // Generate properties
    for (let i = 0; i < count; i++) {
      // Generate a dummy ownerId - won't be used in CSV import
      const dummyOwnerId = 'dummy-owner-id';
      const property = DataGenerator.generateProperty(dummyOwnerId, tenantId);
      
      // Extract latitude and longitude from coordinates
      const coordsMatch = property.coordinates.match(/POINT\(([^)]+)\)/);
      let [longitude, latitude] = coordsMatch 
        ? coordsMatch[1].split(' ').map(Number)
        : [-58.3816, -34.6037]; // Default Buenos Aires coordinates
      
      // Ensure valid coordinates (check for NaN or empty values)
      if (!longitude || !latitude || isNaN(longitude) || isNaN(latitude)) {
        longitude = -58.3816; // Buenos Aires default
        latitude = -34.6037;
      }

      // Generate external_id based on mode
      let external_id = `EXT-CSV-${String(i + 1).padStart(6, '0')}`;
      
      if (useExistingExternalIds && i < 3) {
        // Use test external_ids from seeder for first 3 rows (UPSERT testing)
        external_id = `EXT-TEST-${String(i + 1).padStart(3, '0')}`;
      } else if (useExistingExternalIds && i >= 3) {
        // Generate new external_ids for additional test rows
        external_id = `EXT-CSV-${String(i + 1).padStart(6, '0')}`;
      }

      // Clean up description for CSV (remove line breaks, escape quotes, and remove commas)
      let cleanDescription = property.description
        .replace(/\n/g, ' ')           // Remove line breaks
        .replace(/"/g, '""')           // Escape double quotes for CSV
        .replace(/,/g, ';')            // Replace commas with semicolons
        .trim();
      let title = property.title;
      let price = property.price;

      // Apply updates if in update mode
      if (updateMode) {
        title = `${property.title} ACTUALIZADO`;
        cleanDescription = `${cleanDescription} - PRECIO ACTUALIZADO`;
        price = Math.round(property.price * 1.15); // 15% price increase
      }

      // Build CSV row
      const rowData = includeExternalId
        ? [
            external_id,
            title,
            cleanDescription,
            `"${property.address}"`,
            property.sector,
            property.type,
            property.status,
            price,
            property.area || 0,
            property.bedrooms || 0,
            property.bathrooms || 0,
            property.parkingSpaces || 0,
            latitude,
            longitude
          ]
        : [
            property.title,
            cleanDescription,
            `"${property.address}"`,
            property.sector,
            property.type,
            property.status,
            property.price,
            property.area || 0,
            property.bedrooms || 0,
            property.bathrooms || 0,
            property.parkingSpaces || 0,
            latitude,
            longitude
          ];

      csvLines.push(rowData.join(','));

      // Progress indicator for large files
      if (count > 1000 && (i + 1) % 1000 === 0) {
        console.log(`📝 Generated ${i + 1}/${count} rows...`);
      }
    }

    // Write to file
    const fullPath = join(outputPath, finalFilename);
    const csvContent = csvLines.join('\n');
    
    try {
      writeFileSync(fullPath, csvContent, 'utf8');
      console.log(`✅ CSV generated successfully!`);
      console.log(`📁 File: ${fullPath}`);
      console.log(`📊 Rows: ${count} properties`);
      console.log(`🏢 Tenant: ${tenantId}`);
      console.log(`🔄 Mode: ${updateMode ? 'UPDATE (UPSERT)' : 'INSERT'}`);
      console.log(`🔑 External IDs: ${includeExternalId ? 'Yes' : 'No'}`);
      console.log(`🔗 Using existing IDs: ${useExistingExternalIds ? 'Yes' : 'No'}`);
      console.log(`💾 Size: ${(csvContent.length / 1024).toFixed(2)} KB`);
      
      return fullPath;
    } catch (error) {
      console.error(`❌ Error writing CSV file: ${error.message}`);
      throw error;
    }
  }

  static generateUpdateCsv(originalCsvPath: string, updateOptions: {
    outputPath?: string;
    filename?: string;
    updatePercentage?: number;
    priceIncrease?: number;
  }): string {
    const {
      outputPath = '/app/uploads',
      filename = `properties_update_${Date.now()}.csv`,
      updatePercentage = 50, // Update 50% of properties by default
      priceIncrease = 1.1 // 10% price increase by default
    } = updateOptions;

    console.log(`🔄 Generating update CSV from ${originalCsvPath}...`);
    
    // This is a simplified version - in a real implementation,
    // we would read the original CSV and modify some properties
    // For now, we'll generate a small update CSV with known external_ids
    
    const headers = ['external_id', 'title', 'description', 'address', 'sector', 'type', 'status', 'price', 'area', 'bedrooms', 'bathrooms', 'parkingSpaces', 'latitude', 'longitude'];
    const csvLines = [headers.join(',')];

    // Generate a few update rows with predictable external_ids
    for (let i = 1; i <= Math.min(10, updatePercentage); i++) {
      const property = DataGenerator.generateProperty('dummy-owner', 'tenant-test');
      const coordsMatch = property.coordinates.match(/POINT\(([^)]+)\)/);
      const [longitude, latitude] = coordsMatch 
        ? coordsMatch[1].split(' ').map(Number)
        : [0, 0];

      const cleanDescription = property.description
        .replace(/\n/g, ' ')           // Remove line breaks
        .replace(/"/g, '""')           // Escape double quotes for CSV
        .replace(/,/g, ';')            // Replace commas with semicolons
        .trim();
      const updatedPrice = Math.round(property.price * priceIncrease);

      const rowData = [
        i <= 3 ? `EXT-TEST-${String(i).padStart(3, '0')}` : `EXT-${String(i).padStart(6, '0')}`, // Use controlled samples for first 3
        `${property.title} - ACTUALIZADO`,
        `${cleanDescription} - PRECIO ACTUALIZADO`,
        `"${property.address}"`,
        property.sector,
        property.type,
        property.status,
        updatedPrice,
        property.area || 0,
        property.bedrooms || 0,
        property.bathrooms || 0,
        property.parkingSpaces || 0,
        latitude,
        longitude
      ];

      csvLines.push(rowData.join(','));
    }

    const fullPath = join(outputPath, filename);
    const csvContent = csvLines.join('\n');
    
    writeFileSync(fullPath, csvContent, 'utf8');
    console.log(`✅ Update CSV generated: ${fullPath}`);
    
    return fullPath;
  }
}