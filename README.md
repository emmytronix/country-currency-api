# Country Currency & Exchange API

A RESTful Node.js API that fetches country data and exchange rates, computes estimated GDP, and serves endpoints for country queries and summary images.

## Features

- Fetches country data & exchange rates from external APIs
- Stores/caches results in MySQL
- Endpoints for list, filter, get, delete, refresh
- Serves a summary image (top 5 by GDP, total countries)
- Robust error handling & validation

## Endpoints

| Method | Endpoint                    | Description                      |
|--------|-----------------------------|----------------------------------|
| POST   | /countries/refresh          | Refresh & cache country data     |
| GET    | /countries                  | List countries (filters/sort)    |
| GET    | /countries/:name            | Get details for a country        |
| DELETE | /countries/:name            | Delete a country record          |
| GET    | /status                     | Get total count & refresh time   |
| GET    | /countries/image            | Get summary image (PNG)          |

## Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/emmytronix/country-currency-api.git
   cd <your-repo>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Copy `.env.example` to `.env`
   - Fill in your MySQL credentials:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASS=yourpassword
     DB_NAME=countries
     PORT=3000
     ```

4. **Create MySQL database and tables**
   - Run in MySQL shell:
     ```sql
     CREATE DATABASE countries;
     USE countries;
     -- paste contents of schema.sql
     ```

5. **Start the server**
   ```bash
   npm start
   ```

## Usage

- `POST /countries/refresh`: Refreshes and caches all country data.
- `GET /countries`: Lists all countries, supports filters (`region`, `currency`, `sort`).
- `GET /countries/:name`: Get one country by name.
- `DELETE /countries/:name`: Delete a country.
- `GET /status`: Get total country count and last refresh time.
- `GET /countries/image`: Get summary PNG image.

## Deployment

- Railway: [railway.app](https://railway.app/)