//const tsFrom = 1756479600; // 30/aug
//const tsTo = 1759158000;   // 30/sep
const tsFrom = 1759244400; // 1/oct
const tsTo = 1761836400;   // 31/oct

const apiUrl = "https://gtsdb-admin.vercel.app/api/tsdb?apiUrl=http%3A%2F%2F35.221.150.154%3A5556"
//e.g. {"operation":"read","key":"vertriqe_25245_weave","Read":{"start_timestamp":1756479600,"end_timestamp":1759158000}}
const payload = {
    operation: "read",
    key: "vertriqe_25245_weave",
    Read: {
        start_timestamp: tsFrom,
        end_timestamp: tsTo
    }
}
//fetch data from the API
const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
});

const energyUsage = await response.json();
console.log("Fetched energy usage data: ", energyUsage);

// Check if the response was successful
if (!energyUsage.success || !energyUsage.data) {
    console.error("Error fetching data:", energyUsage.message || "Unknown error");
    process.exit(1);
}

// Access the nested data array
const dataArray = energyUsage.data.data;
if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.error("Error: No data returned from API");
    process.exit(1);
}

//calculate average value
let accumulatedValue = 0;
console.log(`Processing ${dataArray.length} data points...`);
dataArray.forEach(entry => {
    accumulatedValue += entry.value;
});

const averageValue = accumulatedValue / dataArray.length;

//multiply by 24 hours to get daily average, and then by 30 to get monthly average
const dailyAverage = averageValue * 24;
const monthlyAverage = dailyAverage * 30;

console.log("Estimated Monthly Energy Usage (kWh): ", monthlyAverage * 1000);
