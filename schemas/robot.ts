import mongoose from 'mongoose';

export interface Robot {
    name: String,
    image: String,
    votes: Number,
}

const robotSchema = new mongoose.Schema<Robot>({
    name: String,
    image: String,
    votes: Number,
})

export const robotModel = mongoose.model('Robot', robotSchema);
