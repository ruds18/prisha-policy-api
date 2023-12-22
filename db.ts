import  { Client } from "pg";

export const client = new Client({
    user: "acecpfkh",
    host: "rain.db.elephantsql.com",
    database: "acecpfkh",
    password: "13Kd4lyR8JNC1x80ACcgD_s34aeadpiE",
    port: 5432,
  });

  client.connect(function (err) {
    if (err) throw err;
    console.log("[Databse]: Connected to the database!");
  });