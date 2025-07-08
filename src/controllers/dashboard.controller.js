import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

//  Get all stats for the current channel (logged-in user)
const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const totalVideos = await Video.countDocuments({ owner: userId })
  const totalSubscribers = await Subscription.countDocuments({ channel: userId })
  const videoDocs = await Video.find({ owner: userId }, "views")
  const totalViews = videoDocs.reduce((acc, video) => acc + (video.views || 0), 0)
  const totalLikes = await Like.countDocuments({ likeableType: "Video", owner: userId })

  res.status(200).json(
    new ApiResponse("Channel stats fetched successfully", true, {
      totalVideos,
      totalSubscribers,
      totalViews,
      totalLikes
    })
  )
})

//  Get all videos uploaded by the logged-in user
const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const videos = await Video.find({ owner: userId })
    .sort({ createdAt: -1 })
    .populate("owner", "username email")

  res.status(200).json(new ApiResponse("Channel videos fetched successfully", true, videos))
})

export {
  getChannelStats,
  getChannelVideos
}
