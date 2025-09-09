import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber:{
        type: mongoose.Schema.Types.ObjectId, // one who is subscribing
        ref: "User"
    },
    channel:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User" // one to whom 'subscriber' is subscribing
    }
},{ timestamps: true })

export default mongoose.model("Subscription", subscriptionSchema)