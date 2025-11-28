import fs from 'fs';
import path from 'path';

// Read the JSON file
const filePath = path.join(__dirname, '9-10.json');
console.log('Reading file:', filePath);

const rawData = fs.readFileSync(filePath, 'utf8');
const jsonData = JSON.parse(rawData);

// Extract the data array
const data = jsonData.data || jsonData;

if (!Array.isArray(data)) {
  console.error('Error: Expected an array of data objects');
  process.exit(1);
}

// Calculate the average value
const sum = data.reduce((acc, item) => acc + (item.value || 0), 0);
const count = data.length;
const average = count > 0 ? sum / count : 0;

// Calculate min and max values efficiently
let minValue = Infinity;
let maxValue = -Infinity;

for (const item of data) {
  if (item.value < minValue) minValue = item.value;
  if (item.value > maxValue) maxValue = item.value;
}

// Calculate monthly value (average * 1000 * 24 * 30)
const monthlyValue = average * 1000 * 24 * 30;

// Display results
console.log('\n=== Statistics ===');
console.log(`Total entries: ${count.toLocaleString()}`);
console.log(`Sum of values: ${sum.toFixed(8)}`);
console.log(`Average value: ${average.toFixed(8)}`);
console.log(`Monthly value (avg × 1000 × 24 × 30): ${monthlyValue.toFixed(4)}`);
console.log(`Min value: ${minValue.toFixed(8)}`);
console.log(`Max value: ${maxValue.toFixed(8)}`);
