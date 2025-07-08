import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

//  Get paginated comments for a specific video
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const { page = 1, limit = 10 } = req.query

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID")
  }

  const aggregate = Comment.aggregate([
    { $match: { video: new mongoose.Types.ObjectId(videoId) } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner"
      }
    },
    { $unwind: "$owner" },
    { $sort: { createdAt: -1 } }
  ])

  const options = {
    page: Number(page),
    limit: Number(limit)
  }

  const comments = await Comment.aggregatePaginate(aggregate, options)

  return res.status(200).json(
    new ApiResponse("Comments fetched successfully", true, comments)
  )
})

// Add a comment to a video
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const { content } = req.body
  const userId = req.user._id

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID")
  }

  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content is required")
  }

  const newComment = await Comment.create({
    content,
    video: videoId,
    owner: userId
  })

  return res.status(201).json(
    new ApiResponse("Comment added successfully", true, newComment)
  )
})

//Update a comment (only by the owner)
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  const { content } = req.body
  const userId = req.user._id

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID")
  }

  const comment = await Comment.findById(commentId)
  if (!comment) {
    throw new ApiError(404, "Comment not found")
  }

  if (!comment.owner.equals(userId)) {
    throw new ApiError(403, "You are not allowed to update this comment")
  }

  comment.content = content
  await comment.save()

  return res.status(200).json(
    new ApiResponse("Comment updated successfully", true, comment)
  )
})

//Delete a comment (only by the owner)
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  const userId = req.user._id

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID")
  }

  const comment = await Comment.findById(commentId)
  if (!comment) {
    throw new ApiError(404, "Comment not found")
  }

  if (!comment.owner.equals(userId)) {
    throw new ApiError(403, "You are not allowed to delete this comment")
  }

  await comment.deleteOne()

  return res.status(200).json(
    new ApiResponse("Comment deleted successfully", true)
  )
})

export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
}
