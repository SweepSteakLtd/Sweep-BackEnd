import * as dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as path from 'path';
import { checkGamstopRegistration } from './gamstop';

interface CSVRow {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  postcode: string;
  mobile: string;
  exclusion: string;
}

const parseCSV = (filePath: string): CSVRow[] => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');

  return lines.map(line => {
    const values = line.split(',');
    return {
      id: values[0],
      firstName: values[1],
      lastName: values[2],
      dateOfBirth: values[3],
      email: values[4],
      postcode: values[5],
      mobile: values[6],
      exclusion: values[7],
    };
  });
};

const runGamstopChecks = async () => {
  const csvPath = path.join(__dirname, 'Synthetic_Data_(27-07-2020)2.csv');
  const resultsPath = path.join(__dirname, 'gamstop_test_results.txt');
  const results: string[] = [];

  const logAndSave = (message: string) => {
    console.log(message);
    results.push(message);
  };

  logAndSave('Reading CSV file from: ' + csvPath);
  logAndSave('='.repeat(80));

  const rows = parseCSV(csvPath);
  logAndSave(`Found ${rows.length} records to check\n`);

  let checkedCount = 0;
  let registeredCount = 0;
  let notRegisteredCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    try {
      const userData = {
        first_name: row.firstName,
        last_name: row.lastName,
        date_of_birth: row.dateOfBirth,
        email: row.email,
        phone: row.mobile,
        postcode: row.postcode,
      };

      const result = await checkGamstopRegistration(userData);

      checkedCount++;

      const status = result.is_registered ? '✓ REGISTERED' : '✗ NOT REGISTERED';
      const expectedExclusion = row.exclusion === 'Y' ? 'Y (Expected)' : row.exclusion === 'P' ? 'P (Partial)' : 'N (Expected)';
      const match = (result.is_registered && row.exclusion === 'Y') || (!result.is_registered && row.exclusion !== 'Y') ? '✓ MATCH' : '✗ MISMATCH';

      logAndSave(`[${checkedCount}/${rows.length}] ${row.firstName} ${row.lastName} (${row.postcode})`);
      logAndSave(`  Status: ${status}`);
      logAndSave(`  CSV Exclusion: ${expectedExclusion}`);
      logAndSave(`  Result: ${match}`);
      if (result.registration_id) {
        logAndSave(`  Registration ID: ${result.registration_id}`);
      }
      logAndSave('');

      if (result.is_registered) {
        registeredCount++;
      } else {
        notRegisteredCount++;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      errorCount++;
      const errorMsg = `[${checkedCount + errorCount}/${rows.length}] ERROR - ${row.firstName} ${row.lastName} (${row.postcode})`;
      const errorDetail = `  Error: ${error.message}`;
      console.error(errorMsg);
      console.error(errorDetail);
      console.log();
      results.push(errorMsg);
      results.push(errorDetail);
      results.push('');
    }
  }

  logAndSave('='.repeat(80));
  logAndSave('SUMMARY:');
  logAndSave(`  Total records: ${rows.length}`);
  logAndSave(`  Successfully checked: ${checkedCount}`);
  logAndSave(`  Registered (excluded): ${registeredCount}`);
  logAndSave(`  Not registered: ${notRegisteredCount}`);
  logAndSave(`  Errors: ${errorCount}`);
  logAndSave('='.repeat(80));

  // Write results to file
  fs.writeFileSync(resultsPath, results.join('\n'), 'utf-8');
  console.log(`\nResults saved to: ${resultsPath}`);
};

// Run the script
runGamstopChecks().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
