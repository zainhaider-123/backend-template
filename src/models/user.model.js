import mongoose from "mongoose";
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const userScehma = new mongoose.Schema(
    {        
        fullName:{
            type:String,
            required:true,
        },
        userName:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            index:true,
            trim:true,
        },
        email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true,
        },
        password:{
            type:String,
            required:true,
        },
        avatar:{
            type:String,
            required:true,
        },
        coverImage:{
            type:String,
        },
        watchHistory:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Video",
        },
        refreshToken:{
            type:String,
        }
    },{timestamps:true}
)

userScehma.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10)
    next()
})

userScehma.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userScehma.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id:this._id,
            fullName:this.fullName,
            userName:this.userName,
            email:this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY

        }
    )
}
userScehma.methods.generateRefreshToken = function () {
        return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export default mongoose.model("User",userScehma)