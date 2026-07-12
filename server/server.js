import dotenv from 'dotenv';
import { connectDB, clusterConnection } from "./config/dbConfig.js"
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import masterRoutes from './routes/masterRoutes.js';

//configering env file
dotenv.config({ override: true });

//express route
const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(express.json({ limit: '1mb' })); // limiting payload to protect from DoS
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Health Check Endpoint (keeps track of DB state)
app.get('/health', (req, res) => {
    const dbState = clusterConnection.readyState;
    if (dbState !== 1) {
        return res.status(503).json({
            success: false,
            status: 'DOWN',
            message: 'Database connection is offline'
        });
    }
    res.status(200).json({
        success: true,
        status: 'UP',
        message: 'Database is connected'
    });
});

// Routes
app.use('/api', masterRoutes);

// Error Handler
app.use((err, req, res, next) => {
    console.error(err); // Log the full stack trace securely on the server

    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        success: false,
        message: isProduction ? 'Internal Server Error' : err.message
    });
});


// Start Server
const startServer = async () => {
    try {
        await connectDB();

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error("Failed to start the application server:", error.message);
    }

}
startServer();