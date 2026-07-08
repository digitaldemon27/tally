import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { user } from "../Models/patientModel.js";
import transporter from "../service/nodemailer.js";
import redisClient from "../config/redisConfig.js";

