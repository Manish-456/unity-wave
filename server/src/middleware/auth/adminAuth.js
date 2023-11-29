import jwt from "jsonwebtoken";
import Admin from "../../models/admin.model";

export async function requireAdminAuth(req, res, next){
    try {
        const token = req.headers.authorization.split(" ")[1];

        const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

        const admin = Admin.findById(decoded.id);

        if(admin){
            next();
        }else{
            res.status(401).json({
                message : "Unauthorized"
            })
        }
    } catch (error) {
        res.status(500).json({
            message : "Internal server error"
        })
    }
}