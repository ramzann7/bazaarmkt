import api from './apiClient';
import config from '../config/environment.js';

const API_BASE_URL = config.API_URL;

class CommunityService {
  constructor() {
    this.api = api.create({
      baseURL: `${API_BASE_URL}/community`,
      withCredentials: true,
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Community Posts
  async getPosts(params = {}) {
    try {
      const response = await this.api.get('/posts', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  async createPost(postData) {
    try {
      const response = await this.api.post('/posts', postData);
      return response.data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async updatePost(postId, postData) {
    try {
      const response = await this.api.put(`/posts/${postId}`, postData);
      return response.data;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  async deletePost(postId) {
    try {
      const response = await this.api.delete(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  async likePost(postId) {
    try {
      const response = await this.api.post(`/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }

  async unlikePost(postId) {
    try {
      const response = await this.api.delete(`/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      console.error('Error unliking post:', error);
      throw error;
    }
  }

  // Comments
  async getComments(postId) {
    try {
      const response = await this.api.get(`/posts/${postId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  async createComment(postId, commentData) {
    try {
      const response = await this.api.post(`/posts/${postId}/comments`, commentData);
      return response.data;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async updateComment(commentId, commentData) {
    try {
      const response = await this.api.put(`/comments/${commentId}`, commentData);
      return response.data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId) {
    try {
      const response = await this.api.delete(`/comments/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  // Community Stats
  async getCommunityStats() {
    try {
      const response = await this.api.get('/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching community stats:', error);
      throw error;
    }
  }

  // Leaderboard
  async getLeaderboard() {
    try {
      const response = await this.api.get('/leaderboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  async getEngagementLeaderboard() {
    try {
      const response = await this.api.get('/leaderboard/engagement');
      return response.data;
    } catch (error) {
      console.error('Error fetching engagement leaderboard:', error);
      throw error;
    }
  }

  // Artisan Incentives
  async getArtisanIncentives() {
    try {
      const response = await this.api.get('/incentives');
      return response.data;
    } catch (error) {
      console.error('Error fetching artisan incentives:', error);
      throw error;
    }
  }

  async redeemReward(rewardId) {
    try {
      const response = await this.api.post('/incentives/redeem', { rewardId });
      return response.data;
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  }

  // Badges
  async getBadges() {
    try {
      const response = await this.api.get('/badges');
      return response.data;
    } catch (error) {
      console.error('Error fetching badges:', error);
      throw error;
    }
  }

  // Artisan Points
  async getArtisanPoints() {
    try {
      const response = await this.api.get('/points');
      return response.data;
    } catch (error) {
      console.error('Error fetching artisan points:', error);
      throw error;
    }
  }

  // RSVP Methods
  async rsvpToEvent(postId) {
    try {
      const response = await this.api.post(`/posts/${postId}/rsvp`);
      return response.data;
    } catch (error) {
      console.error('Error RSVPing to event:', error);
      throw error;
    }
  }

  async cancelRSVP(postId) {
    try {
      const response = await this.api.delete(`/posts/${postId}/rsvp`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling RSVP:', error);
      throw error;
    }
  }

  async getEventRSVPs(postId) {
    try {
      const response = await this.api.get(`/posts/${postId}/rsvps`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event RSVPs:', error);
      throw error;
    }
  }

  // Poll Methods
  async voteOnPoll(postId, optionIndex) {
    try {
      const response = await this.api.post(`/posts/${postId}/poll/vote`, { optionIndex });
      return response.data;
    } catch (error) {
      console.error('Error voting on poll:', error);
      throw error;
    }
  }

  async getPollResults(postId) {
    try {
      const response = await this.api.get(`/posts/${postId}/poll/results`);
      return response.data;
    } catch (error) {
      console.error('Error fetching poll results:', error);
      throw error;
    }
  }
}

export default new CommunityService();
