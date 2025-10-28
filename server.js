require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Database connection pool (supports both local and Railway MySQL)
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'countries_db',
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS countries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        capital VARCHAR(255),
        region VARCHAR(100),
        population BIGINT NOT NULL,
        currency_code VARCHAR(10),
        exchange_rate DECIMAL(15, 4),
        estimated_gdp DECIMAL(20, 2),
        flag_url TEXT,
        last_refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_region (region),
        INDEX idx_currency (currency_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_status (
        id INT PRIMARY KEY DEFAULT 1,
        last_refreshed_at TIMESTAMP NULL,
        total_countries INT DEFAULT 0,
        CHECK (id = 1)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.query(`
      INSERT IGNORE INTO system_status (id, total_countries) VALUES (1, 0)
    `);

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Generate summary image
async function generateSummaryImage() {
  try {
    const connection = await pool.getConnection();
    
    const [status] = await connection.query(
      'SELECT total_countries, last_refreshed_at FROM system_status WHERE id = 1'
    );

    const [topCountries] = await connection.query(`
      SELECT name, estimated_gdp 
      FROM countries 
      WHERE estimated_gdp IS NOT NULL 
      ORDER BY estimated_gdp DESC 
      LIMIT 5
    `);

    connection.release();

    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#eee';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Country Data Summary', width / 2, 60);

    // Total countries
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#4ecca3';
    ctx.fillText(`Total Countries: ${status[0].total_countries}`, width / 2, 120);

    // Top 5 countries
    ctx.fillStyle = '#eee';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Top 5 by Estimated GDP', 50, 180);

    ctx.font = '20px Arial';
    topCountries.forEach((country, index) => {
      const y = 220 + (index * 50);
      ctx.fillStyle = '#93bfec';
      ctx.fillText(`${index + 1}. ${country.name}`, 70, y);
      ctx.fillStyle = '#4ecca3';
      ctx.fillText(`$${parseFloat(country.estimated_gdp).toLocaleString('en-US', { maximumFractionDigits: 2 })}`, 400, y);
    });

    // Timestamp
    ctx.fillStyle = '#888';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    const timestamp = status[0].last_refreshed_at 
      ? new Date(status[0].last_refreshed_at).toISOString()
      : 'Never';
    ctx.fillText(`Last Refreshed: ${timestamp}`, width / 2, height - 30);

    // Save image
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(cacheDir, 'summary.png'), buffer);

    console.log('Summary image generated successfully');
  } catch (error) {
    console.error('Error generating summary image:', error);
  }
}

// POST /countries/refresh
app.post('/countries/refresh', async (req, res) => {
  let connection;
  try {
    // Fetch countries data
    const countriesResponse = await axios.get(
      'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies',
      { timeout: 30000 }
    );

    const countries = countriesResponse.data;

    // Fetch exchange rates
    let exchangeRates;
    try {
      const ratesResponse = await axios.get(
        'https://open.er-api.com/v6/latest/USD',
        { timeout: 30000 }
      );
      exchangeRates = ratesResponse.data.rates;
    } catch (error) {
      return res.status(503).json({
        error: 'External data source unavailable',
        details: 'Could not fetch data from exchange rates API'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const country of countries) {
      const name = country.name;
      const capital = country.capital || null;
      const region = country.region || null;
      const population = country.population;
      const flagUrl = country.flag || null;

      let currencyCode = null;
      let exchangeRate = null;
      let estimatedGdp = null;

      // Handle currency
      if (country.currencies && country.currencies.length > 0) {
        currencyCode = country.currencies[0].code;
        
        if (exchangeRates[currencyCode]) {
          exchangeRate = exchangeRates[currencyCode];
          const randomMultiplier = Math.random() * (2000 - 1000) + 1000;
          estimatedGdp = (population * randomMultiplier) / exchangeRate;
        }
      } else {
        estimatedGdp = 0;
      }

      // Upsert country
      await connection.query(`
        INSERT INTO countries 
        (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          capital = VALUES(capital),
          region = VALUES(region),
          population = VALUES(population),
          currency_code = VALUES(currency_code),
          exchange_rate = VALUES(exchange_rate),
          estimated_gdp = VALUES(estimated_gdp),
          flag_url = VALUES(flag_url),
          last_refreshed_at = NOW()
      `, [name, capital, region, population, currencyCode, exchangeRate, estimatedGdp, flagUrl]);
    }

    // Update system status
    const [countResult] = await connection.query('SELECT COUNT(*) as total FROM countries');
    await connection.query(
      'UPDATE system_status SET total_countries = ?, last_refreshed_at = NOW() WHERE id = 1',
      [countResult[0].total]
    );

    await connection.commit();
    connection.release();

    // Generate summary image
    await generateSummaryImage();

    res.json({
      message: 'Countries data refreshed successfully',
      total_countries: countResult[0].total
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error('Refresh error:', error);

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(503).json({
        error: 'External data source unavailable',
        details: 'Request timeout while fetching external data'
      });
    }

    if (axios.isAxiosError(error)) {
      return res.status(503).json({
        error: 'External data source unavailable',
        details: `Could not fetch data from ${error.config?.url || 'external API'}`
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /countries
app.get('/countries', async (req, res) => {
  try {
    const { region, currency, sort } = req.query;
    
    let query = 'SELECT * FROM countries WHERE 1=1';
    const params = [];

    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }

    if (currency) {
      query += ' AND currency_code = ?';
      params.push(currency);
    }

    if (sort === 'gdp_desc') {
      query += ' ORDER BY estimated_gdp DESC';
    } else if (sort === 'gdp_asc') {
      query += ' ORDER BY estimated_gdp ASC';
    } else {
      query += ' ORDER BY name ASC';
    }

    const [countries] = await pool.query(query, params);
    
    res.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /countries/image - MUST BE BEFORE :name ROUTE
app.get('/countries/image', (req, res) => {
  const imagePath = path.join(__dirname, 'cache', 'summary.png');
  
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Summary image not found' });
  }

  res.sendFile(imagePath);
});

// GET /countries/:name
app.get('/countries/:name', async (req, res) => {
  try {
    const [countries] = await pool.query(
      'SELECT * FROM countries WHERE LOWER(name) = LOWER(?)',
      [req.params.name]
    );

    if (countries.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json(countries[0]);
  } catch (error) {
    console.error('Error fetching country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /countries/:name
app.delete('/countries/:name', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM countries WHERE LOWER(name) = LOWER(?)',
      [req.params.name]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }

    // Update total count
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM countries');
    await pool.query(
      'UPDATE system_status SET total_countries = ? WHERE id = 1',
      [countResult[0].total]
    );

    res.json({ message: 'Country deleted successfully' });
  } catch (error) {
    console.error('Error deleting country:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /status
app.get('/status', async (req, res) => {
  try {
    const [status] = await pool.query(
      'SELECT total_countries, last_refreshed_at FROM system_status WHERE id = 1'
    );

    res.json({
      total_countries: status[0].total_countries,
      last_refreshed_at: status[0].last_refreshed_at
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /countries/image
app.get('/countries/image', (req, res) => {
  const imagePath = path.join(__dirname, 'cache', 'summary.png');
  
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Summary image not found' });
  }

  res.sendFile(imagePath);
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Country Currency & Exchange API',
    version: '1.0.0',
    status: 'running'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });