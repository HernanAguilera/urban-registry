#!/usr/bin/env node

import { CsvGenerator } from './csv-generator';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const argIndex = args.findIndex(arg => arg === `--${name}`);
  return argIndex !== -1 && args[argIndex + 1] ? args[argIndex + 1] : undefined;
};

const hasFlag = (name: string): boolean => {
  return args.includes(`--${name}`);
};

// Default values
const count = parseInt(getArg('count') || '1000');
const tenantId = getArg('tenant') || 'tenant-test';
const filename = getArg('filename') || `properties_${count}_rows.csv`;
const outputPath = getArg('output') || '/app/uploads';
const includeExternalId = !hasFlag('no-external-id');
const generateUpdate = hasFlag('update');
const useExistingIds = hasFlag('use-existing-ids');

// Validation
if (isNaN(count) || count <= 0) {
  console.error('❌ Error: count must be a positive number');
  process.exit(1);
}

if (count > 200000) {
  console.error('❌ Error: count cannot exceed 200,000 for performance reasons');
  process.exit(1);
}

// Help text
if (hasFlag('help') || hasFlag('h')) {
  console.log(`
🏗️  CSV Generator for Red Atlas Properties

Usage:
  npm run generate-csv -- [options]

Options:
  --count <number>        Number of properties to generate (default: 1000, max: 200000)
  --tenant <string>       Tenant ID for properties (default: tenant-test)
  --filename <string>     Output filename (default: properties_<count>_rows.csv)
  --output <string>       Output directory (default: /app/uploads)
  --no-external-id        Don't include external_id column (for testing without UPSERT)
  --update               Generate update CSV with modified prices for UPSERT testing
  --use-existing-ids     Use external_ids from seeder for UPSERT testing
  --help, -h             Show this help message

Examples:
  # Generate 1000 properties (default)
  npm run generate-csv

  # Generate 50,000 properties for load testing
  npm run generate-csv -- --count 50000

  # Generate 10,000 properties for specific tenant
  npm run generate-csv -- --count 10000 --tenant tenant-alpha

  # Generate update CSV for UPSERT testing (new external_ids)
  npm run generate-csv -- --count 100 --update

  # Generate CSV that will UPDATE existing properties from seeder
  npm run generate-csv -- --count 10 --update --use-existing-ids

  # Generate without external_id for legacy testing
  npm run generate-csv -- --count 500 --no-external-id

Performance Guidelines:
  - 1,000 rows: ~100KB, <1s generation
  - 10,000 rows: ~1MB, ~5s generation  
  - 50,000 rows: ~5MB, ~20s generation
  - 100,000 rows: ~10MB, ~40s generation (challenge requirement)
  `);
  process.exit(0);
}

// Main execution
async function main() {
  try {
    console.log(`
🚀 Red Atlas CSV Generator
========================
📊 Count: ${count.toLocaleString()} properties
🏢 Tenant: ${tenantId}
📁 Output: ${outputPath}/${filename}
🔑 External IDs: ${includeExternalId ? 'Yes' : 'No'}
🔄 Update Mode: ${generateUpdate ? 'Yes' : 'No'}
🔗 Use Existing IDs: ${useExistingIds ? 'Yes' : 'No'}
    `);

    const startTime = Date.now();

    if (generateUpdate) {
      // Generate update CSV for UPSERT testing
      const updatePath = CsvGenerator.generateUpdateCsv(`${outputPath}/${filename}`, {
        outputPath,
        filename: `update_${filename}`,
        updatePercentage: Math.min(50, count),
        priceIncrease: 1.15 // 15% price increase
      });
      
      console.log(`
✅ Update CSV generated for UPSERT testing!
📄 Use this file to test UPSERT functionality with existing external_ids
      `);
    } else {
      // Generate main CSV
      const outputFilePath = CsvGenerator.generatePropertiesCsv({
        count,
        tenantId,
        includeExternalId,
        outputPath,
        filename,
        updateMode: generateUpdate,
        useExistingExternalIds: useExistingIds
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log(`
⚡ Performance:
   Generation time: ${duration.toFixed(2)}s
   Rate: ${Math.round(count / duration).toLocaleString()} properties/second

🧪 Ready for testing:
   curl -X POST "http://localhost:3030/v1/imports" \\
     -H "Authorization: Bearer $TOKEN" \\
     -H "Idempotency-Key: test-$(date +%s)" \\
     -F "file=@${outputFilePath}"

📋 Next steps:
   1. Copy the file to your host system if needed
   2. Use the curl command above to test import
   3. Monitor progress with: curl "http://localhost:3030/v1/imports/status/JOB_ID"
      `);
    }

  } catch (error) {
    console.error(`❌ Error generating CSV: ${error.message}`);
    process.exit(1);
  }
}

main();