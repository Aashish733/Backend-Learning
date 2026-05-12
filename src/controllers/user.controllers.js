import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/YT/user.models.js";
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser  = asyncHandler(async(req, res)=> {

  const {username, fullName, email, password } = req.body;
  if (!username || !fullName || !email || !password) {
    throw new ApiError(400, "Please enter all required fields");
  }

  const exitedUser =await User.findOne({
    $or: [{username}, {email}]
  })

  if(exitedUser){
    throw new ApiError(409, "User with email or username already exists")
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if(!avatarLocalPath){
    throw new ApiError(403, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new ApiError(403, "Avatar file is required");
  }

 console.log("Creating user...");

 const user = await User.create({
   username: username.toLowerCase(),
   fullName,
   email,
   avatar: avatar.url,
   coverImage: coverImage?.url || "",
   password,
 });

 console.log("User created");

  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  )

})

export {registerUser}