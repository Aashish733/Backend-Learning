import mongoose from "mongoose";
import { timeStamp } from "node:console";

const SubTodoSchema = mongoose.Schema(
  {
    content: {
      type: String,
      required: true
    },
    completed:{
      type: Boolean,
      default: false
    }
  },
   {timeStamps: true}
   
   )


   export const SubTodo = mongoose.model("SubTodo", SubTodoSchema)