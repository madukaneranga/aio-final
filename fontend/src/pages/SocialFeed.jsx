import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, User, ShoppingBag, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import CommentSidebar from '../components/CommentSidebar'; 

const TikTokFeed = () => {
  const [posts, setPosts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const videoRefs = useRef({});
  const containerRef = useRef({});

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    // Auto-play current video and pause others
    Object.keys(videoRefs.current).forEach((postId, index) => {
      const video = videoRefs.current[postId];
      if (video) {
        if (index === currentIndex) {
          video.play().catch(console.error);
          trackView(postId);
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex, posts]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleScroll('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleScroll('down');
      }
    };

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        handleScroll('down');
      } else {
        handleScroll('up');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [currentIndex, posts.length, hasMore]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/posts/feed?page=${page}&limit=10`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      
      if (page === 1) {
        setPosts(data.posts || []);
      } else {
        setPosts(prev => [...prev, ...(data.posts || [])]);
      }
      
      setHasMore(data.pagination?.hasMore || false);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load posts:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const trackView = async (postId) => {
    try {
      await fetch(`/api/posts/${postId}/view`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const handleLike = async (postId) => {
    try {
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes - 1 : post.likes + 1
              }
            : post
        )
      );

      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId
            ? { ...post, isLiked: data.liked }
            : post
        )
      );
      
    } catch (error) {
      console.error('Failed to like post:', error);
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? post.likes + 1 : post.likes - 1
              }
            : post
        )
      );
    }
  };

  const handleSave = async (postId) => {
    try {
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId
            ? { ...post, isSaved: !post.isSaved }
            : post
        )
      );
    } catch (error) {
      console.error('Failed to save post:', error);
    }
  };

  const handleShare = async (post) => {
    try {
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p._id === post._id
            ? { ...p, shares: p.shares + 1 }
            : p
        )
      );

      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.description,
          url: `${window.location.origin}/post/${post._id}`
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
        alert('Link copied to clipboard!');
      }
      
    } catch (error) {
      console.error('Failed to share post:', error);
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p._id === post._id
            ? { ...p, shares: p.shares - 1 }
            : p
        )
      );
    }
  };

  const toggleMute = (postId) => {
    const video = videoRefs.current[postId];
    if (video) {
      video.muted = !video.muted;
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post._id === postId
            ? { ...post, isMuted: video.muted }
            : post
        )
      );
    }
  };

  const handleCommentClick = () => {
    setShowComments(true);
  };

  const handleCommentAdded = () => {
    // Update comment count for current post
    setPosts(prevPosts =>
      prevPosts.map((post, index) =>
        index === currentIndex
          ? { ...post, comments: post.comments + 1 }
          : post
      )
    );
  };

  const handleScroll = async (direction) => {
    if (direction === 'up' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'down' && currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'down' && currentIndex === posts.length - 1 && hasMore) {
      // Load more posts when reaching the end
      try {
        const nextPage = page + 1;
        const response = await fetch(`/api/posts/feed?page=${nextPage}&limit=10`, {
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          setPosts(prev => [...prev, ...(data.posts || [])]);
          setHasMore(data.pagination?.hasMore || false);
          setPage(nextPage);
          setCurrentIndex(currentIndex + 1);
        }
      } catch (error) {
        console.error('Failed to load more posts:', error);
      }
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleProductClick = (product) => {
    window.open(`/product/${product._id}`, '_blank');
  };

  if (loading && posts.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <p className="text-lg mb-4">Failed to load feed: {error}</p>
        <button
          onClick={() => {
            setPage(1);
            loadPosts();
          }}
          className="bg-white text-black px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="text-6xl mb-4">📱</div>
        <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
        <p className="text-gray-400 mb-6">Be the first to share something amazing!</p>
        <button
          onClick={() => window.location.href = '/create-post'}
          className="bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Create Post
        </button>
      </div>
    );
  }

  const currentPost = posts[currentIndex];

  return (
    <div className="h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-white z-30">
        <div className="flex space-x-4">
          <button className="text-lg font-semibold">Following</button>
          <button className="text-lg font-semibold text-white/60">For You</button>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-sm">🪙 Get Coins</button>
          <button className="text-sm">📱 Get App</button>
          <button className="p-2">
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Container with Video and Action Buttons */}
      <div className="relative flex items-center justify-center gap-8">
        {/* Video Card Container */}
        <div className="relative w-full max-w-sm h-[80vh] flex items-center justify-center">
          {/* Video Card */}
          <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
            {currentPost && (
              <>
                {/* Video/Image Background */}
                {currentPost.mediaType === 'video' ? (
                  <video
                    ref={el => videoRefs.current[currentPost._id] = el}
                    src={currentPost.mediaUrls[0]}
                    className="w-full h-full object-cover"
                    loop
                    muted={currentPost.isMuted !== false}
                    playsInline
                  />
                ) : (
                  <img
                    src={currentPost.mediaUrls[0]}
                    alt={currentPost.title}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Top Controls */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                  <button
                    onClick={() => toggleMute(currentPost._id)}
                    className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
                  >
                    {currentPost.isMuted !== false ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <button className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                  </button>
                </div>

                {/* Bottom Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                  {/* User Info */}
                  <div className="flex items-center mb-3">
                    <span className="font-semibold text-lg">{currentPost.user?.username}</span>
                  </div>

                  {/* Post Title with styling */}
                  <div className="relative mb-3">
                    <h2 className="text-lg font-bold leading-tight">
                      {currentPost.title}
                    </h2>
                  </div>

                  {/* Hashtags */}
                  <div className="text-sm">
                    {currentPost.hashtags && currentPost.hashtags.map((tag, index) => (
                      <span key={index} className="text-blue-300 mr-1">#{tag}</span>
                    ))}
                    <span className="text-white/80">... more</span>
                  </div>

                  {/* Tagged Products */}
                  {currentPost.products && currentPost.products.length > 0 && (
                    <div className="mt-3 bg-black/40 rounded-lg p-2 backdrop-blur-sm">
                      <div className="flex gap-2 overflow-x-auto">
                        {currentPost.products.map((product) => (
                          <button
                            key={product._id}
                            onClick={() => handleProductClick(product)}
                            className="flex-shrink-0 bg-white/20 rounded p-2 hover:bg-white/30 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-6 h-6 rounded object-cover"
                              />
                              <div className="text-xs">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-green-300">{product.price}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side Actions - Now Outside Video Container */}
        <div className="flex flex-col items-center space-y-4">
          {/* Profile Picture */}
          <div className="relative">
            <img
              src={currentPost?.user?.profilePicture || '/api/placeholder/48/48'}
              alt={currentPost?.user?.username}
              className="w-12 h-12 rounded-full border-2 border-white"
            />
            <button className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Like Button */}
          <button
            onClick={() => handleLike(currentPost._id)}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-black/40 transition-colors">
              <Heart 
                className={`w-7 h-7 ${
                  currentPost.isLiked 
                    ? 'text-red-500 fill-red-500' 
                    : 'text-white group-hover:text-red-500'
                } transition-colors`} 
              />
            </div>
            <span className="text-xs text-white font-medium">
              {formatNumber(currentPost.likes)}
            </span>
          </button>

          {/* Comment Button */}
          <button 
            onClick={handleCommentClick}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-black/40 transition-colors">
              <MessageCircle className="w-7 h-7 text-white group-hover:text-blue-500 transition-colors" />
            </div>
            <span className="text-xs text-white font-medium">
              {formatNumber(currentPost.comments)}
            </span>
          </button>

          {/* Save Button */}
          <button
            onClick={() => handleSave(currentPost._id)}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-black/40 transition-colors">
              <Bookmark 
                className={`w-7 h-7 ${
                  currentPost.isSaved 
                    ? 'text-yellow-500 fill-yellow-500' 
                    : 'text-white group-hover:text-yellow-500'
                } transition-colors`} 
              />
            </div>
            <span className="text-xs text-white font-medium">
              {formatNumber(currentPost.saves || 0)}
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => handleShare(currentPost)}
            className="flex flex-col items-center space-y-1 group"
          >
            <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm group-hover:bg-black/40 transition-colors">
              <Share2 className="w-7 h-7 text-white group-hover:text-green-500 transition-colors" />
            </div>
            <span className="text-xs text-white font-medium">
              {formatNumber(currentPost.shares)}
            </span>
          </button>

          {/* Profile Button */}
          <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Navigation Arrows */}
        <div className="absolute right-8 top-1/2 transform translate-x-full -translate-y-1/2 flex flex-col space-y-4">
          <button
            onClick={() => handleScroll('up')}
            disabled={currentIndex === 0}
            className={`p-2 rounded-full transition-colors ${
              currentIndex === 0 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <button
            onClick={() => handleScroll('down')}
            disabled={currentIndex === posts.length - 1 && !hasMore}
            className={`p-2 rounded-full transition-colors ${
              currentIndex === posts.length - 1 && !hasMore
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}

      {/* Comment Sidebar */}
      <CommentSidebar
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        postId={currentPost?._id}
        commentCount={currentPost?.comments || 0}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
};

export default TikTokFeed;