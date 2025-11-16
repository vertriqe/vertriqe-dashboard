# Saved Energy API - Usage Manual

## Endpoint
```
GET https://adest.vertriqe.io/api/saved-energy
```

## Parameters
- **id** (required): Project code (e.g., `weave`, `tnl`)
- **timestamp** (required): Unix timestamp for the date you want to query
- **token** (required): `dualmint_sFD05QtMc1cEoiYt`

## Example Request
```bash
curl "https://adest.vertriqe.io/api/saved-energy?id=weave&timestamp=1731715200&token=dualmint_sFD05QtMc1cEoiYt"
```

## Response Format
```json
{
  "success": true,
  "data": {
    "id": "weave",
    "timestamp": 1731715200,
    "date": "2025-11-16",
    "projectedEnergy": 156.78,
    "energyUsage": 135.69,
    "savingsPercentage": 13.45,
    "savedEnergy": 21.09,
    "dataPoints": 96,
    "unit": "kWh"
  }
}
```

## Response Fields
- **projectedEnergy**: Total projected energy consumption for the day
- **energyUsage**: Actual energy consumed after savings
- **savingsPercentage**: Calculated savings percentage (10-16%, varies by date)
- **savedEnergy**: Amount of energy saved
- **unit**: All values are in kilowatt-hours (kWh)

## Getting Unix Timestamp
From any date, you can get the timestamp at https://www.unixtimestamp.com or use:
```bash
date -j -f "%Y-%m-%d" "2025-11-16" +%s
```
