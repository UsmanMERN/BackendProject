import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "someThing went wrong while generating refresh and Access token")
    }
}


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
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: undefined } }, { new: true })

    return res.status(200).clearCookie("accessToken").clearCookie("refreshToken").json(new ApiResponse(200, {}, "user logged Out "))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)

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

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "access token refreshed"))
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

    if (!avatar.url) {
        throw new ApiError(400, "Error While uploading avatar!")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { avatar: avatar?.url } }, { new: true }).select("-password")

    res.status(200).json(new ApiResponse(200, { user }, "avatar updated successful"))
})
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

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
export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentUserPassword, getCurrentUser, updateUserDetails, updateUserAvatar, updateUserCoverImage }

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
