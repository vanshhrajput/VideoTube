import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

// Toggle like on a video
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const userId = req.user._id

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID")
  }

  // Check if already liked
  const existingLike = await Like.findOne({ video: videoId, likedBy: userId })

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id)
    return res.status(200).json(new ApiResponse("Unliked video", true))
  }

  await Like.create({
    id: `${videoId}_${userId}`,
    video: videoId,
    likedBy: userId
  })

  return res.status(201).json(new ApiResponse("Liked video", true))
})

// Toggle like on a comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  const userId = req.user._id

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID")
  }

  const existingLike = await Like.findOne({ comment: commentId, likedBy: userId })

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id)
    return res.status(200).json(new ApiResponse("Unliked comment", true))
  }

  await Like.create({
    id: `${commentId}_${userId}`,
    comment: commentId,
    likedBy: userId
  })

  return res.status(201).json(new ApiResponse("Liked comment", true))
})



// Get all videos liked by the current user
const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const likedVideos = await Like.find({ likedBy: userId, video: { $ne: null } })
    .populate("video")
    .sort({ createdAt: -1 })

  res.status(200).json(new ApiResponse("Liked videos fetched", true, likedVideos))
})

export {
  toggleCommentLike,
  toggleVideoLike,
  getLikedVideos
}
