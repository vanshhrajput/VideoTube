import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// Toggle Subscription (Subscribe / Unsubscribe)
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params
  const subscriberId = req.user._id

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID")
  }

  if (channelId === String(subscriberId)) {
    throw new ApiError(400, "You cannot subscribe to your own channel")
  }

  const existing = await Subscription.findOne({
    channel: channelId,
    subscriber: subscriberId
  })

  if (existing) {
    await Subscription.findByIdAndDelete(existing._id)
    return res
      .status(200)
      .json(new ApiResponse("Unsubscribed successfully", true))
  }

  await Subscription.create({
    channel: channelId,
    subscriber: subscriberId
  })

  return res
    .status(201)
    .json(new ApiResponse("Subscribed successfully", true))
})

//Get subscribers of a specific channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID")
  }

  const subscribers = await Subscription.find({ channel: channelId })
    .populate("subscriber", "username email avatar")
    .sort({ createdAt: -1 })

  res
    .status(200)
    .json(new ApiResponse("Subscribers fetched successfully", true, subscribers))
})

// Get all channels a user is subscribed to
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID")
  }

  const subscriptions = await Subscription.find({ subscriber: subscriberId })
    .populate("channel", "username email avatar")
    .sort({ createdAt: -1 })

  res
    .status(200)
    .json(new ApiResponse("Subscribed channels fetched successfully", true, subscriptions))
})

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels
}
