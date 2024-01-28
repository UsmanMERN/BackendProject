import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { deleteUploadedImageFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        // console.log("Existing refreshToken:", user.refreshToken);
        user.refreshToken = refreshToken;
        // console.log("New refreshToken:", user.refreshToken);
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};



const registerUser = asyncHandler(async (req, res) => {
    const { fullName, userName, email, password } = req.body
    const fields = ["fullName", "email", "userName", "password"];
    const emptyField = fields.find((field, index) => {
        return ![fullName, email, userName, password][index]?.trim();
    });

    if (emptyField) {
        throw new ApiError(400, `${emptyField} is required!`);
    }

    const existUser = await User.findOne({
        $or: [{ userName }, { email }]
    })
    if (existUser) {
        throw new ApiError(409, "User Already Exist!")
    }
    // console.log(req.files);
    let coverImageLocalPath;
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (req.files && Array.isArray(req.files.coverImage && req.files.coverImage.length > 0)) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Upload avatar file")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    let coverImage;
    if (coverImageLocalPath != null) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
    }
    if (!avatar) {
        throw new ApiError(400, "Upload avatar file")

    }
    const user = await User.create({ fullName, avatar: avatar.url, coverImage: coverImage?.url || "", email, password, userName: userName.toLowerCase() })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500, "Error While Registration Of User")
    }
    return res.status(201).json(new ApiResponse(200, createdUser, "User Registered Successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, userName, password } = req.body;

    if (!email && !userName) {
        throw new ApiError(400, "Please provide userName or password!")
    }

    const user = await User.findOne({
        $or: [{ userName }, { email }]
    })

    if (!user) {
        throw new ApiError(400, "Please Register First!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials!")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const option = { httpOnly: true, secure: true, }
    return res.status(200).cookie("accessToken", accessToken, option).cookie("refreshToken", refreshToken, option).json(new ApiResponse(200, { user: loggedInUser, refreshToken, accessToken }, "user Logged In Successfully"))

})

const logoutUser = asyncHandler(async (req, res) => {
    // req.user._id
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } }, { new: true })

    return res.status(200).clearCookie("accessToken").clearCookie("refreshToken").json(new ApiResponse(200, {}, "user logged Out "))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }
    // console.log(process.env.REFRESH_TOKEN_SECRET);
    // console.log(incomingRefreshToken);
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        console.log(decodedToken);
        const user = await User.findById(decodedToken?._id)

        // console.log(user);
        if (!user) {
            throw new ApiError(401, "Invalid Refresh token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is not expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true,
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, { accessToken, refreshToken: refreshToken }, "access token refreshed"))
    } catch (error) {
        console.error(error);
        throw new ApiError(500, error?.message || "something went wrong")
    }

})

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "current user fetched successfully"))
})

const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { fullName, email: email } }, { new: true }).select("-password")

    res.status(200).json(new ApiResponse(200, user, "Account details are updated"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar not found!")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const oldAvatarImage = req.user?.avatar

    if (oldAvatarImage) {
        deleteUploadedImageFromCloudinary(oldAvatarImage)
    }


    if (!avatar.url) {
        throw new ApiError(400, "Error While uploading avatar!")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { avatar: avatar?.url } }, { new: true }).select("-password")

    res.status(200).json(new ApiResponse(200, { user }, "avatar updated successful"))
})
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    const oldAvatarImage = req.user?.avatar

    if (oldAvatarImage) {
        deleteUploadedImageFromCloudinary(oldAvatarImage)
    }
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar not found!")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error While uploading coverImage!")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { coverImage: coverImage?.url } }, { new: true }).select("-password")

    res.status(200).json(new ApiResponse(200, { user }, "coverImage updated successful"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { userName } = req.params

    if (!userName?.trim()) {
        throw new ApiError(400, "username is missing!")
    }

    // User.find({ userName })

    const channel = await User.aggregate([
        {
            $match: {
                userName: userName?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "channel",
                as: "s"
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscriberToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false

                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscriberToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel doest not exists")
    }

    return res.status(200).json((new ApiResponse(200, channel[0], "user channel is fetched successfully!")))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "Videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $arrayElemAt: ["$owner", 0]
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "user watch History"))
})

export { getUserChannelProfile, registerUser, loginUser, logoutUser, refreshAccessToken, getWatchHistory, changeCurrentUserPassword, getCurrentUser, updateUserDetails, updateUserAvatar, updateUserCoverImage }

// ---> steps to follow to register user

// get user details from frontend
// validation
// check if user already exist
// check for images/
// check for avatar
// upload them to cloudinary
// create user Object - create entry in Db
// remove password and refresh fields from response
// check the user creation
//  return res

// validate all fields
// if ([fullName, email, userName, password].some((field) => {
//     field?.trim() === ""
// })) {
//     throw new ApiError(400, "Full Name is Required!")
// }
