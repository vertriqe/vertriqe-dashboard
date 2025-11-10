const now = new Date(); // UTC time
const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0)); // First day of previous month at 00:00
const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59)); // Last day of previous month at 23:59:59
const tsFrom = Math.round(fromDate.getTime() / 1000);
const tsTo = Math.round(toDate.getTime() / 1000);


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

const dailyAverage = averageValue * 24;
const daysInMonth = Math.round((tsTo - tsFrom) / (60 * 60 * 24));
const monthlyAverage = dailyAverage * daysInMonth;
console.log("Average Power Consumption (kW): ", averageValue);
console.log("Daily Average Energy Usage (kWh): ", dailyAverage);
console.log("Days in Month: ", daysInMonth);
console.log("Estimated Monthly Energy Usage (kWh): ", monthlyAverage * 1000);
