#!/usr/bin/env node
"use strict";

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import pkg from "pg";
const { Client } = pkg;

async function main() {
  // Read the connection string from the POSTGRES_URL environment variable
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("Error: POSTGRES_URL environment variable is not set.");
    process.exit(1);
  }

  // Initialize a new PostgreSQL client
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const filePath = "./src/data/proxy-webshare-id.txt";
    const fileData = fs.readFileSync(filePath, "utf8");

    // Split into lines and remove any empty lines
    const lines = fileData
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    // Prepare values and placeholders arrays for bulk insertion.
    const values = [];
    const placeholders = [];
    let placeholderIndex = 1;

    for (const line of lines) {
      // Each line format: host:port:username:password
      const [host, port, username, password] = line.split(":");

      // For agentId we are inserting null
      values.push(null, host, port, username, password);

      // Create a placeholder group for this row: ($1, $2, $3, $4, $5), etc.
      placeholders.push(
        `($${placeholderIndex}, $${placeholderIndex + 1}, $${
          placeholderIndex + 2
        }, $${placeholderIndex + 3}, $${placeholderIndex + 4})`
      );
      placeholderIndex += 5;
    }

    if (values.length > 0) {
      const queryText = `
        INSERT INTO agent_proxys ("agentId", host, port, username, password)
        VALUES ${placeholders.join(", ")}
      `;
      await client.query(queryText, values);
      console.log("Data inserted successfully!");
    } else {
      console.log("No data found to insert.");
    }
  } catch (error) {
    console.error("Error inserting data:", error);
  } finally {
    await client.end();
  }
}

// Run the script
main();
