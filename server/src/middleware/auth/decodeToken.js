import jwt from "jsonwebtoken";

export function decodeToken(req, res, next){
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
        req.userId = decoded._id;
        next();
    } catch (error) {
        res.status(401).json({
            message : "Unauthorized"
        })
    }
}

