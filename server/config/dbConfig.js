import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const clusterUrl = process.env.MONGODB_URL;

// unlike .connect() which sets up only one locked DB connection , .creatConnection() creates isolation connection pool
export const clusterConnection = mongoose.createConnection(clusterUrl, {
    maxPoolSize: 15, //15 DB opeations at once
});


clusterConnection.on("connected", () => {
    console.log("Connected with cluster successfully");
});

clusterConnection.on("error", (error) => {
    console.error("Error occurred during cluster connection: " + error.message);
});

clusterConnection.on("disconnected", () => {
    console.warn("Database cluster connection disconnected! Trying to reconnect...");
});

clusterConnection.on("reconnected", () => {
    console.log("Database cluster connection reconnected successfully.");
});

// Keep connectDB helper for server.js startup we must ensure that app should not try to accept the client API until the DBs accessibility
export const connectDB = async () => {
    try {
        //Check if we are already connected
        if (clusterConnection.readyState === 1) {
            return clusterConnection;
        }

        // Try to connect if we aren't 
        await clusterConnection.asPromise();
        console.log("ready state of the DB : ", clusterConnection.readyState);
        return clusterConnection;

    } catch (error) {
        // Catch the error so the server doesn't crash on boot
        console.error("Database connection failed, but keeping server alive:", error.message);
        return clusterConnection;
    }
};
