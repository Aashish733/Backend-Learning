import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/YT/user.models.js";
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import { access } from "node:fs";
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshTokens = async(userId)=>{
  // console.log(userId)
  try {
    const user = await User.findById(userId)
    // console.log(user)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    // console.log("accessToken ", accessToken)
    // console.log("refreshToken ", refreshToken)
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false})

    return {accessToken, refreshToken}
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh token")
  }
} 

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

const loginUser = asyncHandler(async(req, res)=> {
  //req body = data
  const {username, email, password} = req.body;
  // console.log(email)

  if(!username && !email){
    throw new ApiError(400, "username or email is required")
  }

  //username or email
  //find the user
  const user  = await User.findOne({
    $or:[{username}, {email}]
  })

  if(!user) {
    throw new ApiError(404, "User does not exist")
  }
  // password check
  // console.log(user)

  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(403, "Invalid credential")
  }
  // access and refresh token
  const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
  //send cookie

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken, refreshToken
      },
      "User logged In Successfully"
    )
  )
})

const logoutUser = asyncHandler(async(req, res)=> {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options={
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=> {
  const incomingRefreshToken = res.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized access")
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id)
  
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
  
    if(incomingRefreshToken !== user.refreshToken){
      throw new ApiError(401, "Refresh token expired or used")
    }
  
    const options={
      httpOnly: true,
      secure: true
    }
  
    const {accessToken, refreshToken} = generateAccessAndRefreshTokens(user._id)
  
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new ApiResponse(
          200, {accessToken, refreshToken},
          "Access token refreshed"
         )
      )
  } catch (error) {
    throw new ApiError(401, error?.message ||"Invalid refresh token")
  }

})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
  const {oldPassword, newPassword} = req.body
  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(401, "Invalid old password")
  }
  user.password = password
  await user.save()

  return res.status(200).json(
    new ApiResponse(200, {}, "Password change successfully")
  )

})

const getCurrentUser = asyncHandler(async(req, res)=> {
  return res.status(200).json(200, req.user,"User fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req, res)=> {
  const{username, fullName} = req.body
  const user  = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      username,
      fullName: fullName
    }
  },
    {new: true}
  ).select("-password")

  return res.status(200).json(
    new ApiResponse(200, user, "Account details updated")
  )
})

const updateUserAvatar = asyncHandler(async(req, res)=> {
  const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(403, "Avatar file is missing")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar?.url){
    throw new ApiError(403, "Error while uploading Avatar");
  }

  await User.findByIdAndUpdate(req.user?._id,{
    $set: {
      avatar: avatar.url
    }
  },{new : true}).select("-password")
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(403, "Cover Image file is missing");
  }
  const coverImage = await uploadOnCloudinary(avatarLocalPath);

  if (!coverImage?.url) {
    throw new ApiError(403, "Error while uploading cover image");
  }

  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      },
    },
    { new: true }
  ).select("-password");
});

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
};