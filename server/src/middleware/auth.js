import jwt from "jsonwebtoken";

export const signToken = (env, admin) =>
  jwt.sign({ sub: String(admin._id ?? admin.id), email: admin.email }, env.jwtSecret, { expiresIn: "12h" });

export function requireAuth(env, adminRepo) {
  return async (req, res, next) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Not signed in" });
    try {
      const p = jwt.verify(token, env.jwtSecret);
      const admin = await adminRepo.findById(p.sub);
      if (!admin) return res.status(401).json({ error: "Session expired" });
      req.admin = admin;
      next();
    } catch {
      res.status(401).json({ error: "Session expired" });
    }
  };
}
