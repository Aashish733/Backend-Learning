import mongoose, {Schema} from "mongoose"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true
    },
    coverImage: {
      type: String,
    },
    watchHistory:[
      {
        types: Schema.Types.ObjectId,
        ref: "Video"
      }
    ],
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    refreshToken:{
      type: String
    }
  },
  {
    timestamps: true,
  }
);

//becrypt the password besfore saving the user
userSchema.pre("save", async function (next){
  if(!this.isModified("password")) return next()

  this.password = bcrypt.hash(this.password, 20)
  next()
})

//check password when importing User 
userSchema.methods.isPasswordCorrect = async function(password){
  return  await bcrypt.compare(password, this.password)
}

//generate access Token
userSchema.methods.generateAccessToken = function(){
  return  jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

//generate refresh Token
userSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
}

export const User = mongoose.model("User", userSchema)





  