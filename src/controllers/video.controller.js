import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { v2 as cloudinary } from "cloudinary"

// Helper to extract Cloudinary public ID
const extractPublicId = (url) => {
    const parts = url?.split("/")
    const filename = parts?.[parts.length - 1]
    return filename?.split(".")[0]
}

// GET all videos
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query

    const matchStage = {}
    if (query) matchStage.title = { $regex: query, $options: "i" }
    if (userId && isValidObjectId(userId)) matchStage.owner = new mongoose.Types.ObjectId(userId)

    const sort = { [sortBy]: sortType === "asc" ? 1 : -1 }

    const aggregate = Video.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },
        { $sort: sort }
    ])

    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    }

    const result = await Video.aggregatePaginate(aggregate, options)
    res.json(new ApiResponse(true, result))
})

// POST publish a video
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    const videoFile = req.files?.videoFile?.[0]?.path
    const thumbnailFile = req.files?.thumbnail?.[0]?.path

    if (!videoFile || !thumbnailFile) {
        throw new ApiError(400, "Both videoFile and thumbnail are required.")
    }

    const videoUpload = await uploadOnCloudinary(videoFile, { resource_type: "video" })
    const thumbnailUpload = await uploadOnCloudinary(thumbnailFile)

    const video = await Video.create({
        title,
        description,
        videoFile: videoUpload.secure_url,
        thumbnail: thumbnailUpload.secure_url,
        duration: videoUpload.duration,
        owner: req.user._id,
    })

    res.status(201).json(new ApiResponse(true, video))
})

// GET single video by ID
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID")

    const video = await Video.findById(videoId).populate("owner", "name email")
    if (!video) throw new ApiError(404, "Video not found")

    res.json(new ApiResponse(true, video))
})

// PATCH update video details
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID")

    const video = await Video.findById(videoId)
    if (!video) throw new ApiError(404, "Video not found")
    if (!video.owner.equals(req.user._id)) throw new ApiError(403, "Unauthorized")

    const { title, description } = req.body
    if (title) video.title = title
    if (description) video.description = description

    // If thumbnail is updated
    if (req.file) {
        const oldThumbId = extractPublicId(video.thumbnail)
        await cloudinary.uploader.destroy(oldThumbId)

        const newThumb = await uploadOnCloudinary(req.file.path)
        video.thumbnail = newThumb.secure_url
    }

    await video.save()
    res.json(new ApiResponse(true, video))
})

// DELETE a video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID")

    const video = await Video.findById(videoId)
    if (!video) throw new ApiError(404, "Video not found")
    if (!video.owner.equals(req.user._id)) throw new ApiError(403, "Unauthorized")

    // Delete from cloudinary
    const videoPublicId = extractPublicId(video.videoFile)
    const thumbPublicId = extractPublicId(video.thumbnail)

    await cloudinary.uploader.destroy(videoPublicId, { resource_type: "video" })
    await cloudinary.uploader.destroy(thumbPublicId)

    await video.deleteOne()

    res.json(new ApiResponse(true, "Video deleted successfully."))
})

// PATCH toggle publish/unpublish
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID")

    const video = await Video.findById(videoId)
    if (!video) throw new ApiError(404, "Video not found")
    if (!video.owner.equals(req.user._id)) throw new ApiError(403, "Unauthorized")

    video.isPublished = !video.isPublished
    await video.save()

    res.json(new ApiResponse(true, { isPublished: video.isPublished }))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
