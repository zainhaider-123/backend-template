import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
    {
        video:{
            type:String,
            required:true,
        },
        title:{
            type:String,
            required:true,
        },
        description:{
            type:String,
            required:true,
        },
        thumbnail:{
            type:String,
            required:true,
        },
        durations:{
            type:Number,
            required:true,
        },
        views:{
            type:Number,
            default:0,
        },
        isPublished:{
            type:Boolean,
            default:false,
        },
        owner:{
            type:Schema.types.ObjectId,
            ref:"User",
        },
    },{timestamps:true}
)

videoSchema.plugin(mongooseAggregatePaginate)

export default mongoose.model("Video",videoSchema)