import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username:{
      type: String,
      unique: true,
      lowercase: true,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true,
      minLength: 5["Password must be atleast 5 characters"],
      maxLength: 10["Password must be less than 10 charaters"]
    }
  }, 


  {timestamps: true}
  
)

export const  User = mongoose.model("User", UserSchema)