import jwt from "jsonwebtoken";

export default function adminMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Please sign in as an administrator.",
      });
    }

    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({
        message: "Administrator access required.",
      });
    }

    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired login session.",
    });
  }
}
