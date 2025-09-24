import React, { useState, useEffect } from 'react';
import { 
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  BookmarkIcon,
  PlusIcon,
  UserGroupIcon,
  FireIcon,
  StarIcon,
  PhotoIcon,
  TagIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  MapPinIcon,
  LinkIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartIconSolid, 
  BookmarkIcon as BookmarkIconSolid,
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import communityService from '../services/communityService';
import { authToken } from '../services/authservice';

export default function Community() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'story',
    category: 'general',
    tags: [],
    images: [],
    // Recipe specific fields
    recipe: {
      ingredients: [],
      steps: [],
      prepTime: '',
      cookTime: '',
      servings: '',
      difficulty: 'easy'
    },
    // Event specific fields
    event: {
      date: '',
      time: '',
      location: '',
      maxAttendees: '',
      rsvpRequired: false,
      eventLink: ''
    },
    // Product showcase fields
    product: {
      productId: '',
      productName: '',
      productPrice: '',
      productLink: '',
      discountCode: ''
    },
    // Poll fields
    poll: {
      question: '',
      options: ['', ''],
      expiresAt: '',
      allowMultipleVotes: false
    },
    // Tagging
    taggedArtisans: [],
    taggedProducts: []
  });

  const postTypes = [
    { id: 'all', name: 'All Posts', icon: '📝' },
    { id: 'story', name: 'Stories', icon: '📖' },
    { id: 'recipe', name: 'Recipes', icon: '👨‍🍳' },
    { id: 'tip', name: 'Tips & Tricks', icon: '💡' },
    { id: 'question', name: 'Questions', icon: '❓' },
    { id: 'product_showcase', name: 'Product Showcase', icon: '🛍️' },
    { id: 'event', name: 'Events', icon: '📅' },
    { id: 'poll', name: 'Polls', icon: '🗳️' }
  ];


  useEffect(() => {
    loadUser();
    loadLeaderboard();
  }, []);

  const loadUser = async () => {
    try {
      const token = authToken.getToken();
      if (token) {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://bazaarmkt.ca/api'}/auth/profile`, {
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
        limit: 20,
        populate: 'artisan,comments,likes'
      });
      if (response.success) {
        console.log('Loaded posts:', response.data);
        setPosts(response.data);
        
        // Calculate trending posts from all posts
        const trending = calculateTrendingPosts(response.data);
        setTrendingPosts(trending);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load community posts');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await communityService.getEngagementLeaderboard();
      console.log('📊 Engagement leaderboard response:', response);
      if (response.success && response.data && response.data.length > 0) {
        console.log('✅ Setting real leaderboard data:', response.data);
        setLeaderboard(response.data);
      } else {
        console.log('ℹ️ No engaged artisans found - this is normal for new platforms');
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('❌ Error loading engagement leaderboard:', error);
      // Don't use fallback data - show empty state instead
      setLeaderboard([]);
      toast.error('Failed to load engaged artisans');
    }
  };

  const calculateTrendingPosts = (allPosts) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filter posts from the current week
    const weeklyPosts = allPosts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= weekAgo;
    });
    
    // Calculate trending score based on likes, comments, and recency
    const trendingPosts = weeklyPosts.map(post => {
      const postDate = new Date(post.createdAt);
      const hoursSinceCreated = (now - postDate) / (1000 * 60 * 60);
      
      // Trending score calculation:
      // - Likes weight: 2 points each
      // - Comments weight: 3 points each (comments are more valuable)
      // - Recency factor: Higher score for newer posts (decay over time)
      const likesScore = (post.likeCount || 0) * 2;
      const commentsScore = (post.commentCount || 0) * 3;
      const recencyFactor = Math.max(0.1, 1 - (hoursSinceCreated / (7 * 24))); // Decay over 7 days
      
      const trendingScore = (likesScore + commentsScore) * recencyFactor;
      
      return {
        ...post,
        trendingScore
      };
    });
    
    // Sort by trending score and return top 5
    return trendingPosts
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 5);
  };

  const scrollToPost = (postId) => {
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
      postElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Add a temporary highlight effect
      postElement.classList.add('ring-2', 'ring-amber-500', 'ring-opacity-50');
      setTimeout(() => {
        postElement.classList.remove('ring-2', 'ring-amber-500', 'ring-opacity-50');
      }, 2000);
    }
  };

  // Load posts on component mount and when filter changes
  useEffect(() => {
    loadPosts();
  }, [selectedFilter]);

  const handleLikePost = async (postId) => {
    try {
      const response = await communityService.likePost(postId);
      if (response.success) {
        const updatedPosts = posts.map(post => 
          post._id === postId 
            ? { ...post, likeCount: response.likeCount, isLiked: response.liked }
            : post
        );
        setPosts(updatedPosts);
        
        // Recalculate trending posts
        const trending = calculateTrendingPosts(updatedPosts);
        setTrendingPosts(trending);
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('Failed to like post');
    }
  };

  const handleRSVP = async (postId) => {
    try {
      const post = posts.find(p => p._id === postId);
      if (!post || post.type !== 'event') return;

      const response = await communityService.rsvpToEvent(postId);
      if (response.success) {
        setPosts(posts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                rsvpCount: response.data.rsvpCount,
                waitlistCount: response.data.waitlistCount,
                hasCapacity: response.data.hasCapacity,
                userRSVPStatus: response.data.userRSVPStatus
              }
            : post
        ));
        
        const statusMessage = response.data.userRSVPStatus === 'waitlist' 
          ? 'Added to waitlist!' 
          : 'RSVP confirmed!';
        toast.success(statusMessage);
      }
    } catch (error) {
      console.error('Error RSVPing to event:', error);
      toast.error(error.response?.data?.message || 'Failed to RSVP');
    }
  };

  const handleCancelRSVP = async (postId) => {
    try {
      const response = await communityService.cancelRSVP(postId);
      if (response.success) {
        setPosts(posts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                rsvpCount: response.data.rsvpCount,
                waitlistCount: response.data.waitlistCount,
                hasCapacity: response.data.hasCapacity,
                userRSVPStatus: response.data.userRSVPStatus
              }
            : post
        ));
        toast.success('RSVP cancelled');
      }
    } catch (error) {
      console.error('Error cancelling RSVP:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel RSVP');
    }
  };

  const handlePollVote = async (postId, optionIndex) => {
    try {
      const response = await communityService.voteOnPoll(postId, optionIndex);
      if (response.success) {
        setPosts(posts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                poll: {
                  ...post.poll,
                  votes: response.data.votes
                }
              }
            : post
        ));
        toast.success('Vote recorded!');
      }
    } catch (error) {
      console.error('Error voting on poll:', error);
      toast.error(error.response?.data?.message || 'Failed to vote');
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
          images: [],
          recipe: {
            ingredients: [],
            steps: [],
            prepTime: '',
            cookTime: '',
            servings: '',
            difficulty: 'easy'
          },
          event: {
            date: '',
            time: '',
            location: '',
            maxAttendees: '',
            rsvpRequired: false,
            eventLink: ''
          },
          product: {
            productId: '',
            productName: '',
            productPrice: '',
            productLink: '',
            discountCode: ''
          },
          poll: {
            question: '',
            options: ['', ''],
            expiresAt: '',
            allowMultipleVotes: false
          },
          taggedArtisans: [],
          taggedProducts: []
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
        const updatedPosts = posts.map(post => 
          post._id === postId 
            ? { ...post, comments: [...post.comments, response.data], commentCount: (post.commentCount || 0) + 1 }
            : post
        );
        setPosts(updatedPosts);
        setNewComment({ ...newComment, [postId]: '' });
        
        // Recalculate trending posts
        const trending = calculateTrendingPosts(updatedPosts);
        setTrendingPosts(trending);
        
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

  // Helper functions for rich post types
  const addRecipeIngredient = () => {
    setNewPost({
      ...newPost,
      recipe: {
        ...newPost.recipe,
        ingredients: [...newPost.recipe.ingredients, { name: '', amount: '', unit: '' }]
      }
    });
  };

  const removeRecipeIngredient = (index) => {
    setNewPost({
      ...newPost,
      recipe: {
        ...newPost.recipe,
        ingredients: newPost.recipe.ingredients.filter((_, i) => i !== index)
      }
    });
  };

  const updateRecipeIngredient = (index, field, value) => {
    const updatedIngredients = [...newPost.recipe.ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setNewPost({
      ...newPost,
      recipe: { ...newPost.recipe, ingredients: updatedIngredients }
    });
  };

  const addRecipeStep = () => {
    setNewPost({
      ...newPost,
      recipe: {
        ...newPost.recipe,
        steps: [...newPost.recipe.steps, { step: '', description: '' }]
      }
    });
  };

  const removeRecipeStep = (index) => {
    setNewPost({
      ...newPost,
      recipe: {
        ...newPost.recipe,
        steps: newPost.recipe.steps.filter((_, i) => i !== index)
      }
    });
  };

  const updateRecipeStep = (index, field, value) => {
    const updatedSteps = [...newPost.recipe.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setNewPost({
      ...newPost,
      recipe: { ...newPost.recipe, steps: updatedSteps }
    });
  };

  const addPollOption = () => {
    setNewPost({
      ...newPost,
      poll: {
        ...newPost.poll,
        options: [...newPost.poll.options, '']
      }
    });
  };

  const removePollOption = (index) => {
    if (newPost.poll.options.length > 2) {
      setNewPost({
        ...newPost,
        poll: {
          ...newPost.poll,
          options: newPost.poll.options.filter((_, i) => i !== index)
        }
      });
    }
  };

  const updatePollOption = (index, value) => {
    const updatedOptions = [...newPost.poll.options];
    updatedOptions[index] = value;
    setNewPost({
      ...newPost,
      poll: { ...newPost.poll, options: updatedOptions }
    });
  };

  const handleShare = async (post) => {
    const postUrl = `${window.location.origin}/community/post/${post._id}`;
    const shareText = `Check out this post by ${post.artisan?.artisanName}: "${post.title}"`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: shareText,
          url: postUrl,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText} ${postUrl}`);
        toast.success('Post link copied to clipboard!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast.error('Failed to copy link');
      }
    }
  };

  const handleSocialShare = (post, platform) => {
    const postUrl = `${window.location.origin}/community/post/${post._id}`;
    const shareText = `Check out this post by ${post.artisan?.artisanName}: "${post.title}"`;
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`;
        break;
      case 'instagram':
        // Instagram doesn't support direct URL sharing, so we'll copy the text
        navigator.clipboard.writeText(`${shareText} ${postUrl}`);
        toast.success('Post content copied! You can now paste it on Instagram.');
        return;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${postUrl}`)}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const renderPost = (post) => (
    <div id={`post-${post._id}`} key={post._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
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
            <button
              onClick={() => navigate(`/artisan/${post.artisan?._id}`)}
              className="font-semibold text-gray-900 hover:text-amber-600 transition-colors text-left"
            >
              {post.artisan?.artisanName}
            </button>
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
        
        {/* Event Details */}
        {post.type === 'event' && post.event && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    {new Date(post.event.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-blue-700">{post.event.time}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPinIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Location</p>
                  <p className="text-sm text-blue-700">{post.event.location}</p>
                </div>
              </div>
              
              {post.event.eventLink && (
                <div className="flex items-center space-x-2 md:col-span-2">
                  <LinkIcon className="w-5 h-5 text-blue-600" />
                  <a 
                    href={post.event.eventLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-700 hover:text-blue-900 underline"
                  >
                    Join Event Link
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recipe Details */}
        {post.type === 'recipe' && post.recipe && (
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-xs text-amber-700">Prep Time</p>
                  <p className="font-medium text-amber-900">{post.recipe.prepTime || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-xs text-amber-700">Cook Time</p>
                  <p className="font-medium text-amber-900">{post.recipe.cookTime || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-xs text-amber-700">Servings</p>
                  <p className="font-medium text-amber-900">{post.recipe.servings || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <FireIcon className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-xs text-amber-700">Difficulty</p>
                  <p className="font-medium text-amber-900 capitalize">{post.recipe.difficulty || 'N/A'}</p>
                </div>
              </div>
            </div>

            {post.recipe.ingredients && post.recipe.ingredients.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-amber-900 mb-2">Ingredients</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {post.recipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <span className="text-amber-600">•</span>
                      <span className="text-amber-800">
                        {ingredient.amount} {ingredient.unit} {ingredient.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {post.recipe.steps && post.recipe.steps.length > 0 && (
              <div>
                <h4 className="font-semibold text-amber-900 mb-2">Instructions</h4>
                <div className="space-y-2">
                  {post.recipe.steps.map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-amber-800 text-sm">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Showcase Details */}
        {post.type === 'product_showcase' && post.product && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 mb-2">{post.product.productName}</h4>
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-2">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-900 text-lg">{post.product.productPrice}</span>
                  </div>
                  {post.product.discountCode && (
                    <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm font-medium">
                      Code: {post.product.discountCode}
                    </span>
                  )}
                </div>
                {post.product.productLink && (
                  <a 
                    href={post.product.productLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <ShoppingCartIcon className="w-4 h-4" />
                    <span>View Product</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Poll Details */}
        {post.type === 'poll' && post.poll && (
          <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="mb-4">
              <h4 className="font-semibold text-purple-900 mb-3">{post.poll.question}</h4>
              
              {post.poll.options && post.poll.options.length > 0 && (
                <div className="space-y-3">
                  {post.poll.options.map((option, index) => {
                    const voteCount = post.poll.votes?.filter(vote => 
                      vote.options.includes(index) && vote.user
                    ).length || 0;
                    const totalVotes = post.poll.votes?.filter(vote => vote.user).length || 0;
                    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                    const userVoted = post.poll.votes?.some(vote => 
                      vote.user === user?._id && vote.options.includes(index)
                    ) || false;

                    return (
                      <div key={index} className="relative">
                        <button
                          onClick={() => handlePollVote(post._id, index)}
                          disabled={userVoted || (post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date())}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                            userVoted 
                              ? 'border-purple-500 bg-purple-100 cursor-default' 
                              : (post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date())
                              ? 'border-purple-200 bg-gray-100 cursor-not-allowed'
                              : 'border-purple-200 bg-white hover:border-purple-300 hover:bg-purple-50 cursor-pointer'
                          }`}
                        >
                          <span className={`font-medium text-left ${
                            userVoted ? 'text-purple-900' : 'text-purple-800'
                          }`}>
                            {option}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-purple-600 font-medium">
                              {voteCount} vote{voteCount !== 1 ? 's' : ''}
                            </span>
                            {userVoted && (
                              <CheckCircleIcon className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                        </button>
                        {totalVotes > 0 && (
                          <div className="mt-1 bg-purple-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-sm text-purple-700">
                <span>
                  {post.poll.votes?.filter(vote => vote.user).length || 0} total vote{(post.poll.votes?.filter(vote => vote.user).length || 0) !== 1 ? 's' : ''}
                </span>
                {post.poll.expiresAt && (
                  <span>
                    Expires: {new Date(post.poll.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
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
          
          <div className="relative group">
            <button className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-gray-500">
              <ShareIcon className="w-5 h-5" />
              <span>Share</span>
            </button>
            
            {/* Share Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="py-2">
                <button
                  onClick={() => handleShare(post)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <span>📋</span>
                  <span>Copy Link</span>
                </button>
                <button
                  onClick={() => handleSocialShare(post, 'facebook')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <span>📘</span>
                  <span>Facebook</span>
                </button>
                <button
                  onClick={() => handleSocialShare(post, 'twitter')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <span>🐦</span>
                  <span>Twitter</span>
                </button>
                <button
                  onClick={() => handleSocialShare(post, 'instagram')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <span>📷</span>
                  <span>Instagram</span>
                </button>
                <button
                  onClick={() => handleSocialShare(post, 'linkedin')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <span>💼</span>
                  <span>LinkedIn</span>
                </button>
                <button
                  onClick={() => handleSocialShare(post, 'whatsapp')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* RSVP Button for Event Posts */}
          {post.type === 'event' && post.rsvpRequired && (
            <button
              onClick={() => {
                if (post.userRSVPStatus === 'confirmed' || post.userRSVPStatus === 'waitlist') {
                  handleCancelRSVP(post._id);
                } else {
                  handleRSVP(post._id);
                }
              }}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                post.userRSVPStatus === 'confirmed' 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : post.userRSVPStatus === 'waitlist'
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : post.hasCapacity 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!post.hasCapacity && !post.userRSVPStatus}
            >
              <CalendarDaysIcon className="w-5 h-5" />
              <span>
                {post.userRSVPStatus === 'confirmed' 
                  ? 'RSVP\'d' 
                  : post.userRSVPStatus === 'waitlist'
                  ? 'Waitlist'
                  : post.hasCapacity 
                  ? 'RSVP' 
                  : 'Full'}
              </span>
              <span className="text-sm">
                ({post.rsvpCount || 0}/{post.maxAttendees || 0})
              </span>
            </button>
          )}
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
                      {comment.author?.firstName?.charAt(0) || comment.artisan?.artisanName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {comment.author ? 
                            `${comment.author.firstName} ${comment.author.lastName}` : 
                            comment.artisan?.artisanName || 'Anonymous'
                          }
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
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
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {postTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedFilter(type.id)}
                    className={`flex flex-col items-center p-3 rounded-lg text-xs font-medium transition-colors ${
                      selectedFilter === type.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-lg mb-1">{type.icon}</span>
                    <span className="text-center leading-tight">{type.name}</span>
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
            {/* Most Engaged Artisans */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FireIcon className="w-5 h-5 mr-2 text-amber-600" />
                Most Engaged Artisans
              </h3>
              <div className="space-y-3">
                {leaderboard.length > 0 ? (
                  leaderboard.slice(0, 5).map((artisan, index) => (
                    <button
                      key={artisan._id}
                      onClick={() => {
                        // Navigate to artisan shop
                        navigate(`/artisan/${artisan._id}`);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-amber-50 transition-colors group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900 group-hover:text-amber-700 transition-colors truncate">
                              {artisan.artisanName}
                            </span>
                            {artisan.isVerified && (
                              <CheckCircleIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            <span className="capitalize">{artisan.type?.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">No engaged artisans yet</p>
                    <p className="text-xs text-gray-400 mt-1">Active artisans will appear here based on their community participation and business activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trending This Week */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FireIcon className="w-5 h-5 mr-2 text-red-600" />
                Trending This Week
              </h3>
              <div className="space-y-2">
                {trendingPosts.length > 0 ? (
                  trendingPosts.slice(0, 5).map((post, index) => (
                    <div key={post._id} className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-red-100 text-red-800' :
                          index === 1 ? 'bg-orange-100 text-orange-800' :
                          index === 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => scrollToPost(post._id)}
                            className="text-left group"
                          >
                            <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1 group-hover:text-red-700 transition-colors">
                              {post.title}
                            </h4>
                          </button>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-600">by</span>
                            <span className="text-xs font-medium text-amber-600">
                              {post.artisan?.artisanName || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No trending posts this week</p>
                    <p className="text-xs text-gray-400 mt-1">Posts with engagement will appear here</p>
                  </div>
                )}
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
                    <option value="recipe">Recipe</option>
                    <option value="tip">Tip & Trick</option>
                    <option value="question">Question</option>
                    <option value="product_showcase">Product Showcase</option>
                    <option value="event">Event</option>
                    <option value="poll">Poll</option>
                  </select>
        </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => {
                      // Smart capitalization: capitalize first letter of each word
                      // but preserve proper nouns and contractions
                      const smartCapitalize = (text) => {
                        return text.replace(/\b\w/g, (match, offset, string) => {
                          // Don't capitalize if it's after an apostrophe (like in "Farmer's")
                          if (offset > 0 && string[offset - 1] === "'") {
                            return match.toLowerCase();
                          }
                          return match.toUpperCase();
                        });
                      };
                      
                      const capitalizedTitle = smartCapitalize(e.target.value);
                      setNewPost({ ...newPost, title: capitalizedTitle });
                    }}
                    placeholder="What's your post about?"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
            </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Content *
                    </label>
                    <span className={`text-sm ${(newPost.content?.length || 0) > 180 ? 'text-red-500' : 'text-gray-500'}`}>
                      {newPost.content?.length || 0}/200
                    </span>
                  </div>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => {
                      // Limit content to 200 characters
                      const limitedContent = e.target.value.slice(0, 200);
                      setNewPost({ ...newPost, content: limitedContent });
                    }}
                    placeholder="Share your thoughts, tips, or experiences..."
                    rows="6"
                    maxLength={200}
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

                {/* Recipe Specific Fields */}
                {newPost.type === 'recipe' && (
                  <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
                    <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                      👨‍🍳 Recipe Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time</label>
                        <input
                          type="text"
                          value={newPost.recipe.prepTime}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            recipe: { ...newPost.recipe, prepTime: e.target.value }
                          })}
                          placeholder="15 mins"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time</label>
                        <input
                          type="text"
                          value={newPost.recipe.cookTime}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            recipe: { ...newPost.recipe, cookTime: e.target.value }
                          })}
                          placeholder="30 mins"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                        <input
                          type="text"
                          value={newPost.recipe.servings}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            recipe: { ...newPost.recipe, servings: e.target.value }
                          })}
                          placeholder="4 people"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                        <select
                          value={newPost.recipe.difficulty}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            recipe: { ...newPost.recipe, difficulty: e.target.value }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    {/* Ingredients */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">Ingredients</label>
                        <button
                          type="button"
                          onClick={addRecipeIngredient}
                          className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center"
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Add Ingredient
                        </button>
                      </div>
                      <div className="space-y-2">
                        {newPost.recipe.ingredients.map((ingredient, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={ingredient.amount}
                              onChange={(e) => updateRecipeIngredient(index, 'amount', e.target.value)}
                              placeholder="2 cups"
                              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                            />
                            <input
                              type="text"
                              value={ingredient.unit}
                              onChange={(e) => updateRecipeIngredient(index, 'unit', e.target.value)}
                              placeholder="flour"
                              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                            />
                            <input
                              type="text"
                              value={ingredient.name}
                              onChange={(e) => updateRecipeIngredient(index, 'name', e.target.value)}
                              placeholder="all-purpose flour"
                              className="flex-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeRecipeIngredient(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recipe Steps */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">Instructions</label>
                        <button
                          type="button"
                          onClick={addRecipeStep}
                          className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center"
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Add Step
                        </button>
                      </div>
                      <div className="space-y-3">
                        {newPost.recipe.steps.map((step, index) => (
                          <div key={index} className="flex gap-3 items-start">
                            <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <textarea
                              value={step.description}
                              onChange={(e) => updateRecipeStep(index, 'description', e.target.value)}
                              placeholder="Describe this step in detail..."
                              rows="2"
                              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeRecipeStep(index)}
                              className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Event Specific Fields */}
                {newPost.type === 'event' && (
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                      📅 Event Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                        <input
                          type="date"
                          value={newPost.event.date}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            event: { ...newPost.event, date: e.target.value }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Time</label>
                        <input
                          type="time"
                          value={newPost.event.time}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            event: { ...newPost.event, time: e.target.value }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={newPost.event.location}
                        onChange={(e) => setNewPost({
                          ...newPost,
                          event: { ...newPost.event, location: e.target.value }
                        })}
                        placeholder="123 Main St, City, State or Online Event Link"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
                        <input
                          type="number"
                          value={newPost.event.maxAttendees}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            event: { ...newPost.event, maxAttendees: e.target.value }
                          })}
                          placeholder="50"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Link (Optional)</label>
                        <input
                          type="url"
                          value={newPost.event.eventLink}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            event: { ...newPost.event, eventLink: e.target.value }
                          })}
                          placeholder="https://zoom.us/j/..."
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="rsvpRequired"
                        checked={newPost.event.rsvpRequired}
                        onChange={(e) => setNewPost({
                          ...newPost,
                          event: { ...newPost.event, rsvpRequired: e.target.checked }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="rsvpRequired" className="ml-2 block text-sm text-gray-700">
                        RSVP Required
                      </label>
                    </div>
                  </div>
                )}

                {/* Product Showcase Fields */}
                {newPost.type === 'product_showcase' && (
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                      🛍️ Product Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                        <input
                          type="text"
                          value={newPost.product.productName}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            product: { ...newPost.product, productName: e.target.value }
                          })}
                          placeholder="My Amazing Product"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                        <input
                          type="text"
                          value={newPost.product.productPrice}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            product: { ...newPost.product, productPrice: e.target.value }
                          })}
                          placeholder="$29.99"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Link</label>
                        <input
                          type="url"
                          value={newPost.product.productLink}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            product: { ...newPost.product, productLink: e.target.value }
                          })}
                          placeholder="https://yourshop.com/product/..."
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code (Optional)</label>
                        <input
                          type="text"
                          value={newPost.product.discountCode}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            product: { ...newPost.product, discountCode: e.target.value }
                          })}
                          placeholder="SAVE20"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Poll Fields */}
                {newPost.type === 'poll' && (
                  <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                      🗳️ Poll Details
                    </h3>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Poll Question</label>
                      <input
                        type="text"
                        value={newPost.poll.question}
                        onChange={(e) => setNewPost({
                          ...newPost,
                          poll: { ...newPost.poll, question: e.target.value }
                        })}
                        placeholder="What would you like to see next?"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">Poll Options</label>
                        <button
                          type="button"
                          onClick={addPollOption}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center"
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {newPost.poll.options.map((option, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updatePollOption(index, e.target.value)}
                              placeholder={`Option ${index + 1}`}
                              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                            />
                            {newPost.poll.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removePollOption(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Poll Expires</label>
                        <input
                          type="datetime-local"
                          value={newPost.poll.expiresAt}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            poll: { ...newPost.poll, expiresAt: e.target.value }
                          })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-center mt-6">
                        <input
                          type="checkbox"
                          id="allowMultipleVotes"
                          checked={newPost.poll.allowMultipleVotes}
                          onChange={(e) => setNewPost({
                            ...newPost,
                            poll: { ...newPost.poll, allowMultipleVotes: e.target.checked }
                          })}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="allowMultipleVotes" className="ml-2 block text-sm text-gray-700">
                          Allow Multiple Votes
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Media Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Images (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">Click to upload images or drag and drop</p>
                    <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      id="imageUpload"
                    />
                    <label
                      htmlFor="imageUpload"
                      className="mt-2 inline-block bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 cursor-pointer"
                    >
                      Choose Images
                    </label>
                  </div>
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