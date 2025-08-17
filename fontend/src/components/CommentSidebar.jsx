import React, { useState, useEffect, useRef } from "react";
import { X, Send, MoreHorizontal } from "lucide-react";

// CommentSidebar Component
const CommentSidebar = ({
  isOpen,
  onClose,
  postId,
  commentCount,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(null);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  // Emoji reactions
  const reactions = [
    { type: "like", emoji: "👍" },
    { type: "love", emoji: "❤️" },
    { type: "laugh", emoji: "😂" },
    { type: "wow", emoji: "😮" },
    { type: "sad", emoji: "😢" },
    { type: "angry", emoji: "😠" },
  ];

  // Reset state when postId changes
  useEffect(() => {
    if (postId !== currentPostId && postId) {
      console.log("Post changed from", currentPostId, "to", postId);
      setComments([]);
      setPage(1);
      setHasMore(true);
      setError(null);
      setNewComment("");
      setReplyingTo(null);
      setShowReplies({});
      setCommentsLoaded(false);
      setCurrentPostId(postId);

      // Load comments immediately if sidebar is open
      if (isOpen) {
        loadComments(1, postId);
      }
    }
  }, [postId, currentPostId, isOpen]);

  // Load comments when sidebar opens for the first time with this post
  useEffect(() => {
    if (
      isOpen &&
      postId &&
      postId === currentPostId &&
      !commentsLoaded &&
      !loading
    ) {
      loadComments(1, postId);
    }
  }, [isOpen, postId, currentPostId, commentsLoaded, loading]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadComments = async (pageNum = 1, targetPostId = postId) => {
    if (!targetPostId) return;

    try {
      setLoading(true);
      setError(null);

      console.log("Loading comments for post:", targetPostId, "page:", pageNum);

      const response = await fetch(
        `/api/posts/${targetPostId}/comments?page=${pageNum}&limit=20`,
        {
          headers: getAuthHeaders(),
        }
      );

      console.log("Comments response status:", response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Comments API error:", response.status, errorData);
        throw new Error(`Failed to load comments (${response.status})`);
      }

      const data = await response.json();
      console.log("Comments data:", data);

      // Process comments
      const processedComments = (data.comments || []).map(comment => {
        return {
          ...comment,
          replyCount: comment.replyCount || 0,
          replies: [], // Start with empty replies array
          repliesLoaded: false // Mark as not loaded initially
        };
      });

      // Only update state if this is still the current post
      if (targetPostId === currentPostId || targetPostId === postId) {
        if (pageNum === 1) {
          setComments(processedComments);
          setCommentsLoaded(true);
        } else {
          setComments((prev) => [...prev, ...processedComments]);
        }

        setHasMore(data.pagination?.hasMore || false);
        setPage(pageNum);
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to load comments:", error);
      if (targetPostId === currentPostId || targetPostId === postId) {
        setError(error.message);
      }
      setLoading(false);
    }
  };

  const loadReplies = async (commentId) => {
    try {
      console.log("=== LOADING REPLIES DEBUG ===");
      console.log("Comment ID:", commentId);
      console.log("Current Post ID:", currentPostId);

      // Set loading state for this specific comment
      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId
            ? { ...comment, repliesLoading: true, repliesError: false }
            : comment
        )
      );

      const response = await fetch(
        `/api/posts/comments/${commentId}/replies?page=1&limit=10`,
        {
          headers: getAuthHeaders(),
        }
      );
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Failed to load replies. Status: ${response.status}, Error: ${errorText}`);
        throw new Error(`Failed to load replies (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log("Raw API Response:", data);

      const replies = data.replies || [];
      console.log("Processed replies:", replies);
      console.log("Number of replies found:", replies.length);

      // Update the comment with replies
      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId
            ? { 
                ...comment, 
                replies: replies, 
                repliesLoaded: true,
                repliesLoading: false,
                repliesError: false,
                replyCount: replies.length > 0 ? replies.length : comment.replyCount,
              }
            : comment
        )
      );

      setShowReplies((prev) => ({ ...prev, [commentId]: true }));
      
      console.log("=== REPLIES LOADED SUCCESSFULLY ===");
      
    } catch (error) {
      console.error("=== FAILED TO LOAD REPLIES ===");
      console.error("Error details:", error);
      
      // Show error state in UI
      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId
            ? { 
                ...comment, 
                repliesError: true,
                repliesLoaded: true,
                repliesLoading: false,
                errorMessage: error.message
              }
            : comment
        )
      );
      setShowReplies((prev) => ({ ...prev, [commentId]: true }));
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || submitting || !currentPostId) return;

    try {
      setSubmitting(true);

      console.log("Submitting comment:", {
        postId: currentPostId,
        text: newComment,
        parentComment: replyingTo,
      });

      const response = await fetch(`/api/posts/${currentPostId}/comment`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text: newComment.trim(),
          parentComment: replyingTo,
        }),
      });

      console.log("Comment submit response status:", response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Comment submit error:", response.status, errorData);
        throw new Error("Failed to add comment");
      }

      const data = await response.json();
      console.log("Comment submit success:", data);

      if (replyingTo) {
        // Add reply to existing comment
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === replyingTo
              ? {
                  ...comment,
                  replyCount: (comment.replyCount || 0) + 1,
                  replies: comment.repliesLoaded 
                    ? [data.comment, ...(comment.replies || [])]
                    : [], // Only add to local state if replies are already loaded
                  repliesLoaded: comment.repliesLoaded || false,
                }
              : comment
          )
        );
        
        // Show replies if they were already loaded
        const parentComment = comments.find(c => c._id === replyingTo);
        if (parentComment && parentComment.repliesLoaded) {
          setShowReplies((prev) => ({ ...prev, [replyingTo]: true }));
        }
      } else {
        // Add new top-level comment
        setComments((prev) => [data.comment, ...prev]);
      }

      setNewComment("");
      setReplyingTo(null);
      setSubmitting(false);

      // Callback to update comment count in parent
      if (onCommentAdded) {
        onCommentAdded();
      }

      // Scroll to bottom if new comment
      if (!replyingTo && bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
      setSubmitting(false);
    }
  };

  const likeComment = async (commentId, isReply = false, parentId = null) => {
    try {
      const response = await fetch(`/api/posts/comments/${commentId}/like`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to like comment");
      }

      const data = await response.json();

      if (isReply && parentId) {
        // Update reply like status
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === parentId
              ? {
                  ...comment,
                  replies: comment.replies?.map((reply) =>
                    reply._id === commentId
                      ? {
                          ...reply,
                          isLiked: data.liked,
                          likes: data.liked
                            ? (reply.likes || 0) + 1
                            : Math.max(0, (reply.likes || 0) - 1),
                        }
                      : reply
                  ),
                }
              : comment
          )
        );
      } else {
        // Update comment like status
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === commentId
              ? {
                  ...comment,
                  isLiked: data.liked,
                  likes: data.liked
                    ? (comment.likes || 0) + 1
                    : Math.max(0, (comment.likes || 0) - 1),
                }
              : comment
          )
        );
      }
    } catch (error) {
      console.error("Failed to like comment:", error);
    }
  };

  const addReaction = async (
    commentId,
    reactionType,
    isReply = false,
    parentId = null
  ) => {
    try {
      const response = await fetch(
        `/api/posts/comments/${commentId}/reaction`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ reactionType }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add reaction");
      }

      const data = await response.json();

      if (isReply && parentId) {
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === parentId
              ? {
                  ...comment,
                  replies: comment.replies?.map((reply) =>
                    reply._id === commentId
                      ? { ...reply, userReaction: data.reaction }
                      : reply
                  ),
                }
              : comment
          )
        );
      } else {
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === commentId
              ? { ...comment, userReaction: data.reaction }
              : comment
          )
        );
      }
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const ReactionPicker = ({
    commentId,
    isReply = false,
    parentId = null,
    currentReaction,
  }) => {
    const [showPicker, setShowPicker] = useState(false);

    return (
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          {currentReaction
            ? reactions.find((r) => r.type === currentReaction)?.emoji
            : "😊"}
        </button>

        {showPicker && (
          <div className="absolute bottom-full mb-2 bg-gray-900 border border-gray-700 rounded-lg p-2 flex gap-2 shadow-lg z-50">
            {reactions.map((reaction) => (
              <button
                key={reaction.type}
                onClick={() => {
                  addReaction(commentId, reaction.type, isReply, parentId);
                  setShowPicker(false);
                }}
                className="text-lg hover:scale-125 transition-transform"
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const CommentItem = ({ comment, isReply = false, parentId = null }) => {
    const [showActions, setShowActions] = useState(false);

    return (
      <div className={`flex gap-3 ${isReply ? "ml-8 mt-2" : "mb-4"}`}>
        <img
          src={comment.userId?.profilePicture || ""}
          alt={comment.userId?.username}
          className="w-8 h-8 rounded-full flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="bg-gray-800 rounded-lg px-3 py-2">
            <div className="font-semibold text-sm text-gray-100">
              {comment.userId?.username}
            </div>
            <div className="text-sm text-gray-300 mt-1 break-words">
              {comment.text}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>{formatTimeAgo(comment.createdAt)}</span>

            <button
              onClick={() => likeComment(comment._id, isReply, parentId)}
              className={`font-semibold hover:text-gray-200 transition-colors ${
                comment.isLiked ? "text-red-400" : ""
              }`}
            >
              Like {(comment.likes || 0) > 0 && `(${comment.likes})`}
            </button>

            {!isReply && (
              <button
                onClick={() => {
                  setReplyingTo(comment._id);
                  textareaRef.current?.focus();
                }}
                className="font-semibold hover:text-gray-200 transition-colors"
              >
                Reply
              </button>
            )}

            <ReactionPicker
              commentId={comment._id}
              isReply={isReply}
              parentId={parentId}
              currentReaction={comment.userReaction}
            />

            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>

          {/* Replies */}
          {!isReply && (comment.replyCount || 0) > 0 && (
            <div className="mt-3">
              {!showReplies[comment._id] ? (
                <button
                  onClick={() => loadReplies(comment._id)}
                  disabled={comment.repliesLoading}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
                >
                  {comment.repliesLoading 
                    ? "Loading..." 
                    : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`
                  }
                </button>
              ) : (
                <div>
                  {comment.repliesError ? (
                    <div className="text-center py-2">
                      <p className="text-red-400 text-xs mb-2">
                        Failed to load replies
                        {comment.errorMessage && (
                          <span className="block text-gray-500">({comment.errorMessage})</span>
                        )}
                      </p>
                      <button
                        onClick={() => {
                          // Reset error state and retry
                          setComments((prev) =>
                            prev.map((c) =>
                              c._id === comment._id
                                ? { 
                                    ...c, 
                                    repliesError: false, 
                                    repliesLoaded: false,
                                    repliesLoading: false,
                                    errorMessage: null 
                                  }
                                : c
                            )
                          );
                          setShowReplies((prev) => ({ ...prev, [comment._id]: false }));
                          loadReplies(comment._id);
                        }}
                        className="text-gray-300 hover:text-gray-100 text-xs font-semibold"
                      >
                        Retry
                      </button>
                    </div>
                  ) : comment.replies && comment.replies.length > 0 ? (
                    <div>
                      {comment.replies.map((reply) => (
                        <CommentItem
                          key={reply._id}
                          comment={reply}
                          isReply={true}
                          parentId={comment._id}
                        />
                      ))}
                      <button
                        onClick={() => setShowReplies((prev) => ({ ...prev, [comment._id]: false }))}
                        className="text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors mt-2"
                      >
                        Hide replies
                      </button>
                    </div>
                  ) : comment.repliesLoaded ? (
                    <div className="text-gray-500 text-xs py-2">
                      No replies found
                    </div>
                  ) : (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-70 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-[30%] min-w-[400px] bg-black border-l border-gray-800 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-gray-100">
            Comments ({commentCount})
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && comments.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">
                Failed to load comments: {error}
              </p>
              <button
                onClick={() => loadComments(1)}
                className="text-gray-300 hover:text-gray-100 font-semibold"
              >
                Retry
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💬</div>
              <h4 className="text-lg font-semibold text-gray-100 mb-2">
                No comments yet
              </h4>
              <p className="text-gray-400">Be the first to comment!</p>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <CommentItem key={comment._id} comment={comment} />
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={() => loadComments(page + 1)}
                    disabled={loading}
                    className="text-gray-300 hover:text-gray-100 font-semibold disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Load more comments"}
                  </button>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Comment Input */}
        <div className="border-t border-gray-800 p-4">
          {replyingTo && (
            <div className="mb-3 p-2 bg-gray-800 rounded-lg flex items-center justify-between">
              <span className="text-sm text-gray-300">
                Replying to{" "}
                {comments.find((c) => c._id === replyingTo)?.userId?.username}
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <img
              src=""
              alt="Your profile"
              className="w-8 h-8 rounded-full flex-shrink-0"
            />

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  replyingTo ? "Write a reply..." : "Add a comment..."
                }
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm text-gray-100 placeholder-gray-400"
                rows={2}
                maxLength={2200}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
              />

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {newComment.length}/2200
                </span>

                <button
                  onClick={submitComment}
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-2 bg-gray-100 text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {replyingTo ? "Reply" : "Comment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommentSidebar;