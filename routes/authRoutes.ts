import { AuthToken } from "./../utils/authHandler";
import express from "express";
const router = express.Router();
import jwt from "jsonwebtoken";
import {
  DEFAULT_ACCESS_SECRET,
  DEFAULT_REFRESH_SECRET,
} from "../utils/backupSecrets";
import { tokenContainer } from "../utils/authHandler";

//This is sent after the original authentication attempt fails.
router.post("/", (req: any, res: any) => {
  const refreshToken = req.body.token;

  if (!refreshToken) return res.sendStatus(401);

  if (
    !tokenContainer.some(
      (item: AuthToken) => item.refreshToken === refreshToken
    )
  )
    return res.sendStatus(403);

  jwt.verify(
    refreshToken,
    process.env.REFRESH_SECRET || DEFAULT_REFRESH_SECRET,
    (err: any, user: any) => {
      if (err) return res.sendStatus(403);

      const accessToken = jwt.sign(
        { name: req.body.email },
        process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET,
        { expiresIn: "12h" }
      );

      res.json({ accessToken });
    }
  );
});

export default router;
