import express from "express";

const app = express();

app.use(express.json({
    limit : '100kb'
}));

app.use(express.urlencoded({
    extended : true,
    limit : "100kb"
}));

app.get("/health-checkup", (_, res) => 
    res.json({
        message : "Server is up and running ✅"
    })
);

export default app;