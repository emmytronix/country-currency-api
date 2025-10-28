# API Documentation

## Base URL
```
Local: http://localhost:3000
Production: https://your-app.up.railway.app
```

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/countries/refresh` | Fetch and cache country data |
| GET | `/countries` | Get all countries |
| GET | `/countries/:name` | Get specific country |
| DELETE | `/countries/:name` | Delete a country |
| GET | `/status` | Get system status |
| GET | `/countries/image` | Get summary image |

---

## Detailed Endpoint Documentation

### 1. Health Check

**Endpoint:** `GET /`

**Description:** Check if the API is running

**Request:**
```bash
curl http://localhost:3000/
```

**Response:** `200 OK`
```json
{
  "message": "Country Currency & Exchange API",
  "version": "1.0.0",
  "status": "running"
}
```

---

### 2. Refresh Country Data

**Endpoint:** `POST /countries/refresh`

**Description:** Fetches all countries from REST Countries API, gets exchange rates, calculates estimated GDP, stores in database, and generates summary image.

**Request:**
```bash
curl -X POST http://localhost:3000/countries/refresh
```

**Success Response:** `200 OK`
```json
{
  "message": "Countries data refreshed successfully",
  "total_countries": 250
}
```

**Error Responses:**

`503 Service Unavailable` - External API failure
```json
{
  "error": "External data source unavailable",
  "details": "Could not fetch data from exchange rates API"
}
```

`500 Internal Server Error`
```json
{
  "error": "Internal server error"
}
```

**Notes:**
- This endpoint should be called first before using other endpoints
- Recalculates GDP with new random multipliers for all countries
- Updates `last_refreshed_at` timestamp
- Generates new summary image at `cache/summary.png`
- May take 30-60 seconds to complete

---

### 3. Get All Countries

**Endpoint:** `GET /countries`

**Description:** Retrieve all countries with optional filtering and sorting

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| region | string | Filter by region | `Africa`, `Europe`, `Asia` |
| currency | string | Filter by currency code | `NGN`, `USD`, `GBP` |
| sort | string | Sort by GDP | `gdp_desc`, `gdp_asc` |

**Request Examples:**
```bash
# Get all countries
curl http://localhost:3000/countries

# Filter by region
curl http://localhost:3000/countries?region=Africa

# Filter by currency
curl http://localhost:3000/countries?currency=NGN

# Filter and sort
curl http://localhost:3000/countries?region=Africa&sort=gdp_desc

# Multiple filters
curl http://localhost:3000/countries?region=Europe&currency=EUR&sort=gdp_desc
```

**Success Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Nigeria",
    "capital": "Abuja",
    "region": "Africa",
    "population": 206139589,
    "currency_code": "NGN",
    "exchange_rate": 1600.2300,
    "estimated_gdp": 25767448125.20,
    "flag_url": "https://flagcdn.com/ng.svg",
    "last_refreshed_at": "2025-10-22T18:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Ghana",
    "capital": "Accra",
    "region": "Africa",
    "population": 31072940,
    "currency_code": "GHS",
    "exchange_rate": 15.3400,
    "estimated_gdp": 3029834520.60,
    "flag_url": "https://flagcdn.com/gh.svg",
    "last_refreshed_at": "2025-10-22T18:00:00.000Z"
  }
]
```

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Internal server error"
}
```

---

### 4. Get Single Country

**Endpoint:** `GET /countries/:name`

**Description:** Get detailed information about a specific country by name (case-insensitive)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Country name |

**Request Examples:**
```bash
# Standard case
curl http://localhost:3000/countries/Nigeria

# Lowercase
curl http://localhost:3000/countries/nigeria

# Mixed case
curl http://localhost:3000/countries/NIGERIA
```

**Success Response:** `200 OK`
```json
{
  "id": 1,
  "name": "Nigeria",
  "capital": "Abuja",
  "region": "Africa",
  "population": 206139589,
  "currency_code": "NGN",
  "exchange_rate": 1600.2300,
  "estimated_gdp": 25767448125.20,
  "flag_url": "https://flagcdn.com/ng.svg",
  "last_refreshed_at": "2025-10-22T18:00:00.000Z"
}
```

**Error Responses:**

`404 Not Found` - Country doesn't exist
```json
{
  "error": "Country not found"
}
```

`500 Internal Server Error`
```json
{
  "error": "Internal server error"
}
```

---

### 5. Delete Country

**Endpoint:** `DELETE /countries/:name`

**Description:** Delete a country record from the database (case-insensitive)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Country name |

**Request Examples:**
```bash
curl -X DELETE http://localhost:3000/countries/Nigeria
```

**Success Response:** `200 OK`
```json
{
  "message": "Country deleted successfully"
}
```

**Error Responses:**

`404 Not Found` - Country doesn't exist
```json
{
  "error": "Country not found"
}
```

`500 Internal Server Error`
```json
{
  "error": "Internal server error"
}
```

**Notes:**
- Automatically updates the total country count in system status
- Cannot be undone without running `/countries/refresh` again

---

### 6. Get System Status

**Endpoint:** `GET /status`

**Description:** Get system information including total countries and last refresh time

**Request:**
```bash
curl http://localhost:3000/status
```

**Success Response:** `200 OK`
```json
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-22T18:00:00.000Z"
}
```

**Notes:**
- `last_refreshed_at` will be `null` if `/countries/refresh` has never been called
- `total_countries` reflects current database count (updated on refresh and delete)

---

### 7. Get Summary Image

**Endpoint:** `GET /countries/image`

**Description:** Serves a PNG image with country statistics

**Request:**
```bash
curl http://localhost:3000/countries/image --output summary.png

# Or open in browser
open http://localhost:3000/countries/image
```

**Success Response:** `200 OK`
- Content-Type: `image/png`
- Returns PNG image file

**Image Contains:**
- Total number of countries
- Top 5 countries by estimated GDP
- Last refresh timestamp
- Visually styled with gradient background

**Error Response:** `404 Not Found`
```json
{
  "error": "Summary image not found"
}
```

**Notes:**
- Image is generated automatically after `/countries/refresh`
- Stored at `cache/summary.png`
- Regenerated on each refresh

---

## Data Models

### Country Object

```typescript
{
  id: number,              // Auto-increment primary key
  name: string,            // Country name (unique)
  capital: string | null,  // Capital city
  region: string | null,   // Geographic region
  population: number,      // Population count
  currency_code: string | null,  // ISO currency code (e.g., "NGN")
  exchange_rate: number | null,  // Exchange rate to USD
  estimated_gdp: number | null,  // Calculated GDP
  flag_url: string | null,       // URL to flag image
  last_refreshed_at: string      // ISO 8601 timestamp
}
```

### System Status Object

```typescript
{
  total_countries: number,        // Total countries in database
  last_refreshed_at: string | null  // ISO 8601 timestamp
}
```

---

## Business Logic

### Currency Handling

1. **Multiple Currencies:** If a country has multiple currencies, only the **first** currency is stored
2. **No Currency:** If `currencies` array is empty:
   - `currency_code` = `null`
   - `exchange_rate` = `null`
   - `estimated_gdp` = `0`
3. **Currency Not Found in Rates:** If currency exists but not in exchange rates API:
   - `currency_code` = (stored)
   - `exchange_rate` = `null`
   - `estimated_gdp` = `null`

### GDP Calculation

**Formula:**
```
estimated_gdp = (population × random_multiplier) ÷ exchange_rate
```

Where:
- `random_multiplier` = random number between 1000 and 2000
- Generated fresh on each refresh for each country
- If exchange_rate is null, GDP is null

### Update vs Insert

On `/countries/refresh`:
- Countries are matched by **name** (case-insensitive)
- **Existing country:** All fields updated, GDP recalculated with new random multiplier
- **New country:** Inserted as new record
- All timestamps updated to current time

---

## Error Handling

All errors return consistent JSON format:

### Error Response Structure
```json
{
  "error": "Error type",
  "details": "Optional detailed message"
}
```

### HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful request |
| 400 | Bad Request | Validation failed |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | External API failure |

---

## Rate Limits

**External APIs:**
- REST Countries API: No official limit (community-supported)
- Exchange Rates API: Free tier, reasonable use expected
- Both APIs have 30-second timeout in the application

**Best Practices:**
- Don't call `/countries/refresh` more than once per hour
- Cache responses on your client when possible
- Use filters to reduce data transfer

---

## Testing the API

### Using cURL

```bash
# 1. First, refresh the data
curl -X POST http://localhost:3000/countries/refresh

# 2. Check status
curl http://localhost:3000/status

# 3. Get all countries
curl http://localhost:3000/countries

# 4. Filter by region
curl "http://localhost:3000/countries?region=Africa&sort=gdp_desc"

# 5. Get specific country
curl http://localhost:3000/countries/Nigeria

# 6. Download image
curl http://localhost:3000/countries/image --output summary.png

# 7. Delete a country
curl -X DELETE http://localhost:3000/countries/TestCountry
```

### Using Postman

1. Import the following collection:
   - Create requests for each endpoint
   - Set base URL as variable: `{{base_url}}`
   - Add tests for status codes

2. Test sequence:
   - POST `/countries/refresh` → verify 200
   - GET `/status` → verify total_countries > 0
   - GET `/countries` → verify array returned
   - GET `/countries/:name` → verify object returned
   - GET `/countries/image` → verify image returned

---

## Common Use Cases

### 1. Initial Setup
```bash
# Step 1: Deploy application
# Step 2: Initialize data
curl -X POST https://your-app.up.railway.app/countries/refresh

# Step 3: Verify
curl https://your-app.up.railway.app/status
```

### 2. Get African Countries Sorted by GDP
```bash
curl "https://your-app.up.railway.app/countries?region=Africa&sort=gdp_desc"
```

### 3. Find All Countries Using Euro
```bash
curl "https://your-app.up.railway.app/countries?currency=EUR"
```

### 4. Get Country Details
```bash
curl https://your-app.up.railway.app/countries/Nigeria
```

### 5. Daily Data Refresh (Cron Job)
```bash
# Set up a daily cron job or scheduled task
0 2 * * * curl -X POST https://your-app.up.railway.app/countries/refresh
```

---

## Support

For issues or questions:
1. Check the main README.md
2. Review error messages carefully
3. Open an issue on GitHub with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or logs