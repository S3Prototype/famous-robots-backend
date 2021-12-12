import express from "express";
const router = express.Router();
import { ObjectID } from "mongodb";
import validator from "email-validator";
import bcrypt from "bcryptjs";
import { User, userModel } from "../schemas/user";
import { Robot, robotModel } from "../schemas/robot";
import jwt from "jsonwebtoken";
import {
  authenticateToken,
  tokenContainer,
  AuthToken,
} from "../utils/authHandler";

const {
  DEFAULT_ACCESS_SECRET,
  DEFAULT_REFRESH_SECRET,
} = require("../utils/backupSecrets");

router.post("/login", authenticateToken, (req: any, res: any, next) => {
  console.log("Logging in");
  //If they don't have an email, reject them, unless they're admin.
  if (!req.body.email) {
    //If they're not an admin, or their email is invalid
    return res.status(400).json({
      success: false,
      message: "Failed to log in. Please provide a valid email.",
    });
  }

  if (req.body.email !== "Admin" && !validator.validate(req.body.email)) {
    return res.status(400).json({
      success: false,
      message: "Failed to log in. Please provide a valid email.",
    });
  }

  if (!req.token && !req.body.password) {
    return res.status(400).json({
      success: false,
      message: "Please provide a password to log in.",
    });
  }

  userModel.findOne(
    { email: req.body.email },
    async (err: any, userData: any) => {
      if (err) {
        return res.status(502).json({
          success: false,
          message: `Failed to login ${req.body.email}. ${err} Possible database error. Please try again.`,
        });
      }

      const robotSet = await robotModel.find();

      if (userData) {
        const { email, password, isAdmin, votedForIDs } = userData;

        const sendData: any = {
          email,
          isAdmin,
          votedForIDs: votedForIDs || [],
          loggedIn: true,
        };

        if (req.validated) {
          sendData.accessToken = req.token;
          return res.status(200).json({
            robotSet: robotSet.reverse(),
            userData: sendData,
            message: `Successfully logged in ${email}`,
          });
        }

        if (req.body.password) {
          try {
            if (!isAdmin) {
              const passwordIsCorrect = await bcrypt.compare(
                req.body.password,
                password
              );

              if (!passwordIsCorrect) {
                return res
                  .status(401)
                  .json({ message: "Incorrect email or password." });
              }
            }

            if (isAdmin && req.body.password !== userData.password)
              return res
                .status(401)
                .json({ message: "Incorrect email or password." });

            sendData.accessToken = jwt.sign(
              { email },
              process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET,
              { expiresIn: "24h" }
            );
            sendData.refreshToken = jwt.sign(
              { email },
              process.env.REFRESH_SECRET || DEFAULT_REFRESH_SECRET
            );

            tokenContainer.push({
              accessToken: sendData.accessToken,
              email,
            });
          } catch (err) {
            return res.status(502).json({
              message: `Server authorization error. Your email and password may or may not be correct, but we could not validate you at this time. ${err}`,
            });
          }

          return res.status(200).json({
            robotSet: robotSet.reverse(),
            userData: sendData,
            message: `Successfully logged in ${email} and generated auth tokens.`,
          });
        }
      }

      return res
        .status(401)
        .json({ message: `Failed to login. email or password incorrect.` });
    }
  );
});

router.post("/register", async (req, res) => {
  if (
    !req.body.email ||
    !validator.validate(req.body.email) ||
    !req.body.password
  )
    return res.status(400).send({
      message: "Failed to register. Please provide an email and password.",
    });

  userModel.findOne(
    { email: req.body.email },
    async (err: any, userData: any) => {
      if (err) {
        return res.status(502).json({
          message: `Failed to register ${req.body.email}. Possible database rror. Please try again.`,
        });
      }
      if (!userData) {
        const robotSet = await robotModel.find();
        const newUserData: any = {
          _id: new ObjectID(),
          email: req.body.email,
          isAdmin: false,
          loggedIn: true,
          votedForIDs: [],
        };
        try {
          newUserData.password = await bcrypt.hash(req.body.password, 10);
          const newUser = new userModel(newUserData);
          newUser.isNew = true;
          await newUser.save();

          newUserData.accessToken = jwt.sign(
            { email: req.body.email },
            process.env.ACCESS_SECRET || DEFAULT_ACCESS_SECRET,
            { expiresIn: "24h" }
          );

          newUserData.refreshToken = jwt.sign(
            { email: req.body.email },
            process.env.REFRESH_SECRET || DEFAULT_REFRESH_SECRET
          );

          tokenContainer.push({
            accessToken: newUserData.accessToken,
            email: req.body.email,
          });

          return res.status(200).json({
            userData: newUserData,
            robotSet: robotSet.reverse(),
            message: `User ${newUserData.email} created`,
          });
        } catch (err) {
          console.log("Error registering user", err);
          return res
            .status(502)
            .json({ message: `Failed to create ${newUserData.email}.` });
        }
      }

      return res
        .status(400)
        .json({ message: `User ${req.body.email} already exists` });
    }
  );
});

router.post("/logout", async (req, res) => {
  try {
    let token = tokenContainer.find(
      (token) =>
        token.accessToken !== req.body.accessToken &&
        token.email !== req.body.email
    );

    if (!token) throw new Error("token not found.");

    let tokenIndex = tokenContainer.indexOf(token);

    //remove the token
    tokenContainer.splice(tokenIndex, 1);
  } catch (err) {
    return res.status(400).json({
      message: `Failed to logout user ${req.body.email}: ${err}`,
    });
  }

  return res
    .status(200)
    .json({ message: `Successfully logged out ${req.body.email}` });
});

export default router;
