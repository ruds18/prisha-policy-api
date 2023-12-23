import express, { Express, Request, Response } from "express";
import cors from "cors"
import dotenv from "dotenv";
import  {initTRPC} from "@trpc/server"
import {createExpressMiddleware} from "@trpc/server/adapters/express"
import  { Client } from "pg";
import { appRouter } from "../routers";
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors({origin: "http://localhost:5173"}))

app.use('/trpc' , createExpressMiddleware({router : appRouter}));

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
}); 

export type appRouter = typeof appRouter;