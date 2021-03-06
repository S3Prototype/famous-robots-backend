import express from "express";
const router = express.Router();
import cloudinary from "../utils/cloudinaryAPI";
import { userModel } from "../schemas/user";
import { Robot, robotModel } from "../schemas/robot";
const ObjectID = require("mongodb").ObjectID;
import { authenticateToken } from "../utils/authHandler";
import { Schema } from "mongoose";

router.get("/all", authenticateToken, async (req: any, res: any, next: any) => {
  if (!req.validated || !req.token) {
    return res
      .status(401)
      .json({ message: `You must be authorized to access the robots list.` });
  }

  try {
    const robotSet = await robotModel.find();
    return res.status(200).send({
      message: `You are authorized to access the robots list.`,
      robots: robotSet.reverse(),
    });
  } catch (err) {
    return res
      .status(502)
      .json({ message: `Could not get robots. Possible database error.` });
  }
});

//? consider using PUT here
router.post("/vote", authenticateToken, (req: any, res: any, next: any) => {
  // *Request expects robot list back

  if (!req.validated) {
    return res.status(401).json({ message: `You must be logged in to vote.` });
  }

  if (!req.body.email) {
    return res.status(400).json({ message: `You must be logged in to vote.` });
  }

  if (!req.body.robot) {
    return res.status(400).json({
      message: `At this time you are unable to vote for that robot..`,
    });
  }

  userModel.findOne(
    { email: req.body.email },
    async (err: any, userData: any) => {
      if (err) {
        return res
          .status(401)
          .json({ message: `User not found. Please log in again.` });
      }

      if (userData) {
        robotModel.findOne(
          { _id: req.body.robot._id },
          async (err: any, robotData: any) => {
            if (err) {
              return res
                .status(502)
                .json({ message: `Robot not found. Possible database error.` });
            }

            if (robotData) {
              try {
                const incrementedVotes = robotData.votes + 1;

                await robotData.updateOne({ votes: incrementedVotes });

                //*
                //Now get back the updated robot, just for  purposes
                const updatedRobot = await robotModel.findOne({
                  _id: robotData._id,
                });
                //*

                //Now update the user data/voted for ID's
                const newUserVotedForIDs = userData.votedForIDs;
                newUserVotedForIDs.push(updatedRobot._id);
                await userData.updateOne({ votedForIDs: newUserVotedForIDs });

                const robotSet = await robotModel.find();

                return res.status(200).json({
                  message: `${userData.email} successfully voted for ${updatedRobot.name}`,
                  robotSet: robotSet.reverse(),
                  votedForIDs: newUserVotedForIDs,
                });
              } catch (err) {
                return res
                  .status(500)
                  .json({ message: `Server error. Please try again later.` });
              }
            } else {
              return res
                .status(502)
                .json({ message: `Robot not found. Possible database error.` });
            }
          }
        );
      } else {
        return res
          .status(401)
          .json({ message: `User not found. Please log in again.` });
      }
    }
  );
});

router.post("/delete", authenticateToken, (req: any, res: any, next: any) => {
  if (!req.body.robot) {
    return res
      .status(400)
      .json({ message: `Please select the robot you wish to delete.` });
  }

  robotModel
    .deleteOne({ _id: req.body.robot._id })
    .then(async (_: any) => {
      const robotSet = await robotModel.find();

      return res.status(200).json({
        robotSet: robotSet.reverse(),
        message: `Successfully deleted ${req.body.robot.name}`,
      });
    })
    .catch((err: any) => {
      return res.status(500).json({
        message: `Failed to delete ${req.body.robot.name} - ${err.message}`,
      });
    });
});

router.post("/add", authenticateToken, (req: any, res: any, next: any) => {
  if (!req.validated)
    return res
      .status(401)
      .json({ message: `Please log in as an admin to add a robot.` });

  if (!req.body.data) {
    return res
      .status(400)
      .json({ message: `Please add an image for your robot.` });
  }

  robotModel.findOne(
    { name: req.body.name },
    async (err: any, robotData: any) => {
      if (err) {
        return res.status(502).json({
          message: `Possible database error. Your robot was not saved. Please try again. ${err}`,
        });
      }
      //If this robot already exists, can't add it.
      if (robotData) {
        return res.status(400).json({
          message: `Could not create robot. "${req.body.name}" already exists!`,
        });
      }
      try {
        const robotImage = await cloudinary.uploader.upload(req.body.data, {
          upload_preset: "mondofamousrobots",
        });

        const newRobotData = {
          name: req.body.name,
          image: robotImage.url,
          _id: new ObjectID(),
          votes: 0,
        };

        const newRobot = new robotModel(newRobotData);
        newRobot.isNew = true;
        if (await newRobot.save()) {
          const robotSet = await robotModel.find();
          return res.status(201).json({
            message: `${newRobotData.name} successfully created.`,
            robotSet: robotSet.reverse(),
          });
        } else
          throw new Error(
            `Failed to save robot ${req.body.name} to database. Possible MongoDB error.`
          );
      } catch (err) {
        return res.status(500).json({
          message: `Could not create ${name}. Server error. ${err}`,
        });
      }
    }
  );
});

router.post("/edit", authenticateToken, (req: any, res: any, next: any) => {
  if (!req.body.original || !req.body.new)
    return res.status(400).json({
      message: `Error. The client did not send enough information about the robot to edit it.`,
    });

  robotModel.findOne(
    { _id: req.body.original._id },
    async (err: any, robot: any) => {
      if (err) return res.status(502).json({ message: `DB error` });

      if (!robot)
        return res.status(400).json({
          message: `Could not find robot ${req.body.original.name} to edit`,
        });

      try {
        const oldRobot = req.body.original;
        const newRobot = req.body.new;

        if (newRobot.imageData) {
          const rawImage = await cloudinary.uploader.upload(
            newRobot.imageData,
            {
              upload_preset: "mondofamousrobots",
            }
          );
          newRobot.image = rawImage.url;
        }

        await robot.updateOne({
          name: newRobot.name,
          image: newRobot.image || oldRobot.image,
        });

        const robotSet = await robotModel.find();

        res.status(201).json({
          message: `Successfully changed robot ${newRobot.name}!`,
          robotSet: robotSet.reverse(),
        });
      } catch (err: any) {
        return res.status(500).json({
          message: `Error trying to edit ${req.body.original.name}, ${err.message}`,
        });
      }
    }
  );
});

export default router;
