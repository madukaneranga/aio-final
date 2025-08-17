import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, MoreHorizontal, Reply, Trash2 } from 'lucide-react';

const CommentSidebar = ({ isOpen, onClose, postId, commentCount, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(null);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  // Emoji reactions
  const reactions = [
    { type: 'like', emoji: '👍' },
    { type: 'love', emoji: '❤️' },
    { type: 'laugh', emoji: '😂' },
    { type: 'wow', emoji: '😮' },
    { type: 'sad', emoji: '😢' },
    { type: 'angry', emoji: '😠' }
  ];

  // Reset state when postId changes
  useEffect(() => {
    if (postId !== currentPostId) {
      setComments([]);
      setPage(1);
      setHasMore(true);
      setError(null);
      setNewComment('');
      setReplyingTo(null);
      setShowReplies({});
      setCurrentPostId(postId);
      
      if (isOpen && postId) {
        loadComments(1, postId);
      }
    }
  }, [postId, isOpen]);

  // Load comments when sidebar opens for the first time with this post
  useEffect(() => {
    if (isOpen && postId && postId === currentPostId && comments.length === 0 && !loading) {
      loadComments(1, postId);
    }
  }, [isOpen, postId, currentPostId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const loadComments = async (pageNum = 1, targetPostId = postId) => {
    if (!targetPostId) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/posts/${targetPostId}/comments?page=${pageNum}&limit=20`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load comments');
      }

      const data = await response.json();

      // Only update state if this is still the current post
      if (targetPostId === currentPostId) {
        if (pageNum === 1) {
          setComments(data.comments || []);
        } else {
          setComments(prev => [...prev, ...(data.comments || [])]);
        }

        setHasMore(data.pagination?.hasMore || false);
        setPage(pageNum);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load comments:', error);
      if (targetPostId === currentPostId) {
        setError(error.message);
      }
      setLoading(false);
    }
  };

  const loadReplies = async (commentId) => {
    try {
      const response = await fetch(`/api/posts/comments/${commentId}/replies?page=1&limit=10`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load replies');
      }

      const data = await response.json();

      // Update the comment with replies
      setComments(prev => prev.map(comment => 
        comment._id === commentId 
          ? { ...comment, replies: data.replies || [], repliesLoaded: true }
          : comment
      ));

      setShowReplies(prev => ({ ...prev, [commentId]: true }));
    } catch (error) {
      console.error('Failed to load replies:', error);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || submitting || !currentPostId) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/posts/${currentPostId}/comment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text: newComment.trim(),
          parentComment: replyingTo
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const data = await response.json();

      if (replyingTo) {
        // Add reply to existing comment
        setComments(prev => prev.map(comment => 
          comment._id === replyingTo 
            ? { 
                ...comment, 
                replyCount: comment.replyCount + 1,
                replies: comment.replies ? [data.comment, ...comment.replies] : [data.comment]
              }
            : comment
        ));
        setShowReplies(prev => ({ ...prev, [replyingTo]: true }));
      } else {
        // Add new top-level comment
        setComments(prev => [data.comment, ...prev]);
      }

      setNewComment('');
      setReplyingTo(null);
      setSubmitting(false);

      // Callback to update comment count in parent
      if (onCommentAdded) {
        onCommentAdded();
      }

      // Scroll to bottom if new comment
      if (!replyingTo && bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      setSubmitting(false);
      alert('Failed to add comment. Please try again.');
    }
  };

  const likeComment = async (commentId, isReply = false, parentId = null) => {
    try {
      const response = await fetch(`/api/posts/comments/${commentId}/like`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to like comment');
      }

      const data = await response.json();

      if (isReply && parentId) {
        // Update reply like status
        setComments(prev => prev.map(comment => 
          comment._id === parentId 
            ? {
                ...comment,
                replies: comment.replies?.map(reply =>
                  reply._id === commentId 
                    ? { 
                        ...reply, 
                        isLiked: data.liked,
                        likes: data.liked ? reply.likes + 1 : reply.likes - 1
                      }
                    : reply
                )
              }
            : comment
        ));
      } else {
        // Update comment like status
        setComments(prev => prev.map(comment => 
          comment._id === commentId 
            ? { 
                ...comment, 
                isLiked: data.liked,
                likes: data.liked ? comment.likes + 1 : comment.likes - 1
              }
            : comment
        ));
      }
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  const addReaction = async (commentId, reactionType, isReply = false, parentId = null) => {
    try {
      const response = await fetch(`/api/posts/comments/${commentId}/reaction`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reactionType })
      });

      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }

      const data = await response.json();

      if (isReply && parentId) {
        setComments(prev => prev.map(comment => 
          comment._id === parentId 
            ? {
                ...comment,
                replies: comment.replies?.map(reply =>
                  reply._id === commentId 
                    ? { ...reply, userReaction: data.reaction }
                    : reply
                )
              }
            : comment
        ));
      } else {
        setComments(prev => prev.map(comment => 
          comment._id === commentId 
            ? { ...comment, userReaction: data.reaction }
            : comment
        ));
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
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

  const ReactionPicker = ({ commentId, isReply = false, parentId = null, currentReaction }) => {
    const [showPicker, setShowPicker] = useState(false);

    return (
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {currentReaction ? reactions.find(r => r.type === currentReaction)?.emoji : '😊'}
        </button>
        
        {showPicker && (
          <div className="absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg p-2 flex gap-2 shadow-lg z-50">
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
      <div className={`flex gap-3 ${isReply ? 'ml-8 mt-2' : 'mb-4'}`}>
        <img
          src={comment.userId?.profilePicture || '/api/placeholder/32/32'}
          alt={comment.userId?.username}
          className="w-8 h-8 rounded-full flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <div className="bg-gray-100 rounded-lg px-3 py-2">
            <div className="font-semibold text-sm text-gray-900">
              {comment.userId?.username}
            </div>
            <div className="text-sm text-gray-800 mt-1 break-words">
              {comment.text}
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{formatTimeAgo(comment.createdAt)}</span>
            
            <button
              onClick={() => likeComment(comment._id, isReply, parentId)}
              className={`font-semibold hover:text-gray-700 transition-colors ${
                comment.isLiked ? 'text-red-500' : ''
              }`}
            >
              Like {comment.likes > 0 && `(${comment.likes})`}
            </button>
            
            {!isReply && (
              <button
                onClick={() => {
                  setReplyingTo(comment._id);
                  textareaRef.current?.focus();
                }}
                className="font-semibold hover:text-gray-700 transition-colors"
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
              className="p-1 hover:bg-gray-200 rounded"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>
          
          {/* Replies */}
          {!isReply && comment.replyCount > 0 && (
            <div className="mt-3">
              {!showReplies[comment._id] ? (
                <button
                  onClick={() => loadReplies(comment._id)}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                >
                  View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                </button>
              ) : (
                <div>
                  {comment.replies?.map((reply) => (
                    <CommentItem
                      key={reply._id}
                      comment={reply}
                      isReply={true}
                      parentId={comment._id}
                    />
                  ))}
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
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-[30%] min-w-[400px] bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Comments ({commentCount})
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && comments.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">Failed to load comments</p>
              <button
                onClick={() => loadComments(1)}
                className="text-blue-500 hover:text-blue-700 font-semibold"
              >
                Retry
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">💬</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No comments yet</h4>
              <p className="text-gray-500">Be the first to comment!</p>
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
                    className="text-blue-500 hover:text-blue-700 font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load more comments'}
                  </button>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
        
        {/* Comment Input */}
        <div className="border-t border-gray-200 p-4">
          {replyingTo && (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-700">
                Replying to {comments.find(c => c._id === replyingTo)?.userId?.username}
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-blue-500 hover:text-blue-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex gap-3">
            <img
              src="/api/placeholder/32/32" // Replace with current user's profile picture
              alt="Your profile"
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={2}
                maxLength={2200}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
              />
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  {newComment.length}/2200
                </span>
                
                <button
                  onClick={submitComment}
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {replyingTo ? 'Reply' : 'Comment'}
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