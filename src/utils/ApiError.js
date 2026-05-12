class ApiError extends Error {
  constructor(
    statusCode,
    message= "ApiError went wrong",
    errors= [],
    stack=''
  ){

    //override constructor
    super(message)
    this.statusCode = statusCode
    this.data= null
    this.message = message
    this.success = false
    this.errors = errors

    if(statck){
      this.stack = stack
    } else{
      Error.captureStackTrace(this, this.constructor)
    }

  }
}

export {ApiError


}