import mongoose,{Schema} from "mongoose";

const likeSchema= new Schema({
    id:{
        type:String,
        required:true
    },
    comment:{ 
        type:Schema.Types.ObjectId,
        ref:"comment"

    },
    video:{
        type:Schema.Types.ObjectId,
        ref:"video"

    },
    likedBy:{
        type:Schema.Types.ObjectId,
        ref:"user"

    },
},{
    timestamps:true
})

export const Like =mongoose.model("like",likeSchema)