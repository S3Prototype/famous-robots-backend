import jwt from "jsonwebtoken";
import { DEFAULT_ACCESS_SECRET } from "./backupSecrets";

export interface AuthToken {
  refreshToken?: any;
  accessToken: any;
  email?: any;
}

export let tokenContainer: AuthToken[] = [];

export const authenticateToken = async (req: any, res: any, next: any) => {
  res.set({ "Content-Type": "application/json" });

  req.validated = false;

  if (req.body && req.body.password) return next();

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token && (!req.body || !req.body.email)) {
    console.log("Token was not found, and no email provided.");
    return res.status(401).json({
      message: "Account credentials unverifiable. Please log in again.",
    });
  }

  jwt.verify(
    token,
    process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET,
    (err: any, userData: any) => {
      if (!err) {
        const foundToken = tokenContainer.find(
          (item) => item.accessToken === token
        );
        if (foundToken) {
          req.validated = true;
          req.token = foundToken;
          return next();
        }
      }
      console.log("Error, access token expired.", err);
      return res.status(401).json({
        message:
          "Access token expired. Send refresh token or log in with password.",
      });
    }
  );
};
