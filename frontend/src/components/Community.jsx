import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useAuth } from '../contexts/AuthContext';
import { getMyProducts } from '../services/productService';
import { cartService } from '../services/cartService';
import AuthPopup from './AuthPopup';

export default function Community() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showEditPost, setShowEditPost] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [myProducts, setMyProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
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
      productImage: ''
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
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authAction, setAuthAction] = useState('');

  const postTypes = [
    { id: 'all', name: t('community.allPosts'), icon: '📝' },
    { id: 'story', name: t('community.posts'), icon: '📖' },
    { id: 'recipe', name: 'Recipes', icon: '👨‍🍳' },
    { id: 'tip', name: 'Tips & Tricks', icon: '💡' },
    { id: 'question', name: 'Questions', icon: '❓' },
    { id: 'product_showcase', name: 'Product Showcase', icon: '🛍️' },
    { id: 'event', name: t('community.events'), icon: '📅' },
    { id: 'poll', name: 'Polls', icon: '🗳️' }
  ];

  // Content suggestions based on post type
  const getContentSuggestions = (type) => {
    const suggestions = {
      story: {
        placeholder: "Share your artisan journey, a special moment from your craft, or what inspires you...",
        tips: [
          "💡 Tell a personal story that connects with your customers",
          "✨ Share what makes your craft unique and special",
          "❤️ Let your passion and personality shine through"
        ]
      },
      recipe: {
        placeholder: "Share the story behind this recipe and what makes it special...",
        tips: [
          "👨‍🍳 Include why you love this recipe",
          "🌟 Mention any special techniques or ingredients",
          "📖 Share family traditions or cultural significance"
        ]
      },
      tip: {
        placeholder: "Share a helpful tip or professional trick from your craft...",
        tips: [
          "🎯 Keep it practical and actionable",
          "💪 Share techniques that took you years to perfect",
          "🔧 Include specific tools or methods you recommend"
        ]
      },
      question: {
        placeholder: "Ask your community a question about craft, business, or techniques...",
        tips: [
          "❓ Be specific about what you need help with",
          "🤝 Engage with responses and share your thoughts",
          "📚 Use this to learn from fellow artisans"
        ]
      },
      product_showcase: {
        placeholder: "Tell the story behind this product - how it's made, what makes it special, who would love it...",
        tips: [
          "🛍️ Share your creative process",
          "✨ Highlight unique features or materials",
          "👥 Describe your ideal customer for this product"
        ]
      },
      event: {
        placeholder: "Describe your event, what attendees can expect, and why they should join...",
        tips: [
          "📅 Mention what participants will learn or experience",
          "🎒 Include what to bring or prepare",
          "⭐ Share what makes this event special"
        ]
      },
      poll: {
        placeholder: "Context for your poll question...",
        tips: [
          "🗳️ Keep options clear and concise",
          "🎯 Make it relevant to your craft or community",
          "💬 Engage with voters in the comments"
        ]
      }
    };
    return suggestions[type] || suggestions.story;
  };


  useEffect(() => {
    loadLeaderboard();
  }, []);

  // Load products when user is an artisan and product showcase is selected
  useEffect(() => {
    if (user && user.role === 'artisan' && newPost.type === 'product_showcase' && showCreatePost) {
      console.log('🎯 Triggering product load - user is artisan, type is product_showcase, modal is open');
      loadMyProducts();
    }
  }, [user, newPost.type, showCreatePost]);

  // Debug: Log user state
  useEffect(() => {
    console.log('🔍 Community - User State:', {
      hasUser: !!user,
      isAuthenticated,
      userId: user?._id,
      userEmail: user?.email,
      userRole: user?.role
    });
  }, [user, isAuthenticated]);

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + imagePreviews.length > 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }
    
    // Validate file sizes
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per image.`);
        return false;
      }
      return true;
    });
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
        setImageFiles(prev => [...prev, file]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const removeImage = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Load user's products for product showcase
  const loadMyProducts = async () => {
    if (!user || user.role !== 'artisan') {
      console.log('❌ Cannot load products - user is not an artisan:', { hasUser: !!user, role: user?.role });
      return;
    }
    
    console.log('🔄 Loading products for artisan:', user._id);
    try {
      setLoadingProducts(true);
      const products = await getMyProducts();
      console.log('✅ Products loaded:', products.length, 'products');
      setMyProducts(products);
    } catch (error) {
      console.error('❌ Error loading products:', error);
      toast.error('Failed to load your products');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Handle product selection from dropdown
  const handleProductSelect = (productId) => {
    console.log('🛍️ Product selected:', productId);
    const selectedProduct = myProducts.find(p => p._id === productId);
    console.log('📦 Selected product details:', selectedProduct);
    
    if (selectedProduct) {
      const productData = {
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        productPrice: selectedProduct.price,
        productImage: selectedProduct.images?.[0] || selectedProduct.image || ''
      };
      console.log('✅ Setting product in newPost:', productData);
      
      setNewPost({
        ...newPost,
        product: productData
      });
    } else {
      console.log('❌ Product not found in myProducts array');
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await communityService.getPosts({
        type: selectedFilter === 'all' ? undefined : selectedFilter,
        limit: 6,
        populate: 'artisan,comments,likes'
      });
      if (response.success) {
        // Debug: Check product showcase posts
        const productPosts = response.data.filter(p => p.type === 'product_showcase');
        if (productPosts.length > 0) {
          console.log('🛍️ Product showcase posts:', productPosts.length);
          console.log('📦 First product post:', {
            hasProduct: !!productPosts[0].product,
            productId: productPosts[0].product?.productId,
            productName: productPosts[0].product?.productName,
            productKeys: Object.keys(productPosts[0].product || {})
          });
        }
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

  const showLoginPrompt = (action) => {
    const actionText = action === 'like' ? 'like posts' : 'comment on posts';
    setAuthAction(actionText);
    setShowAuthPopup(true);
  };

  const handleLikePost = async (postId) => {
    // Check if user is logged in
    if (!user) {
      console.log('❌ Cannot like post - user not logged in');
      showLoginPrompt('like');
      return;
    }

    console.log('👍 Attempting to like post:', postId, 'User:', user._id);

    try {
      const response = await communityService.likePost(postId);
      console.log('✅ Like response:', response);
      
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
      console.error('❌ Error liking post:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to like post');
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
      // Include images from imagePreviews in the post data
      const postData = {
        ...newPost,
        images: imagePreviews // Add the image previews (base64) to the post
      };
      
      const response = await communityService.createPost(postData);
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
            productImage: ''
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
        // Clear image previews after successful post
        setImagePreviews([]);
        setImageFiles([]);
        setShowCreatePost(false);
        toast.success('Post created successfully!');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const handleEditPostOpen = (post) => {
    setEditingPost(post);
    setNewPost({
      title: post.title || '',
      content: post.content || '',
      type: post.type || 'story',
      category: post.category || 'general',
      tags: post.tags || [],
      images: post.images || [],
      recipe: post.recipe || {
        ingredients: [],
        steps: [],
        prepTime: '',
        cookTime: '',
        servings: '',
        difficulty: 'easy'
      },
      event: post.event || {
        date: '',
        time: '',
        location: '',
        maxAttendees: '',
        rsvpRequired: false,
        eventLink: ''
      },
      product: post.product || {
        productId: '',
        productName: '',
        productPrice: '',
        productLink: '',
        discountCode: ''
      },
      poll: post.poll || {
        question: '',
        options: ['', ''],
        expiresAt: '',
        allowMultipleVotes: false
      },
      taggedArtisans: post.taggedArtisans || [],
      taggedProducts: post.taggedProducts || []
    });
    setShowEditPost(true);
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    try {
      const response = await communityService.updatePost(editingPost._id, newPost);
      if (response.success) {
        setPosts(posts.map(post => 
          post._id === editingPost._id ? response.data : post
        ));
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
            productImage: ''
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
        setShowEditPost(false);
        setEditingPost(null);
        toast.success('Post updated successfully!');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const response = await communityService.deletePost(postId);
      if (response.success) {
        setPosts(posts.filter(post => post._id !== postId));
        toast.success('Post deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleAddComment = async (postId) => {
    // Check if user is logged in
    if (!user) {
      console.log('❌ Cannot add comment - user not logged in');
      showLoginPrompt('comment');
      return;
    }

    if (!newComment[postId]?.trim()) {
      console.log('❌ Cannot add comment - empty content');
      return;
    }
    
    console.log('💬 Attempting to add comment to post:', postId, 'User:', user._id);
    
    try {
      const response = await communityService.createComment(postId, {
        content: newComment[postId]
      });
      console.log('✅ Comment response:', response);
      
      if (response.success) {
        const updatedPosts = posts.map(post => 
          post._id === postId 
            ? { ...post, comments: [...(post.comments || []), response.data], commentCount: (post.commentCount || 0) + 1 }
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
      console.error('❌ Error adding comment:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to add comment');
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

  const handleCopyLink = async (post) => {
    try {
      const postUrl = `${window.location.origin}/community/post/${post._id}`;
      const artisanName = post.artisan?.artisanName || 'A local artisan';
      
      // Get post type icon and display name
      const typeInfo = {
        story: { icon: '📖', name: 'Story' },
        recipe: { icon: '👨‍🍳', name: 'Recipe' },
        tip: { icon: '💡', name: 'Tip & Trick' },
        question: { icon: '❓', name: 'Question' },
        product_showcase: { icon: '🛍️', name: 'Product Showcase' },
        event: { icon: '📅', name: 'Event' },
        poll: { icon: '🗳️', name: 'Poll' }
      };
      const type = typeInfo[post.type] || { icon: '📝', name: 'Post' };
      
      // Build type-specific details
      let typeSpecificDetails = [];
      
      // EVENT-SPECIFIC DETAILS
      if (post.type === 'event' && post.event) {
        typeSpecificDetails.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        typeSpecificDetails.push('📅 EVENT DETAILS:');
        
        if (post.event.date) {
          const eventDate = new Date(post.event.date);
          const formattedDate = eventDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          typeSpecificDetails.push(`📆 Date: ${formattedDate}`);
        }
        
        if (post.event.time) {
          typeSpecificDetails.push(`🕐 Time: ${post.event.time}`);
        }
        
        if (post.event.location) {
          typeSpecificDetails.push(`📍 Location: ${post.event.location}`);
        }
        
        if (post.event.maxAttendees) {
          const attendees = post.rsvpCount || 0;
          const spots = post.event.maxAttendees - attendees;
          typeSpecificDetails.push(`👥 Capacity: ${attendees}/${post.event.maxAttendees} (${spots} spots left)`);
        }
        
        if (post.event.rsvpRequired) {
          typeSpecificDetails.push(`✅ RSVP Required`);
        }
        
        typeSpecificDetails.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
      
      // RECIPE-SPECIFIC DETAILS
      if (post.type === 'recipe' && post.recipe) {
        typeSpecificDetails.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        typeSpecificDetails.push('👨‍🍳 RECIPE INFO:');
        
        if (post.recipe.prepTime) {
          typeSpecificDetails.push(`⏱️ Prep Time: ${post.recipe.prepTime}`);
        }
        
        if (post.recipe.cookTime) {
          typeSpecificDetails.push(`🔥 Cook Time: ${post.recipe.cookTime}`);
        }
        
        if (post.recipe.servings) {
          typeSpecificDetails.push(`🍽️ Servings: ${post.recipe.servings}`);
        }
        
        if (post.recipe.difficulty) {
          const difficultyEmoji = {
            easy: '⭐',
            medium: '⭐⭐',
            hard: '⭐⭐⭐'
          };
          typeSpecificDetails.push(`${difficultyEmoji[post.recipe.difficulty] || '⭐'} Difficulty: ${post.recipe.difficulty.charAt(0).toUpperCase() + post.recipe.difficulty.slice(1)}`);
        }
        
        typeSpecificDetails.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
      
      // PRODUCT SHOWCASE-SPECIFIC DETAILS
      if (post.type === 'product_showcase' && post.product) {
        typeSpecificDetails.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        typeSpecificDetails.push('🛍️ PRODUCT INFO:');
        
        if (post.product.productName) {
          typeSpecificDetails.push(`📦 Product: ${post.product.productName}`);
        }
        
        if (post.product.productPrice) {
          typeSpecificDetails.push(`💰 Price: $${post.product.productPrice}`);
        }
        
        typeSpecificDetails.push('🛒 Click the product card to add to cart!');
        typeSpecificDetails.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
      
      // POLL-SPECIFIC DETAILS
      if (post.type === 'poll' && post.poll) {
        typeSpecificDetails.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        typeSpecificDetails.push('🗳️ POLL QUESTION:');
        
        if (post.poll.question) {
          typeSpecificDetails.push(`${post.poll.question}`);
        }
        
        if (post.poll.options && post.poll.options.length > 0) {
          typeSpecificDetails.push('');
          typeSpecificDetails.push('Options:');
          post.poll.options.forEach((option, idx) => {
            const votes = option.votes || 0;
            typeSpecificDetails.push(`${idx + 1}. ${option.text} (${votes} votes)`);
          });
        }
        
        if (post.poll.expiresAt) {
          const expiryDate = new Date(post.poll.expiresAt);
          const formattedExpiry = expiryDate.toLocaleDateString('en-US');
          typeSpecificDetails.push(`⏰ Expires: ${formattedExpiry}`);
        }
        
        typeSpecificDetails.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
      
      // Format content preview (first 200 chars)
      const contentPreview = post.content?.substring(0, 200) + 
        (post.content?.length > 200 ? '...' : '');
      
      // Build formatted share text with type-specific sections
      const formattedText = [
        `${type.icon} ${post.title}`,
        '',
        `By ${artisanName}`,
        `Type: ${type.name}`,
        '',
        ...typeSpecificDetails,
        '',
        contentPreview || '',
        '',
        `👉 View full ${type.name.toLowerCase()} on BazaarMKT:`,
        postUrl,
        '',
        '#BazaarMKT #LocalArtisans #SupportLocal #HandmadeGoods'
      ].filter(line => line !== '').join('\n');
      
      await navigator.clipboard.writeText(formattedText);
      
      toast.success(`✅ ${type.name} copied to clipboard!`, {
        description: 'Share it anywhere - WhatsApp, email, social media, etc.',
        duration: 4000
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  const renderPost = (post) => (
    <div id={`post-${post._id}`} key={post._id} className="bg-card rounded-xl shadow-soft border border-gray-100/30 overflow-hidden mb-4 sm:mb-6">
      {/* Post Header - Mobile Optimized */}
      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-orange-400 to-amber-500">
          {(post.authorData?.profilePicture || post.artisan?.userInfo?.profilePicture || post.artisan?.profileImage || post.artisan?.businessImage) ? (
            <img 
              src={post.authorData?.profilePicture || post.artisan?.userInfo?.profilePicture || post.artisan?.profileImage || post.artisan?.businessImage} 
              alt={post.artisan?.artisanName || `${post.authorData?.firstName} ${post.authorData?.lastName}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                const initials = post.artisan?.artisanName?.charAt(0) || post.authorData?.firstName?.charAt(0) || 'A';
                e.target.parentElement.innerHTML = `<span class="text-white font-bold text-sm">${initials}</span>`;
              }}
            />
          ) : (
            <span className="text-white font-bold text-sm">
              {post.artisan?.artisanName?.charAt(0) || post.authorData?.firstName?.charAt(0) || 'A'}
            </span>
          )}
        </div>
        <div>
          <div className="font-semibold text-text">
            {post.artisan?.artisanName || 
             post.artisanData?.artisanName || 
             (post.authorData?.firstName && post.authorData?.lastName 
               ? `${post.authorData.firstName} ${post.authorData.lastName}` 
               : 'Community Member')}
          </div>
          <div className="text-sm text-muted">
            {formatTimeAgo(post.createdAt)} • {post.type.replace('_', ' ')}
          </div>
        </div>
      </div>
      
      
      {/* Post Title - Mobile Optimized */}
      <h2 className="text-lg sm:text-xl font-semibold text-text px-3 sm:px-4 mt-3 sm:mt-4 mb-2">{post.title}</h2>
      
      {/* Post Content - Mobile Optimized */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <p className="text-sm sm:text-base text-muted leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>
      
      {/* Product Card - Compact, After Content */}
      {post.type === 'product_showcase' && post.product && (post.product.productId || post.product.productName) && (
        <div className="mx-3 sm:mx-4 mb-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-3 flex items-center gap-3">
            {post.product.productImage && (
              <img 
                src={post.product.productImage} 
                alt={post.product.productName}
                className="w-14 h-14 object-cover rounded flex-shrink-0 opacity-90"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm line-clamp-1">{post.product.productName}</p>
              <p className="text-green-700 font-bold text-lg">${post.product.productPrice}</p>
            </div>
            
            <button
              onClick={async () => {
                if (!user) {
                  toast.error('Please log in to add items to cart');
                  navigate('/login');
                  return;
                }
                
                try {
                  const productToAdd = {
                    _id: post.product.productId,
                    name: post.product.productName,
                    price: post.product.productPrice,
                    image: post.product.productImage,
                    images: [post.product.productImage],
                    artisan: {
                      _id: post.artisan?._id || post.artisan,
                      artisanName: post.artisan?.artisanName || 'Shop'
                    }
                  };
                  
                  console.log('🛒 Adding product to cart:', productToAdd);
                  await cartService.addToCart(productToAdd, 1, user._id);
                  toast.success(`Added to cart!`);
                } catch (error) {
                  console.error('❌ Error adding to cart:', error);
                  toast.error(error.message || 'Failed to add to cart');
                }
              }}
              className="flex-shrink-0 inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-xs font-medium"
            >
              <ShoppingCartIcon className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}
        
      <div className="px-3 sm:px-4">
        {/* Event Details */}
        {post.type === 'event' && post.event && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <CalendarDaysIcon className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">
                    {new Date(post.event.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-orange-700">{post.event.time}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPinIcon className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Location</p>
                  <p className="text-sm text-orange-700">{post.event.location}</p>
                </div>
              </div>
              
              {post.event.eventLink && (
                <div className="flex items-center space-x-2 md:col-span-2">
                  <LinkIcon className="w-5 h-5 text-orange-600" />
                  <a 
                    href={post.event.eventLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-orange-700 hover:text-orange-900 underline font-medium"
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
          <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-primary-dark">Prep Time</p>
                  <p className="font-medium text-amber-900">{post.recipe.prepTime || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-primary-dark">Cook Time</p>
                  <p className="font-medium text-amber-900">{post.recipe.cookTime || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-primary-dark">Servings</p>
                  <p className="font-medium text-amber-900">{post.recipe.servings || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <FireIcon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-primary-dark">Difficulty</p>
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
                      <span className="text-primary">•</span>
                      <span className="text-primary-800">
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
                      <div className="w-6 h-6 bg-primary-100 text-primary-dark rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-primary-800 text-sm">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


        {/* Poll Details */}
        {post.type === 'poll' && post.poll && (
          <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <div className="mb-4">
              <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <span>🗳️</span>
                {post.poll.question}
              </h4>
              
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
                              ? 'border-orange-500 bg-orange-100 cursor-default' 
                              : (post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date())
                              ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                              : 'border-primary-200 bg-white hover:border-orange-300 hover:bg-orange-50 cursor-pointer'
                          }`}
                        >
                          <span className={`font-medium text-left ${
                            userVoted ? 'text-orange-900' : 'text-primary-800'
                          }`}>
                            {option}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-orange-600 font-medium">
                              {voteCount} vote{voteCount !== 1 ? 's' : ''}
                            </span>
                            {userVoted && (
                              <CheckCircleIcon className="w-5 h-5 text-orange-600" />
                            )}
                          </div>
                        </button>
                        {totalVotes > 0 && (
                          <div className="mt-1 bg-orange-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-sm text-primary-dark">
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

      {/* Post Images - Subtle Grid (Hidden for Product Showcase) */}
      {post.type !== 'product_showcase' && post.images && post.images.length > 0 && (
        <div className="mb-4 px-3 sm:px-4">
          <div className="grid grid-cols-2 gap-2">
            {post.images.slice(0, 4).map((image, index) => (
              <img
                key={index}
                src={image.url || image}
                alt={image.alt || `Post image ${index + 1}`}
                className="w-full h-24 sm:h-32 object-cover rounded-md opacity-85 hover:opacity-100 transition-opacity"
              />
            ))}
          </div>
          {post.images.length > 4 && (
            <p className="text-xs text-gray-500 mt-1 text-center">+{post.images.length - 4} more images</p>
          )}
        </div>
      )}

      {/* Post Tags */}
      {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, index) => (
            <span key={index} className="bg-primary-100 text-primary-800 text-sm px-3 py-1 rounded-full">
              #{tag}
              </span>
            ))}
          </div>
      )}

      {/* Post Footer - Mobile Optimized */}
      <div className="flex items-center gap-3 sm:gap-6 px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-100/50 text-muted flex-wrap">
        <button
          onClick={() => handleLikePost(post._id)}
          className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors min-h-[44px] px-2 -mx-2 ${
            post.isLiked ? 'text-red-500' : 'text-muted hover:text-red-500'
          }`}
        >
          <span className="text-base">{post.isLiked ? '❤️' : '🤍'}</span>
          <span>{post.likeCount || 0}</span>
        </button>
        
        <button
          onClick={() => toggleComments(post._id)}
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted hover:text-accent transition-colors min-h-[44px] px-2 -mx-2"
        >
          <span className="text-base">💬</span>
          {post.comments?.length > 0 && <span>{post.comments.length}</span>}
        </button>
        
        <button
          onClick={() => handleCopyLink(post)}
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted hover:text-accent transition-colors min-h-[44px] px-2 -mx-2"
          title="Copy formatted post link"
        >
          <span className="text-base">🔗</span>
          <span className="hidden sm:inline">Share</span>
        </button>
        
        <button className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted hover:text-accent transition-colors min-h-[44px] px-2 -mx-2">
          <span className="text-base">📌</span>
          <span className="hidden sm:inline">Save</span>
        </button>
          
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
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
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
      
      {/* Comments Section */}
      {expandedComments[post._id] && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {/* Existing Comments - Show First */}
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-4 mb-4">
              {post.comments.map((comment) => (
                <div key={comment._id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-orange-400 to-amber-500 ring-2 ring-orange-100">
                    {(comment.author?.profilePicture || comment.artisan?.userInfo?.profilePicture || comment.artisan?.profileImage || comment.artisan?.businessImage) ? (
                      <img 
                        src={comment.author?.profilePicture || comment.artisan?.userInfo?.profilePicture || comment.artisan?.profileImage || comment.artisan?.businessImage} 
                        alt={comment.author?.firstName || comment.artisan?.artisanName || 'User'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `<span class="text-white font-bold text-sm">${comment.author?.firstName?.charAt(0) || comment.artisan?.artisanName?.charAt(0) || 'U'}</span>`;
                        }}
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {comment.author?.firstName?.charAt(0) || comment.artisan?.artisanName?.charAt(0) || 'U'}
                      </span>
                    )}
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
          
          {/* Add New Comment - Show After Existing Comments */}
          {user && (
            <div className="flex items-start space-x-3 pt-4 border-t border-gray-100">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-orange-500 rounded-full flex items-center justify-center overflow-hidden">
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<span class="text-white font-bold text-sm">${user.firstName?.charAt(0) || 'U'}</span>`;
                    }}
                  />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {user.firstName?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment[post._id] || ''}
                  onChange={(e) => setNewComment({ ...newComment, [post._id]: e.target.value })}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                  rows="2"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleAddComment(post._id)}
                    disabled={!newComment[post._id]?.trim()}
                    className="bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Comment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    );

  return (
    <div className="min-h-screen bg-background">

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Filter Tabs - Mobile Optimized */}
            <div className="sticky top-2 sm:top-4 bg-transparent py-2 sm:py-3 z-10 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 bg-white/85 backdrop-blur-sm p-2 sm:p-2.5 rounded-xl shadow-sm border border-gray-100/30">
                {/* Category Filters - Horizontal Scroll with Gradient Hints */}
                <div className="relative flex-1 min-w-0">
                  {/* Left gradient */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/85 to-transparent z-10 pointer-events-none" />
                  {/* Right gradient */}
                  <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white/85 to-transparent z-10 pointer-events-none" />
                  
                  <div className="flex gap-1.5 sm:gap-2 items-center overflow-x-auto scrollbar-hide scroll-smooth">
                    {postTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedFilter(type.id)}
                        className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 min-h-[36px] sm:min-h-[40px] ${
                          selectedFilter === type.id
                            ? 'bg-accent text-white border-transparent'
                            : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        {type.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create Post Button - Mobile Optimized */}
                {user && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowCreatePost(true)}
                      className="bg-accent text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center gap-1.5 sm:gap-2 min-h-[36px] sm:min-h-[40px]"
                    >
                      <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Create Post</span>
                      <span className="sm:hidden">Post</span>
                    </button>
                  </div>
                )}
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
              <div className="bg-card rounded-xl shadow-soft border border-gray-100/30 p-12 text-center">
                <UserGroupIcon className="w-16 h-16 text-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-text mb-2">
                  {selectedFilter === 'all' ? 'No posts yet' : `No ${postTypes.find(t => t.id === selectedFilter)?.name || 'posts'} yet`}
                </h3>
                <p className="text-muted mb-6">
                  {selectedFilter === 'all' 
                    ? 'Be the first to share something with the community!'
                    : `No ${postTypes.find(t => t.id === selectedFilter)?.name?.toLowerCase() || 'posts'} have been shared yet.`
                  }
                </p>
                {user && (
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="bg-accent text-white px-6 py-3 rounded-lg hover:bg-accent/90 transition-colors font-medium"
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
                <FireIcon className="w-5 h-5 mr-2 text-primary" />
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
                      className="w-full text-left p-2 rounded-lg hover:bg-primary-50 transition-colors group"
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
                            <span className="font-medium text-gray-900 group-hover:text-primary-dark transition-colors truncate">
                              {artisan.artisanName}
                            </span>
                            {artisan.status?.isVerified && (
                              <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            <span className="capitalize">{artisan.type?.replace('_', ' ')}</span>
                          </div>
                          {artisan.engagementScore > 0 && (
                            <div className="flex items-center space-x-2 text-xs">
                              <div className="flex items-center space-x-1 text-primary">
                                <FireIcon className="w-3 h-3" />
                                <span className="font-semibold">{artisan.engagementScore}</span>
                              </div>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">{artisan.postsCount} posts</span>
                            </div>
                          )}
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
                            <span className="text-xs font-medium text-accent">
                              {post.artisan?.artisanName || 
                               post.artisanData?.artisanName ||
                               'Community Member'}
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

      {/* Create Post Modal - Enhanced */}
      {(showCreatePost || showEditPost) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-amber-500 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{showEditPost ? 'Edit Post' : 'Share with Community'}</h2>
                  <p className="text-orange-100 text-sm mt-1">
                    {getContentSuggestions(newPost.type).tips[0]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePost(false);
                    setShowEditPost(false);
                    setEditingPost(null);
                    setImageFiles([]);
                    setImagePreviews([]);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
        </div>
            
            <div className="p-6">

              <form onSubmit={showEditPost ? handleUpdatePost : handleCreatePost} className="space-y-6">
                {/* Post Type Selector - Card Style */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    What would you like to share?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {postTypes.filter(t => t.id !== 'all').map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setNewPost({ ...newPost, type: type.id });
                          // Trigger product load if switching to product showcase
                          if (type.id === 'product_showcase' && user?.role === 'artisan') {
                            console.log('📦 Product showcase selected - loading products');
                            setTimeout(() => loadMyProducts(), 100);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          newPost.type === type.id
                            ? 'border-orange-500 bg-orange-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        <div className="text-3xl mb-2">{type.icon}</div>
                        <div className="text-sm font-medium text-gray-900">{type.name}</div>
                      </button>
                    ))}
                  </div>
        </div>
        
                {/* Product Selection - Show First for Product Showcase */}
                {newPost.type === 'product_showcase' && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-base font-semibold text-green-800 mb-3 flex items-center">
                      🛍️ Select Your Product
                    </h3>
                    
                    {loadingProducts ? (
                      <div className="text-sm text-gray-600 p-3 bg-white rounded border">Loading your products...</div>
                    ) : myProducts.length > 0 ? (
                      <div>
                        <select
                          value={newPost.product.productId}
                          onChange={(e) => handleProductSelect(e.target.value)}
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-gray-900"
                          required
                        >
                          <option value="">-- Select a product to showcase --</option>
                          {myProducts.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name} - ${product.price}
                            </option>
                          ))}
                        </select>
                        
                        {newPost.product.productId && (
                          <div className="mt-3 p-2 bg-white rounded border border-gray-200 flex items-center space-x-2">
                            {newPost.product.productImage && (
                              <img 
                                src={newPost.product.productImage} 
                                alt={newPost.product.productName}
                                className="w-10 h-10 object-cover rounded opacity-85"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-xs truncate">{newPost.product.productName}</p>
                              <p className="text-green-700 font-bold text-xs">${newPost.product.productPrice}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="mb-2 text-xs">📦 You don't have any products in your shop yet.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreatePost(false);
                            navigate('/my-products');
                          }}
                          className="text-green-700 text-xs font-medium hover:underline"
                        >
                          → Add products to your shop first
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Contextual Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-2">Tips for a great {newPost.type.replace('_', ' ')} post:</h4>
                      <ul className="space-y-1 text-sm text-blue-800">
                        {getContentSuggestions(newPost.type).tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Post Title *
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder={`e.g., "My Journey to Becoming a Baker" or "3 Tips for Perfect Sourdough"`}
                    className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    required
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">{newPost.title.length}/100 characters</p>
            </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Your Content *
                    </label>
                    <span className={`text-sm font-medium ${(newPost.content?.length || 0) > 450 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {newPost.content?.length || 0}/500
                    </span>
                  </div>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => {
                      const limitedContent = e.target.value.slice(0, 500);
                      setNewPost({ ...newPost, content: limitedContent });
                    }}
                    placeholder={getContentSuggestions(newPost.type).placeholder}
                    rows="8"
                    maxLength={500}
                    className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-all"
                    required
                  />
          </div>

                {/* Image Upload Section - Hide for Product Showcase */}
                {newPost.type !== 'product_showcase' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Add Images (Optional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-orange-400 transition-colors">
                      <input
                        type="file"
                        id="post-images"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="post-images"
                        className="cursor-pointer block text-center"
                      >
                        <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 5MB (max 4 images)
                        </p>
                      </label>
                    </div>
                    
                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recipe Specific Fields */}
                {newPost.type === 'recipe' && (
                  <div className="bg-primary-50 p-6 rounded-lg border border-primary-200">
                    <h3 className="text-lg font-semibold text-primary-800 mb-4 flex items-center">
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
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
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
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
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
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
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
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
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
                          className="text-primary hover:text-primary-dark text-sm font-medium flex items-center"
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
                              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
                            />
                            <input
                              type="text"
                              value={ingredient.unit}
                              onChange={(e) => updateRecipeIngredient(index, 'unit', e.target.value)}
                              placeholder="flour"
                              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
                            />
                            <input
                              type="text"
                              value={ingredient.name}
                              onChange={(e) => updateRecipeIngredient(index, 'name', e.target.value)}
                              placeholder="all-purpose flour"
                              className="flex-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
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
                          className="text-primary hover:text-primary-dark text-sm font-medium flex items-center"
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Add Step
                        </button>
                      </div>
                      <div className="space-y-3">
                        {newPost.recipe.steps.map((step, index) => (
                          <div key={index} className="flex gap-3 items-start">
                            <div className="w-8 h-8 bg-primary-100 text-primary-dark rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <textarea
                              value={step.description}
                              onChange={(e) => updateRecipeStep(index, 'description', e.target.value)}
                              placeholder="Describe this step in detail..."
                              rows="2"
                              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary resize-none"
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
                  <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
                      <CalendarDaysIcon className="w-5 h-5" />
                      Event Details
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
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="rsvpRequired" className="ml-2 block text-sm text-gray-700">
                        RSVP Required
                      </label>
                    </div>
                  </div>
                )}

                {/* Poll Fields */}
                {newPost.type === 'poll' && (
                  <div className="bg-primary-50 p-6 rounded-lg border border-primary-200">
                    <h3 className="text-lg font-semibold text-primary-800 mb-4 flex items-center gap-2">
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
                          className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center"
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
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <label htmlFor="allowMultipleVotes" className="ml-2 block text-sm text-gray-700">
                          Allow Multiple Votes
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreatePost(false);
                      setShowEditPost(false);
                      setEditingPost(null);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
                  >
                    {showEditPost ? 'Update Post' : 'Create Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Authentication Popup */}
      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        action={authAction}
      />

    </div>
  );
}