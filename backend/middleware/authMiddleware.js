
import jwt from "jsonwebtoken";

const getJwtSecret = () => {
  return (
    process.env.JWT_SECRET ||
    "e2876ee6a69836f8bd96ddfd66a508e6d9558d8a0b880a8104537d2f29a4029f2228dc1cad182e932a0b21dd67c718363accddee3f2c51b500d27df98253228b"
  );
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;
