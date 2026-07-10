import jwt from "jsonwebtoken";

/*
    **Authentication middleware 
         -every protected routes will be using this middleware to authenticate the user
         -verifies the token in the request's header.
 */


export const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization

    //checking if auth header is not empty and does not contain the junk before passing it to the jwt.verify()
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access token required",
        });
    }

    //now autHeader looks like Bearer_<token> so spliting the header from the space in between

    const token = authHeader.split(" ")[1]; //when spli is called array will be formed having "bearer" at the index 0 and the jwt at the index 1

    try {
        //now we know that jwt.verify takes the token and the secret key if matches than returns the payload
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("JWT verification failed:", error);
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token is expired"
            })
        }
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token. Please authenticate again.",
        });
    }
}