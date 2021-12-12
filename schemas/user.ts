import mongoose from "mongoose";

export interface User {
  name: string;
  email: string;
  password: string;
  votedForIDs: string[];
  isAdmin: boolean;
}

const user = new mongoose.Schema<User>({
  name: String,
  email: String,
  password: String,
  votedForIDs: Array, //robots the user has voted for already
  isAdmin: Boolean,
});

export const userModel = mongoose.model("User", user);
