import {AsyncHandlerTwo} from "../utils/asyncHandler.js"
import ApiError from "../utils/apiError.js"
import User from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import ApiResponse from "../utils/apiResponse.js"
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async (user /* user.id */) => {
    try {
        //const user = await User.findById(userId)
        if(!user) throw new ApiError(404, "User not found");
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {
            accessToken,
            refreshToken
        }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

const registerUser = AsyncHandlerTwo(async (req, res) => {
    // 1)
    const {fullName, userName, email, password} = req.body
    // if(!fullName) throw new ApiError(400, "Name is required");
    // if(!userName) throw new ApiError(400, "Username is required");
    // if(!email) throw new ApiError(400, "Email is required");
    // if(!password) throw new ApiError(400, "Password is required");
    if ([fullName, userName, email, password].some((field) => field?.trim() === "")) throw new ApiError(400, "All fields are required")
    const existedUser = await User.findOne({
        $or: [{userName}, {email}]
    })

    // 2)
    if(existedUser) throw new ApiError(400, "User already exist");

    // 3)
    const avatarLocalPath = req.files?.avatar[0]?.path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) coverImageLocalPath = req.files.coverImage[0].path

    // 4)
    if(!avatarLocalPath) throw new ApiError(400, "Avatar is required");

    // 5)
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath): null;
    if(!avatar) throw new ApiError(400, "Avatar upload failed")
    
    // 6)
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email: email.toLowerCase(),
        password,
        userName: userName.toLowerCase()
    })    

    // 7)
    const createdUser = user.toObject();
    delete createdUser.password;
    delete createdUser.refreshToken;
    //const createdUser = await User.findById(user._id).select("-password -refreshToken")
    
    // 8)
    if(!createdUser) throw new ApiError(500, "User creation failed");

    // 9)
    return res.status(201).json(
        new ApiResponse(201, {createdUser}, "User registered successfully")
    )
}
/* 
steps:
1) get user detail
2) validation - not empty
3) check if user already exit
4) check fir images
5) upload to cloudinary
6) create user object - create entry in db
7) remove password and refresh token field from response
8) check for user creation
9) return res
*/
)

const loginUser = AsyncHandlerTwo(async (req, res) =>{
    //1)
    const {emailOrUserName, password} = req.body
    //const {userName, email, password} = req.body

    //2)
    if(!emailOrUserName || !password) throw new ApiError(400, "All fields are required");
    //if(!(userName || email)) throw new ApiError(400, "All fields are required");

    //3)
    const identifier = emailOrUserName.trim().toLowerCase()
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
    const user = await User.findOne( isEmail ? { email: identifier } : { userName: identifier });
    //const user = await User.findOne({ $or: [{userName}, {email}] })

    if(!user) throw new ApiError(404, "User not found");

    //4)
    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if(!isPasswordCorrect) throw new ApiError(401, "Invalid credentials");

    //5)
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user /* user.id */)

    //const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const { password: _, refreshToken: __, ...safeUser } = user.toObject();

    //6)
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 1000 * 60 * 60 * 24 * 7
    }

    //7)
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: safeUser
            },
            "User logged in successfully"
        )
    )
}
/*
1) req body - data
2) username or email
3) find user
4) password check
5) access and refresh token
6) send cookies securely
7) send response and cookie
*/
)

const logoutUser = AsyncHandlerTwo(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,{
            $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )

        const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))



})

const refreshAccessToken = AsyncHandlerTwo(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) throw new ApiError(401, "Refresh token is required")

    try{
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.ACCESS_TOKEN_SECRET
        )

        const user = User.findById(decodedToken?._id)

        if(!user) throw new ApiError(401, "Invalid refresh token")

        if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh token has been expired")

        const options = {
            httpOnly: true,
            secure: true,

        }

        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                200,
                {accessToken: accessToken, refreshToken: newRefreshToken, options: options}
            )
    }
    catch (error) {
        throw new ApiError(401, "Refresh token is invalid")
    }



})

const changeCurrentPassword = AsyncHandlerTwo(async (req, res) => {
    const {oldPassword, newPassword} = req.body
    //const {oldPassword, newPassword, confirmPassword} = req.body
    //if(newPassword !== oldPassword) throw new ApiError(401, "Passwords do not match")


    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) throw new ApiError(400, "Invalid password");

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res
        .status(201)
        .json(
            new ApiResponse(200, {}, "Password changed successfully")
        )
})

const getCurrentUser = AsyncHandlerTwo(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = AsyncHandlerTwo(async (req, res) => {
    const {fullName, email} = req.body

    if(!(fullName || email)) throw new ApiError(401, "All fields are required")

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email,
            }
        },
        {new: true}
        ).select("-password")

        return res
            .status(200)
            .json(
                new ApiResponse(200, user, "Account details updated successfully")
            )



})

const updateUserAvatar = AsyncHandlerTwo(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath) throw new ApiError(401, "Avatar file is missing");

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar) throw new ApiError(401, "Error while uploading on avatar");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar updated successfully"))
})

const updateUserCoverImage = AsyncHandlerTwo(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath) throw new ApiError(401, "Cover Image is missing");
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage) throw new ApiError(401, "Error while uploading cover image");

    const user = await User?.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            }
        },
        {new: true}

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User cover image successfully"))
})

const getUserChannelProfile = AsyncHandlerTwo(async (req, res) => {
    const {username} = req.params

    if(!username?.trim()) throw new ApiError(401, "Username is missing");

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channelId",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscribers",
                as: "subscribedTo",
            },
        },
        {
            $addToSet: {
                subscribersCount:{
                    $size:"subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])


})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
}
