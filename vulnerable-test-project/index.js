const express = require('express');
const mysql = require('mysql');
const fs = require('fs');
const app = express();

// ❌ VULNERABILITY 1: Hardcoded Secrets / Credentials
// Semgrep will flag this as a critical credential leak.
const dbPassword = "SuperSecretDbPassword123!#@";
const awsApiKey = "AKIAIOSFODNN7EXAMPLE"; // Mock AWS Access Key pattern

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: dbPassword,
  database: 'production_db'
});

// ❌ VULNERABILITY 2: SQL Injection (SQLi)
// Semgrep will flag this because we are concatenating user input directly into a SQL query.
app.get('/user', (req, res) => {
  const userId = req.query.id;
  const sqlQuery = "SELECT * FROM users WHERE id = " + userId; 
  
  connection.query(sqlQuery, (err, results) => {
    if (err) {
      res.status(500).send("Database error");
    } else {
      res.json(results);
    }
  });
});

// ❌ VULNERABILITY 3: Code Injection / Eval Bypass
// Semgrep will flag this as extremely dangerous arbitrary code execution.
app.get('/run', (req, res) => {
  const userCommand = req.query.command;
  const outcome = eval(userCommand); // Executes any JavaScript command passed by user
  res.send("Execution outcome: " + outcome);
});

// ❌ VULNERABILITY 4: Path Traversal
// Semgrep will flag this because user input is directly used to access filesystem paths.
app.get('/view-file', (req, res) => {
  const filename = req.query.file;
  const path = "/var/www/uploads/" + filename;
  
  fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
      res.status(404).send("File not found");
    } else {
      res.send(data);
    }
  });
});

app.listen(3000, () => {
  console.log('Vulnerable test server running on port 3000');
});
