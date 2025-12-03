import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port =  process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/api/hello", (req, res) => {
  res.json({message: "Hello, World!"});
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});