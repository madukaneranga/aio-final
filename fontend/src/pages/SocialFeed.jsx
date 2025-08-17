import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  User,
  ShoppingBag,
  Plus,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  X,
  Send,
  MoreHorizontal,
  Eye,
  Bookmark,
  UserPlus,
  RotateCcw,
} from "lucide-react";

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

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
        `${API_BASE_URL}/api/posts/${targetPostId}/comments?page=${pageNum}&limit=20`,
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
        `${API_BASE_URL}/api/posts/comments/${commentId}/replies?page=1&limit=10`,
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

      const response = await fetch(`${API_BASE_URL}/api/posts/${currentPostId}/comment`, {
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
      const response = await fetch(`${API_BASE_URL}/api/posts/comments/${commentId}/like`, {
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

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const CommentItem = ({ comment, isReply = false, parentId = null }) => (
    <div className={`flex gap-3 ${isReply ? "ml-8 mt-3" : "mb-4"}`}>
      <img
        src={comment.userId?.profilePicture || ""}
        alt={comment.userId?.username}
        className="w-8 h-8 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl px-4 py-3 border border-gray-800/50">
          <div className="font-semibold text-sm text-white">
            {comment.userId?.username}
          </div>
          <div className="text-sm text-gray-200 mt-1 break-words">
            {comment.text}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 px-2">
          <span className="text-xs text-gray-400">{formatTimeAgo(comment.createdAt)}</span>
          
          <button
            onClick={() => likeComment(comment._id, isReply, parentId)}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              comment.isLiked ? "text-red-400" : "text-gray-400 hover:text-white"
            }`}
          >
            <Heart className={`w-3 h-3 ${comment.isLiked ? "fill-current" : ""}`} />
            {(comment.likes || 0) > 0 && comment.likes}
          </button>

          {!isReply && (
            <button
              onClick={() => {
                setReplyingTo(comment._id);
                textareaRef.current?.focus();
              }}
              className="text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Reply
            </button>
          )}
        </div>

        {/* Replies */}
        {!isReply && (comment.replyCount || 0) > 0 && (
          <div className="mt-3 pl-2">
            {!showReplies[comment._id] ? (
              <button
                onClick={() => loadReplies(comment._id)}
                disabled={comment.repliesLoading}
                className="text-xs font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
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
                      className="text-xs font-medium text-gray-400 hover:text-white transition-colors mt-2"
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

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-70 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-[30%] min-w-[400px] bg-black/95 backdrop-blur-xl border-l border-gray-800/50 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
          <h3 className="text-lg font-semibold text-white">
            Comments ({commentCount})
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && comments.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
              <h4 className="text-lg font-semibold text-white mb-2">
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
        <div className="border-t border-gray-800/50 p-4">
          {replyingTo && (
            <div className="mb-3 p-3 bg-gray-900/50 rounded-xl flex items-center justify-between">
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

          <div className="flex gap-3 items-end">
            <img
              src=""
              alt="Your profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  replyingTo ? "Write a reply..." : "Add a comment..."
                }
                className="w-full px-4 py-3 bg-gray-900/50 backdrop-blur-xl border border-gray-700 rounded-2xl resize-none focus:ring-2 focus:ring-white/20 focus:border-transparent text-sm text-white placeholder-gray-400"
                rows={2}
                maxLength={2200}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-gray-500">
                  {newComment.length}/2200
                </span>
                <button
                  onClick={submitComment}
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full hover:bg-gray-200 transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {replyingTo ? "Reply" : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Main SocialFeed Component
const SocialFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [mediaLoadingStates, setMediaLoadingStates] = useState({});
  const [mediaErrors, setMediaErrors] = useState({});
  const [showProducts, setShowProducts] = useState({});
  const [isPlaying, setIsPlaying] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState({});

  const videoRefs = useRef({});
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    loadPosts();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/posts/feed?page=${page}&limit=10`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();

      if (page === 1) {
        setPosts(data.posts || []);
      } else {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      }

      setHasMore(data.pagination?.hasMore || false);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load posts:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  const trackView = async (postId) => {
    try {
      await fetch(`${API_BASE_URL}/api/posts/${postId}/view`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Failed to track view:", error);
    }
  };

  const handleLike = async (postId) => {
    try {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes - 1 : post.likes + 1,
              }
            : post
        )
      );

      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to like post");
      }

      const data = await response.json();

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? { ...post, isLiked: data.liked } : post
        )
      );
    } catch (error) {
      console.error("Failed to like post:", error);
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes + 1 : post.likes - 1,
              }
            : post
        )
      );
    }
  };

  const handleShare = async (post) => {
    try {
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p._id === post._id ? { ...p, shares: p.shares + 1 } : p
        )
      );

      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.description,
          url: `${window.location.origin}/post/${post._id}`,
        });
      } else {
        await navigator.clipboard.writeText(
          `${window.location.origin}/post/${post._id}`
        );
      }
    } catch (error) {
      console.error("Failed to share post:", error);
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p._id === post._id ? { ...p, shares: p.shares - 1 } : p
        )
      );
    }
  };

  const toggleMute = (postId) => {
    const video = videoRefs.current[postId];
    if (video) {
      video.muted = !video.muted;
    }
  };

  const togglePlayPause = (postId) => {
    const video = videoRefs.current[postId];
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(prev => ({ ...prev, [postId]: true }));
      } else {
        video.pause();
        setIsPlaying(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleCommentClick = (postId) => {
    setSelectedPostId(postId);
    setShowComments(true);
  };

  const handleCommentAdded = () => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === selectedPostId ? { ...post, comments: post.comments + 1 } : post
      )
    );
  };

  const handleImageSwipe = (postId, direction) => {
    const post = posts.find(p => p._id === postId);
    if (!post || post.mediaUrls.length <= 1) return;

    setCurrentImageIndex(prev => {
      const currentIndex = prev[postId] || 0;
      const maxIndex = post.mediaUrls.length - 1;
      
      if (direction === "next" && currentIndex < maxIndex) {
        return { ...prev, [postId]: currentIndex + 1 };
      } else if (direction === "prev" && currentIndex > 0) {
        return { ...prev, [postId]: currentIndex - 1 };
      }
      return prev;
    });
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const handleProductClick = (product) => {
    window.open(`/product/${product._id}`, "_blank");
  };

  const handleMediaLoad = (postId) => {
    setMediaLoadingStates((prev) => ({ ...prev, [postId]: false }));
    setMediaErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[postId];
      return newErrors;
    });
  };

  const handleMediaError = (postId) => {
    setMediaLoadingStates((prev) => ({ ...prev, [postId]: false }));
    setMediaErrors((prev) => ({ ...prev, [postId]: true }));
  };

  const handleMediaLoadStart = (postId) => {
    setMediaLoadingStates((prev) => ({ ...prev, [postId]: true }));
  };

  const retryMedia = (postId) => {
    setMediaErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[postId];
      return newErrors;
    });
    setMediaLoadingStates((prev) => ({ ...prev, [postId]: true }));

    const video = videoRefs.current[postId];
    if (video) {
      video.load();
    }
  };

  const loadMorePosts = async () => {
    if (loading || !hasMore) return;

    try {
      const nextPage = page + 1;
      const response = await fetch(
        `${API_BASE_URL}/api/posts/feed?page=${nextPage}&limit=10`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPosts((prev) => [...prev, ...(data.posts || [])]);
        setHasMore(data.pagination?.hasMore || false);
        setPage(nextPage);
      }
    } catch (error) {
      console.error("Failed to load more posts:", error);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-400 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white font-bold text-lg tracking-wider">
                AIO
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Loading your feed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="text-6xl mb-6 text-gray-600">⚠️</div>
        <h3 className="text-xl font-semibold mb-4">Something went wrong</h3>
        <p className="text-gray-400 mb-8 text-center max-w-md">{error}</p>
        <button
          onClick={() => {
            setPage(1);
            loadPosts();
          }}
          className="bg-white text-black px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="text-8xl mb-8 text-gray-600">📱</div>
        <h3 className="text-2xl font-semibold mb-4">No posts yet</h3>
        <p className="text-gray-400 mb-8 text-center max-w-md">
          Be the first to share something amazing on AIO!
        </p>
        <button
          onClick={() => (window.location.href = "/create-post")}
          className="bg-white text-black px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Create Post
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <nav className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-white tracking-wider">AIO</h1>
            <div className="hidden md:flex space-x-6">
              <button className="text-sm font-medium text-white">Following</button>
              <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">For You</button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <User className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </nav>

      {/* Feed */}
      <div className="max-w-lg mx-auto pb-20">
        {posts.map((post) => (
          <div key={post._id} className="bg-black border-b border-gray-800/30 mb-6">
            {/* Post Header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={post.user?.profilePicture || ""}
                  alt={post.user?.username}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-700"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-white text-sm">{post.user?.username}</h3>
                    <span className="text-gray-500 text-xs">•</span>
                    <span className="text-gray-500 text-xs">{formatTimeAgo(post.createdAt)}</span>
                  </div>
                  {post.views && (
                    <p className="text-xs text-gray-400 flex items-center mt-0.5">
                      <Eye className="w-2.5 h-2.5 mr-1" />
                      {formatNumber(post.views)} views
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <UserPlus className="w-4 h-4 text-white" />
                </button>
                <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Post Content - Caption above media like Instagram */}
            {(post.title || post.description || (post.hashtags && post.hashtags.length > 0)) && (
              <div className="px-4 pb-3">
                {post.title && (
                  <h2 className="text-sm font-medium text-white mb-1">{post.title}</h2>
                )}
                {post.description && (
                  <p className="text-sm text-white mb-2">{post.description}</p>
                )}
                
                {/* Hashtags */}
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.hashtags.map((tag, index) => (
                      <span key={index} className="text-blue-400 text-sm">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Media */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              {/* Media Loading Overlay */}
              {(mediaLoadingStates[post._id] ||
                mediaErrors[post._id]) && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-20">
                  {mediaErrors[post._id] ? (
                    <div className="text-center">
                      <div className="text-gray-400 text-4xl mb-4">⚠️</div>
                      <p className="text-gray-400 text-sm mb-4">
                        Failed to load media
                      </p>
                      <button
                        onClick={() => retryMedia(post._id)}
                        className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors mx-auto"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
                      <p className="text-gray-400 text-sm">Loading...</p>
                    </div>
                  )}
                </div>
              )}

              {post.mediaType === "video" ? (
                <div className="relative w-full">
                  <video
                    ref={(el) => { if (el) videoRefs.current[post._id] = el; }}
                    src={post.mediaUrls[0]}
                    className="w-full h-auto max-h-[70vh] object-contain bg-black"
                    loop
                    muted
                    playsInline
                    onLoadStart={() => handleMediaLoadStart(post._id)}
                    onLoadedData={() => handleMediaLoad(post._id)}
                    onError={() => handleMediaError(post._id)}
                    onCanPlay={() => handleMediaLoad(post._id)}
                  />
                  
                  {/* Video Controls */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => togglePlayPause(post._id)}
                      className="bg-black/50 backdrop-blur-sm rounded-full p-4 hover:bg-black/70 transition-colors"
                    >
                      {isPlaying[post._id] ? 
                        <Pause className="w-8 h-8 text-white" /> : 
                        <Play className="w-8 h-8 text-white ml-1" />
                      }
                    </button>
                  </div>

                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => toggleMute(post._id)}
                      className="bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-colors"
                    >
                      {videoRefs.current[post._id]?.muted !== false ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>
              ) : post.mediaUrls?.length === 1 ? (
                // Single Image - Instagram style
                <div className="relative w-full">
                  <img
                    src={post.mediaUrls[0]}
                    alt={post.title}
                    className="w-full h-auto max-h-[70vh] object-contain bg-black"
                    onLoad={() => handleMediaLoad(post._id)}
                    onError={() => handleMediaError(post._id)}
                  />
                </div>
              ) : (
                // Multiple Images - Carousel
                <div className="relative w-full">
                  <div className="w-full overflow-hidden bg-black">
                    <div 
                      className="flex transition-transform duration-300"
                      style={{ 
                        transform: `translateX(-${(currentImageIndex[post._id] || 0) * 100}%)`,
                      }}
                    >
                      {post.mediaUrls?.map((url, index) => (
                        <div key={index} className="w-full flex-shrink-0">
                          <img
                            src={url}
                            alt={`${post.title} - ${index + 1}`}
                            className="w-full h-auto max-h-[70vh] object-contain bg-black"
                            onLoad={() => handleMediaLoad(post._id)}
                            onError={() => handleMediaError(post._id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Image Navigation */}
                  {post.mediaUrls?.length > 1 && (
                    <>
                      {(currentImageIndex[post._id] || 0) > 0 && (
                        <button
                          onClick={() => handleImageSwipe(post._id, "prev")}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black/60 backdrop-blur-sm rounded-full p-2 hover:bg-black/80 transition-colors z-10"
                        >
                          <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                      )}
                      
                      {(currentImageIndex[post._id] || 0) < post.mediaUrls.length - 1 && (
                        <button
                          onClick={() => handleImageSwipe(post._id, "next")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black/60 backdrop-blur-sm rounded-full p-2 hover:bg-black/80 transition-colors z-10"
                        >
                          <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                      )}

                      {/* Dots Indicator */}
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1.5 z-10">
                        {post.mediaUrls.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(prev => ({ ...prev, [post._id]: index }))}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              index === (currentImageIndex[post._id] || 0)
                                ? "bg-white"
                                : "bg-white/50"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Image Counter */}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                        <span className="text-white text-xs font-medium">
                          {(currentImageIndex[post._id] || 0) + 1}/{post.mediaUrls.length}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleLike(post._id)}
                    className="group"
                  >
                    <Heart
                      className={`w-6 h-6 transition-all group-hover:scale-110 group-active:scale-95 ${
                        post.isLiked
                          ? "text-red-500 fill-red-500"
                          : "text-white group-hover:text-red-400"
                      }`}
                    />
                  </button>
                  
                  <button
                    onClick={() => handleCommentClick(post._id)}
                    className="group"
                  >
                    <MessageCircle className="w-6 h-6 text-white group-hover:scale-110 group-active:scale-95 transition-transform" />
                  </button>
                  
                  <button 
                    onClick={() => handleShare(post)}
                    className="group"
                  >
                    <Share2 className="w-6 h-6 text-white group-hover:scale-110 group-active:scale-95 transition-transform" />
                  </button>
                </div>
                
                <button className="group">
                  <Bookmark className="w-6 h-6 text-white group-hover:scale-110 group-active:scale-95 transition-transform" />
                </button>
              </div>

              {/* Engagement Stats */}
              <div className="space-y-1">
                {(post.likes && post.likes > 0) && (
                  <p className="text-white font-semibold text-sm">
                    {formatNumber(post.likes)} {post.likes === 1 ? 'like' : 'likes'}
                  </p>
                )}
                
                {(post.comments && post.comments > 0) && (
                  <button 
                    onClick={() => handleCommentClick(post._id)}
                    className="text-gray-400 text-sm hover:text-white transition-colors block"
                  >
                    View all {formatNumber(post.comments)} comments
                  </button>
                )}
              </div>

              {/* Tagged Products */}
              {post.taggedProducts && post.taggedProducts.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowProducts(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                    className="flex items-center space-x-2 bg-gray-900/30 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-gray-800/30 transition-colors border border-gray-700/30"
                  >
                    <ShoppingBag className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-medium">
                      {post.taggedProducts.length} Product{post.taggedProducts.length > 1 ? 's' : ''}
                    </span>
                  </button>

                  {showProducts[post._id] && (
                    <div className="mt-3 space-y-2">
                      {post.taggedProducts.map((product) => (
                        <button
                          key={product._id}
                          onClick={() => handleProductClick(product)}
                          className="w-full bg-gray-900/30 backdrop-blur-sm rounded-lg p-3 border border-gray-700/30 hover:bg-gray-800/30 transition-colors text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">{product.name}</p>
                              <p className="text-gray-300 font-semibold text-sm">{product.price}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Load More Button */}
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={loadMorePosts}
              disabled={loading}
              className="bg-gray-900/50 backdrop-blur-xl text-white px-6 py-3 rounded-xl hover:bg-gray-800/50 transition-colors border border-gray-700/50 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more posts"}
            </button>
          </div>
        )}
      </div>

      {/* Comment Sidebar */}
      <CommentSidebar
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        postId={selectedPostId}
        commentCount={posts.find(p => p._id === selectedPostId)?.comments || 0}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
};

export default SocialFeed;