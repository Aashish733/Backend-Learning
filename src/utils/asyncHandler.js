export const asyncHandler = (fn)=> async(req, res, next)=>{
  try {
    await fn(req, res, next)
    return fn
  } catch (error) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}