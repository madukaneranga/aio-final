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
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  Play,
  Pause,
} from "lucide-react";

import CommentSidebar from "../components/CommentSidebar";

const SocialFeed = () => {
  const [posts, setPosts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [mediaLoadingStates, setMediaLoadingStates] = useState({});
  const [mediaErrors, setMediaErrors] = useState({});
  const [preloadedPosts, setPreloadedPosts] = useState(new Set());
  const [showProducts, setShowProducts] = useState({});
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState({}); // Track current image for each post

  const videoRefs = useRef({});
  const containerRef = useRef({});

  // Cache management
  const MAX_CACHED_VIDEOS = 5;
  const PRELOAD_RANGE = 2;

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    // Auto-play current video and pause others
    Object.keys(videoRefs.current).forEach((postId, index) => {
      const video = videoRefs.current[postId];
      if (video) {
        if (index === currentIndex && isPlaying) {
          video.currentTime = 0;
          video.play().catch(console.error);
          trackView(postId);
        } else {
          video.pause();
        }
      }
    });

    // Preload nearby posts
    preloadNearbyPosts();

    // Clean up old cached videos
    cleanupOldVideos();
  }, [currentIndex, posts, isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleScroll("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleScroll("down");
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleImageSwipe("prev");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleImageSwipe("next");
      }
    };

    const handleWheel = (e) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) > 50) {
        if (e.deltaY > 0) {
          handleScroll("down");
        } else {
          handleScroll("up");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [currentIndex, posts.length, hasMore, isPlaying]);

  // Reset image index when post changes
  useEffect(() => {
    if (posts[currentIndex]) {
      const postId = posts[currentIndex]._id;
      if (!(postId in currentImageIndex)) {
        setCurrentImageIndex(prev => ({ ...prev, [postId]: 0 }));
      }
    }
  }, [currentIndex, posts]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const preloadNearbyPosts = () => {
    const startIndex = Math.max(0, currentIndex - 1);
    const endIndex = Math.min(posts.length - 1, currentIndex + PRELOAD_RANGE);

    for (let i = startIndex; i <= endIndex; i++) {
      const post = posts[i];
      if (post && !preloadedPosts.has(post._id)) {
        preloadMedia(post);
      }
    }
  };

  const preloadMedia = (post) => {
    if (post.mediaType === "video") {
      const video = document.createElement("video");
      video.src = post.mediaUrls[0];
      video.preload = "metadata";
      video.muted = true;

      video.addEventListener("loadedmetadata", () => {
        setPreloadedPosts((prev) => new Set([...prev, post._id]));
      });

      video.addEventListener("error", () => {
        console.error("Failed to preload video:", post._id);
      });
    } else {
      // Preload all images for image posts
      post.mediaUrls.forEach((url) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          setPreloadedPosts((prev) => new Set([...prev, post._id]));
        };
      });
    }
  };

  const cleanupOldVideos = () => {
    const keysToKeep = posts
      .slice(
        Math.max(0, currentIndex - 2),
        Math.min(posts.length, currentIndex + 3)
      )
      .map((post) => post._id);

    Object.keys(videoRefs.current).forEach((postId) => {
      if (!keysToKeep.includes(postId)) {
        const video = videoRefs.current[postId];
        if (video) {
          video.pause();
          video.src = "";
          delete videoRefs.current[postId];
        }
      }
    });

    // Clean up preloaded posts cache
    setPreloadedPosts((prev) => {
      const newSet = new Set();
      keysToKeep.forEach((id) => {
        if (prev.has(id)) newSet.add(id);
      });
      return newSet;
    });
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/posts/feed?page=${page}&limit=10`, {
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
      await fetch(`/api/posts/${postId}/view`, {
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

      const response = await fetch(`/api/posts/${postId}/like`, {
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
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId ? { ...post, isMuted: video.muted } : post
        )
      );
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleCommentClick = () => {
    setShowComments(true);
  };

  const handleCommentAdded = () => {
    setPosts((prevPosts) =>
      prevPosts.map((post, index) =>
        index === currentIndex ? { ...post, comments: post.comments + 1 } : post
      )
    );
  };

  const handleImageSwipe = (direction) => {
    const currentPost = posts[currentIndex];
    if (!currentPost || currentPost.mediaType === "video" || currentPost.mediaUrls.length <= 1) {
      return;
    }

    const postId = currentPost._id;
    const currentImgIndex = currentImageIndex[postId] || 0;
    const maxIndex = currentPost.mediaUrls.length - 1;

    if (direction === "next" && currentImgIndex < maxIndex) {
      setCurrentImageIndex(prev => ({ ...prev, [postId]: currentImgIndex + 1 }));
    } else if (direction === "prev" && currentImgIndex > 0) {
      setCurrentImageIndex(prev => ({ ...prev, [postId]: currentImgIndex - 1 }));
    }
  };

  const handleImageDotClick = (imageIndex) => {
    const currentPost = posts[currentIndex];
    if (!currentPost) return;
    
    setCurrentImageIndex(prev => ({ ...prev, [currentPost._id]: imageIndex }));
  };

  const handleScroll = async (direction) => {
    if (direction === "up" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === "down" && currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (
      direction === "down" &&
      currentIndex === posts.length - 1 &&
      hasMore
    ) {
      try {
        const nextPage = page + 1;
        const response = await fetch(
          `/api/posts/feed?page=${nextPage}&limit=10`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPosts((prev) => [...prev, ...(data.posts || [])]);
          setHasMore(data.pagination?.hasMore || false);
          setPage(nextPage);
          setCurrentIndex(currentIndex + 1);
        }
      } catch (error) {
        console.error("Failed to load more posts:", error);
      }
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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

  const currentPost = posts[currentIndex];
  const postImageIndex = currentImageIndex[currentPost?._id] || 0;

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      {/* Top Navigation */}
      <nav className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center text-white z-30">
        <div className="flex items-center space-x-6 md:space-x-8">
          <div className="text-2xl md:text-3xl font-bold tracking-wider">
            AIO
          </div>
          <div className="hidden md:flex space-x-6">
            <button className="text-sm font-medium text-white hover:text-gray-300 transition-colors relative group">
              Following
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></div>
            </button>
            <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              For You
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 md:space-x-4">
          <button className="hidden md:flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-all duration-300 border border-gray-700">
            <span className="text-sm">✨</span>
            <span className="text-sm font-medium">Premium</span>
          </button>
          <button className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 border border-gray-700 flex items-center justify-center hover:bg-white/20 transition-all duration-300">
            <User className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="h-full flex items-center justify-center px-4 md:px-8">
        <div className="relative w-full max-w-sm h-[85vh] mx-auto">
          {/* Media Container */}
          <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-gray-900 border border-gray-800">
            {currentPost && (
              <>
                {/* Media Loading Overlay */}
                {(mediaLoadingStates[currentPost._id] ||
                  (!preloadedPosts.has(currentPost._id) &&
                    !mediaErrors[currentPost._id])) && (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-20">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
                      <p className="text-gray-400 text-sm">Loading...</p>
                    </div>
                  </div>
                )}

                {/* Media Error Overlay */}
                {mediaErrors[currentPost._id] && (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-20">
                    <div className="text-center">
                      <div className="text-gray-400 text-4xl mb-4">⚠️</div>
                      <p className="text-gray-400 text-sm mb-4">
                        Failed to load media
                      </p>
                      <button
                        onClick={() => retryMedia(currentPost._id)}
                        className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors mx-auto"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                {/* Video/Image Background */}
                {currentPost.mediaType === "video" ? (
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current[currentPost._id] = el;
                    }}
                    src={currentPost.mediaUrls[0]}
                    className="w-full h-full object-cover"
                    loop
                    muted={currentPost.isMuted !== false}
                    playsInline
                    onLoadStart={() => handleMediaLoadStart(currentPost._id)}
                    onLoadedData={() => handleMediaLoad(currentPost._id)}
                    onError={() => handleMediaError(currentPost._id)}
                    onCanPlay={() => handleMediaLoad(currentPost._id)}
                  />
                ) : (
                  <div className="relative w-full h-full">
                    {/* Image Swiper Container */}
                    <div className="w-full h-full relative overflow-hidden">
                      <div 
                        className="flex w-full h-full transition-transform duration-300 ease-out"
                        style={{ 
                          transform: `translateX(-${postImageIndex * 100}%)`,
                          width: `${currentPost.mediaUrls.length * 100}%`
                        }}
                      >
                        {currentPost.mediaUrls.map((url, index) => (
                          <div key={index} className="w-full h-full flex-shrink-0">
                            <img
                              src={url}
                              alt={`${currentPost.title} - Image ${index + 1}`}
                              className="w-full h-full object-cover"
                              onLoad={() => handleMediaLoad(currentPost._id)}
                              onError={() => handleMediaError(currentPost._id)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Image Navigation Arrows */}
                    {currentPost.mediaUrls.length > 1 && (
                      <>
                        {postImageIndex > 0 && (
                          <button
                            onClick={() => handleImageSwipe("prev")}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-gray-600 flex items-center justify-center text-white hover:bg-black/70 transition-all duration-300 z-10"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        
                        {postImageIndex < currentPost.mediaUrls.length - 1 && (
                          <button
                            onClick={() => handleImageSwipe("next")}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-gray-600 flex items-center justify-center text-white hover:bg-black/70 transition-all duration-300 z-10"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}

                    {/* Image Dots Indicator */}
                    {currentPost.mediaUrls.length > 1 && (
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                        {currentPost.mediaUrls.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => handleImageDotClick(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              index === postImageIndex
                                ? "bg-white scale-110"
                                : "bg-white/50 hover:bg-white/75"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Image Counter */}
                    {currentPost.mediaUrls.length > 1 && (
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm z-10">
                        {postImageIndex + 1}/{currentPost.mediaUrls.length}
                      </div>
                    )}
                  </div>
                )}

                {/* Top Controls */}
                <div className="absolute top-4 md:top-6 left-4 md:left-6 right-4 md:right-6 flex justify-between items-center z-10">
                  {currentPost.mediaType === "video" && (
                    <div className="flex space-x-2 md:space-x-3">
                      <button
                        onClick={togglePlayPause}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/40 backdrop-blur-sm border border-gray-600 flex items-center justify-center text-white hover:bg-black/60 transition-all duration-300"
                      >
                        {isPlaying ? (
                          <Pause className="w-3 h-3 md:w-4 md:h-4" />
                        ) : (
                          <Play className="w-3 h-3 md:w-4 md:h-4 ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleMute(currentPost._id)}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/40 backdrop-blur-sm border border-gray-600 flex items-center justify-center text-white hover:bg-black/60 transition-all duration-300"
                      >
                        {currentPost.isMuted !== false ? (
                          <VolumeX className="w-3 h-3 md:w-4 md:h-4" />
                        ) : (
                          <Volume2 className="w-3 h-3 md:w-4 md:h-4" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className="flex-1"></div>
                  <button className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/40 backdrop-blur-sm border border-gray-600 flex items-center justify-center text-white hover:bg-black/60 transition-all duration-300">
                    <svg
                      className="w-3 h-3 md:w-4 md:h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>

                {/* Bottom Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white z-10">
                  {/* User Info */}
                  <div className="flex items-center mb-3 md:mb-4">
                    <img
                      src={
                        currentPost.user?.profilePicture ||
                        ""
                      }
                      alt={currentPost.user?.username}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-600 mr-3"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-base md:text-lg">
                        {currentPost.user?.username}
                      </h3>
                      <p className="text-gray-300 text-xs md:text-sm flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        {formatNumber(currentPost.views || 0)} views
                      </p>
                    </div>
                    <button className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white border border-gray-600 flex items-center justify-center hover:bg-gray-200 transition-all duration-300">
                      <Plus className="w-3 h-3 md:w-4 md:h-4 text-black" />
                    </button>
                  </div>

                  {/* Post Title */}
                  <h2 className="text-lg md:text-xl font-bold mb-2 md:mb-3 leading-tight">
                    {currentPost.title}
                  </h2>

                  {/* Hashtags */}
                  <div className="mb-3 md:mb-4">
                    {currentPost.hashtags &&
                      currentPost.hashtags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-gray-300 mr-2 text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>

                  {/* Tagged Products */}
                  {currentPost.products && currentPost.products.length > 0 && (
                    <div className="mb-3 md:mb-4">
                      <button
                        onClick={() =>
                          setShowProducts((prev) => ({
                            ...prev,
                            [currentPost._id]: !prev[currentPost._id],
                          }))
                        }
                        className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-all duration-300 border border-gray-600 mb-3"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {currentPost.products.length} Products
                        </span>
                      </button>

                      {showProducts[currentPost._id] && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {currentPost.products.map((product) => (
                            <button
                              key={product._id}
                              onClick={() => handleProductClick(product)}
                              className="bg-white/10 backdrop-blur-sm rounded-xl p-3 hover:bg-white/20 transition-all duration-300 text-left border border-gray-600"
                            >
                              <div className="flex items-center space-x-3">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {product.name}
                                  </p>
                                  <p className="text-gray-300 text-sm font-semibold">
                                    {product.price}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Action Buttons - Right Side */}
          <div className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-3 md:space-y-4">
            {/* Profile Picture */}
            <div className="relative mb-2">
              <img
                src={
                  currentPost?.user?.profilePicture || ""
                }
                alt={currentPost?.user?.username}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-600"
              />
              <button className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-white text-black rounded-full p-1 hover:bg-gray-200 transition-colors">
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>

            {/* Like Button */}
            <button
              onClick={() => handleLike(currentPost._id)}
              className="group flex flex-col items-center"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/40 backdrop-blur-sm border border-gray-600 flex items-center justify-center hover:bg-black/60 transition-all duration-300 group-hover:scale-110">
                <Heart
                  className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${
                    currentPost.isLiked
                      ? "text-red-500 fill-red-500 scale-110"
                      : "text-white group-hover:text-red-400"
                  }`}
                />
              </div>
              <span className="text-white text-xs font-medium mt-1 md:mt-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                {formatNumber(currentPost.likes)}
              </span>
            </button>

            {/* Comment Button */}
            <button
              onClick={handleCommentClick}
              className="group flex flex-col items-center"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/40 backdrop-blur-sm border border-gray-600 flex items-center justify-center hover:bg-black/60 transition-all duration-300 group-hover:scale-110">
                <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:text-gray-300 transition-colors duration-300" />
              </div>
              <span className="text-white text-xs font-medium mt-1 md:mt-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                {formatNumber(currentPost.comments)}
              </span>
            </button>

            {/* Share Button */}
            <button
              onClick={() => handleShare(currentPost)}
              className="group flex flex-col items-center"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/40 backdrop-blur-sm border border-gray-600 flex items-center justify-center hover:bg-black/60 transition-all duration-300 group-hover:scale-110">
                <Share2 className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:text-gray-300 transition-colors duration-300" />
              </div>
              <span className="text-white text-xs font-medium mt-1 md:mt-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                {formatNumber(currentPost.shares)}
              </span>
            </button>
          </div>

          {/* Navigation Arrows - Left Side */}
          <div className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2 md:space-y-3">
            <button
              onClick={() => handleScroll("up")}
              disabled={currentIndex === 0}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full transition-all duration-300 flex items-center justify-center ${
                currentIndex === 0
                  ? "bg-black/20 text-gray-500 cursor-not-allowed border border-gray-700"
                  : "bg-black/40 backdrop-blur-sm border border-gray-600 text-white hover:bg-black/60 hover:scale-110"
              }`}
            >
              <ChevronUp className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => handleScroll("down")}
              disabled={currentIndex === posts.length - 1 && !hasMore}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full transition-all duration-300 flex items-center justify-center ${
                currentIndex === posts.length - 1 && !hasMore
                  ? "bg-black/20 text-gray-500 cursor-not-allowed border border-gray-700"
                  : "bg-black/40 backdrop-blur-sm border border-gray-600 text-white hover:bg-black/60 hover:scale-110"
              }`}
            >
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-1 md:space-x-2">
        {posts.map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "w-6 md:w-8 bg-white"
                : "w-1.5 md:w-2 bg-gray-600"
            }`}
          />
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-16 md:bottom-20 left-1/2 transform -translate-x-1/2 text-white">
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

export default SocialFeed;