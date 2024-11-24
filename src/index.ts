import "reflect-metadata";
import * as dotenv from 'dotenv';
import process from 'process';
import { createConnection } from "typeorm";
import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import cors from "cors";
import log from './middlewares/log';
import routes from "./routes";
import passport from "passport";

class Server {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
  }

  public routes(): void {
    this.app.use("/", log ,routes);
  }

  public config(): void {
    this.app.set("port", process.env.PORT || 9001);
    this.app.set('trust proxy', true)
    this.app.use(passport.initialize());
    this.app.use('/public', express.static('public'))
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(cors({
      origin: "*"
    }));
    this.app.use(helmet());
  }

  public start(): void {
    this.app.listen(this.app.get("port"), () => {
      console.log("Server running at http://localhost:%d", this.app.get("port"));
    });
  }
}

const server = new Server();

// Connects to the Database -> then starts the express
createConnection('default').then(async () => {
  server.start();
});
