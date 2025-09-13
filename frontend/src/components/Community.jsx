import React, { useState, useEffect } from 'react';
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  BookmarkIcon,
  PlusIcon,
  UserGroupIcon,
  SparklesIcon,
  FireIcon,
  TrophyIcon,
  StarIcon,
  PhotoIcon,
  TagIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartIconSolid, 
  BookmarkIcon as BookmarkIconSolid,
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import communityService from '../services/communityService';
import { authToken } from '../services/authService';

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [user, setUser] = useState(null);
  const [communityStats, setCommunityStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'story',
    category: 'general',
    tags: [],
    images: []
  });
  const navigate = useNavigate();

  const postTypes = [
    { id: 'all', name: 'All Posts', icon: '📝' },
    { id: 'story', name: 'Stories', icon: '📖' },
    { id: 'tip', name: 'Tips & Tricks', icon: '💡' },
    { id: 'question', name: 'Questions', icon: '❓' },
    { id: 'achievement', name: 'Achievements', icon: '🏆' },
    { id: 'product_showcase', name: 'Product Showcase', icon: '🛍️' },
    { id: 'event', name: 'Events', icon: '📅' }
  ];

  const categories = [
    { id: 'all', name: 'All Categories', icon: '🌟' },
    { id: 'general', name: 'General', icon: '💬' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'craft', name: 'Craft', icon: '🎨' },
    { id: 'food', name: 'Food', icon: '🍽️' },
    { id: 'marketing', name: 'Marketing', icon: '📢' },
    { id: 'community', name: 'Community', icon: '🤝' }
  ];

  useEffect(() => {
    loadUser();
    loadPosts();
    loadCommunityStats();
    loadLeaderboard();
  }, []);

  const loadUser = async () => {
    try {
      const token = authToken.getToken();
      if (token) {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await communityService.getPosts({
        type: selectedFilter === 'all' ? undefined : selectedFilter,
        limit: 20
      });
      if (response.success) {
        setPosts(response.data);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  const loadCommunityStats = async () => {
    try {
      const response = await communityService.getCommunityStats();
      if (response.success) {
        setCommunityStats(response.data);
      }
    } catch (error) {
      console.error('Error loading community stats:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await communityService.getLeaderboard();
      if (response.success) {
        setLeaderboard(response.data);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedFilter]);

  const handleLikePost = async (postId) => {
    try {
      const response = await communityService.likePost(postId);
      if (response.success) {
        setPosts(posts.map(post => 
          post._id === postId 
            ? { ...post, likeCount: response.likeCount, isLiked: response.liked }
            : post
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to like post');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      const response = await communityService.createPost(newPost);
      if (response.success) {
        setPosts([response.data, ...posts]);
        setNewPost({
          title: '',
          content: '',
          type: 'story',
          category: 'general',
          tags: [],
          images: []
        });
        setShowCreatePost(false);
        toast.success('Post created successfully!');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const handleAddComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;
    
    try {
      const response = await communityService.createComment(postId, {
        content: newComment[postId]
      });
      if (response.success) {
        setPosts(posts.map(post => 
          post._id === postId 
            ? { ...post, comments: [...post.comments, response.data] }
            : post
        ));
        setNewComment({ ...newComment, [postId]: '' });
        toast.success('Comment added!');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return postDate.toLocaleDateString();
  };

  const renderPost = (post) => (
    <div key={post._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
            {post.artisan?.businessImage ? (
              <img 
                src={post.artisan.businessImage} 
                alt={post.artisan.artisanName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-lg">
                {post.artisan?.artisanName?.charAt(0) || 'A'}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{post.artisan?.artisanName}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{formatTimeAgo(post.createdAt)}</span>
              <span>•</span>
              <span className="capitalize">{post.type.replace('_', ' ')}</span>
              {post.isFeatured && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 font-medium">Featured</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400" />
        </button>
            </div>
            
      {/* Post Content */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>

      {/* Post Images */}
      {post.images && post.images.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {post.images.map((image, index) => (
              <img
                key={index}
                src={image.url}
                alt={image.alt || `Post image ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            ))}
          </div>
        </div>
      )}

      {/* Post Tags */}
      {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, index) => (
            <span key={index} className="bg-amber-100 text-amber-800 text-sm px-3 py-1 rounded-full">
              #{tag}
              </span>
            ))}
          </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => handleLikePost(post._id)}
            className={`flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors ${
              post.isLiked ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {post.isLiked ? (
              <HeartIconSolid className="w-5 h-5" />
            ) : (
              <HeartIcon className="w-5 h-5" />
            )}
            <span>{post.likeCount || 0}</span>
          </button>
          
          <button
            onClick={() => toggleComments(post._id)}
            className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-gray-500"
          >
            <ChatBubbleLeftIcon className="w-5 h-5" />
            <span>{post.comments?.length || 0}</span>
          </button>
          
          <button className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-gray-500">
            <ShareIcon className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>
        
        <button className="hover:bg-gray-100 p-2 rounded-lg transition-colors text-gray-500">
          <BookmarkIcon className="w-5 h-5" />
        </button>
            </div>
            
      {/* Comments Section */}
      {expandedComments[post._id] && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* Add Comment */}
          {user && (
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user.firstName?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment[post._id] || ''}
                  onChange={(e) => setNewComment({ ...newComment, [post._id]: e.target.value })}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  rows="2"
                />
                <div className="flex justify-end mt-2">
            <button
                    onClick={() => handleAddComment(post._id)}
                    disabled={!newComment[post._id]?.trim()}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Comment
            </button>
          </div>
        </div>
            </div>
          )}

          {/* Existing Comments */}
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-4">
              {post.comments.map((comment) => (
                <div key={comment._id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {comment.author?.firstName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {comment.author?.firstName} {comment.author?.lastName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    );

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Artisan Community</h1>
              <p className="text-gray-600 mt-1">
                Connect, share, and learn with fellow artisans
              </p>
            </div>
            
            {user && (
              <button
                onClick={() => setShowCreatePost(true)}
                className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center space-x-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Create Post</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Filter Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Community Posts</h2>
                <div className="text-sm text-gray-500">
                  {posts.length} posts
                </div>
              </div>
              
              <div className="flex space-x-1 overflow-x-auto pb-2">
                {postTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedFilter(type.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedFilter === type.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{type.icon}</span>
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts Feed */}
            {loading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map(renderPost)}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600 mb-6">
                  Be the first to share something with the community!
                </p>
                {user && (
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                  >
                    Create First Post
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Stats */}
            {communityStats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <SparklesIcon className="w-5 h-5 mr-2 text-amber-600" />
                  Community Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Posts</span>
                    <span className="font-semibold">{communityStats.totalPosts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comments</span>
                    <span className="font-semibold">{communityStats.totalComments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Artisans</span>
                    <span className="font-semibold">{communityStats.totalArtisans}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrophyIcon className="w-5 h-5 mr-2 text-amber-600" />
                  Top Artisans
                </h3>
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((artisan, index) => (
                    <div key={artisan._id} className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{artisan.artisanName}</div>
                        <div className="text-sm text-gray-500">{artisan.totalPoints} points</div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}

            {/* Categories */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-gray-700">{category.name}</span>
                </button>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Post</h2>
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleCreatePost} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Type
                  </label>
                  <select
                    value={newPost.type}
                    onChange={(e) => setNewPost({ ...newPost, type: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="story">Story</option>
                    <option value="tip">Tip & Trick</option>
                    <option value="question">Question</option>
                    <option value="achievement">Achievement</option>
                    <option value="product_showcase">Product Showcase</option>
                    <option value="event">Event</option>
                  </select>
        </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder="What's your post about?"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
            </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content *
                  </label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    placeholder="Share your thoughts, tips, or experiences..."
                    rows="6"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    required
                  />
          </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="business">Business</option>
                    <option value="craft">Craft</option>
                    <option value="food">Food</option>
                    <option value="marketing">Marketing</option>
                    <option value="community">Community</option>
                  </select>
            </div>
                
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowCreatePost(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
              <button
                    type="submit"
                    className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                    Create Post
              </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}