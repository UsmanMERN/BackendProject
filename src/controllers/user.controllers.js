import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, userName, email, password } = req.body
    const fields = ["fullName", "email", "userName", "password"];
    const emptyField = fields.find((field, index) => {
        return ![fullName, email, userName, password][index]?.trim();
    });

    if (emptyField) {
        throw new ApiError(400, `${emptyField} is required!`);
    }

    const existUser = User.findOne({
        $or: [{ userName }, { email }]
    })
    if (existUser) {
        throw new ApiError(409, "User Already Exist!")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowercase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500, "Error While Registration Of User")
    }
    return res.status(201).json(new ApiResponse(200, createdUser, "User Registered Successfully"))
})

export { registerUser }

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
