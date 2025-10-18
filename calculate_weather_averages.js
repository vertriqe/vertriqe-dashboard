const fs = require('fs');

// Read the CSV file
const csvData = fs.readFileSync('kwuntongweatherhistory.csv', 'utf-8');

// Parse the CSV data
const lines = csvData.trim().split('\n');
const weatherData = lines.map(line => {
  const [year, month, day, temp, unit] = line.split(',');
  return {
    year: parseInt(year),
    month: parseInt(month),
    day: parseInt(day),
    temp: parseFloat(temp),
    unit: unit
  };
});

// Group by year and month, calculate averages
const monthlyAverages = {};

weatherData.forEach(({ year, month, temp }) => {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  if (!monthlyAverages[key]) {
    monthlyAverages[key] = {
      year,
      month,
      sum: 0,
      count: 0
    };
  }
  monthlyAverages[key].sum += temp;
  monthlyAverages[key].count += 1;
});

// Calculate and display averages
console.log('\nKwun Tong Monthly Average Temperature\n');
console.log('Year-Month | Average Temp (°C) | Days');
console.log('-----------|-------------------|------');

Object.keys(monthlyAverages).sort().forEach(key => {
  const data = monthlyAverages[key];
  const average = (data.sum / data.count).toFixed(2);
  console.log(`${key}      | ${average.padStart(17)} | ${data.count}`);
});

// Calculate yearly averages
console.log('\n\nYearly Average Temperature\n');
console.log('Year | Average Temp (°C)');
console.log('-----|------------------');

const yearlyAverages = {};
weatherData.forEach(({ year, temp }) => {
  if (!yearlyAverages[year]) {
    yearlyAverages[year] = { sum: 0, count: 0 };
  }
  yearlyAverages[year].sum += temp;
  yearlyAverages[year].count += 1;
});

Object.keys(yearlyAverages).sort().forEach(year => {
  const data = yearlyAverages[year];
  const average = (data.sum / data.count).toFixed(2);
  console.log(`${year} | ${average}`);
});

// Calculate overall seasonal averages (for all years combined)
console.log('\n\nSeasonal Averages (All Years Combined)\n');
console.log('Season         | Average Temp (°C)');
console.log('---------------|------------------');

const seasonalData = {
  'Winter (Dec-Feb)': { sum: 0, count: 0 },
  'Spring (Mar-May)': { sum: 0, count: 0 },
  'Summer (Jun-Aug)': { sum: 0, count: 0 },
  'Fall (Sep-Nov)': { sum: 0, count: 0 }
};

weatherData.forEach(({ month, temp }) => {
  if ([12, 1, 2].includes(month)) {
    seasonalData['Winter (Dec-Feb)'].sum += temp;
    seasonalData['Winter (Dec-Feb)'].count += 1;
  } else if ([3, 4, 5].includes(month)) {
    seasonalData['Spring (Mar-May)'].sum += temp;
    seasonalData['Spring (Mar-May)'].count += 1;
  } else if ([6, 7, 8].includes(month)) {
    seasonalData['Summer (Jun-Aug)'].sum += temp;
    seasonalData['Summer (Jun-Aug)'].count += 1;
  } else if ([9, 10, 11].includes(month)) {
    seasonalData['Fall (Sep-Nov)'].sum += temp;
    seasonalData['Fall (Sep-Nov)'].count += 1;
  }
});

Object.entries(seasonalData).forEach(([season, data]) => {
  const average = (data.sum / data.count).toFixed(2);
  console.log(`${season.padEnd(15)} | ${average}`);
});

// Save results to JSON file
const results = {
  monthlyAverages: Object.keys(monthlyAverages).sort().map(key => ({
    yearMonth: key,
    year: monthlyAverages[key].year,
    month: monthlyAverages[key].month,
    averageTemp: parseFloat((monthlyAverages[key].sum / monthlyAverages[key].count).toFixed(2)),
    daysCount: monthlyAverages[key].count
  })),
  yearlyAverages: Object.keys(yearlyAverages).sort().map(year => ({
    year: parseInt(year),
    averageTemp: parseFloat((yearlyAverages[year].sum / yearlyAverages[year].count).toFixed(2)),
    daysCount: yearlyAverages[year].count
  })),
  seasonalAverages: Object.entries(seasonalData).map(([season, data]) => ({
    season,
    averageTemp: parseFloat((data.sum / data.count).toFixed(2)),
    daysCount: data.count
  }))
};

fs.writeFileSync('kwuntong_weather_averages.json', JSON.stringify(results, null, 2));
console.log('\n\nResults saved to kwuntong_weather_averages.json');
