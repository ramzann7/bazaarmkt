import api from './apiClient';
import config from '../config/environment.js';

const API_BASE_URL = config.API_URL;

class CommunityService {
  constructor() {
    // Use the shared API client which already has auth interceptors configured
    this.baseURL = `${API_BASE_URL}/community`;
  }

  // Community Posts
  async getPosts(params = {}) {
    try {
      const response = await api.get(`${this.baseURL}/posts`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  async createPost(postData) {
    try {
      const response = await api.post(`${this.baseURL}/posts`, postData);
      return response.data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async updatePost(postId, postData) {
    try {
      const response = await api.put(`${this.baseURL}/posts/${postId}`, postData);
      return response.data;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  async deletePost(postId) {
    try {
      const response = await api.delete(`${this.baseURL}/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  async likePost(postId) {
    try {
      const response = await api.post(`${this.baseURL}/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }

  async unlikePost(postId) {
    try {
      const response = await api.delete(`${this.baseURL}/posts/${postId}/like`);
      return response.data;
    } catch (error) {
      console.error('Error unliking post:', error);
      throw error;
    }
  }

  // Comments
  async getComments(postId) {
    try {
      const response = await api.get(`${this.baseURL}/posts/${postId}/comments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }

  async createComment(postId, commentData) {
    try {
      const response = await api.post(`${this.baseURL}/posts/${postId}/comments`, commentData);
      return response.data;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async updateComment(commentId, commentData) {
    try {
      const response = await api.put(`${this.baseURL}/comments/${commentId}`, commentData);
      return response.data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId) {
    try {
      const response = await api.delete(`${this.baseURL}/comments/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  // Community Stats
  async getCommunityStats() {
    try {
      const response = await api.get(`${this.baseURL}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching community stats:', error);
      throw error;
    }
  }

  // Leaderboard
  async getLeaderboard() {
    try {
      const response = await api.get(`${this.baseURL}/leaderboard`);
      return response.data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  async getEngagementLeaderboard() {
    try {
      const response = await api.get(`${this.baseURL}/leaderboard/engagement`);
      return response.data;
    } catch (error) {
      console.error('Error fetching engagement leaderboard:', error);
      throw error;
    }
  }

  // Artisan Incentives
  async getArtisanIncentives() {
    try {
      const response = await api.get(`${this.baseURL}/incentives`);
      return response.data;
    } catch (error) {
      console.error('Error fetching artisan incentives:', error);
      throw error;
    }
  }

  async redeemReward(rewardId) {
    try {
      const response = await api.post(`${this.baseURL}/incentives/redeem`, { rewardId });
      return response.data;
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  }

  // Badges
  async getBadges() {
    try {
      const response = await api.get(`${this.baseURL}/badges`);
      return response.data;
    } catch (error) {
      console.error('Error fetching badges:', error);
      throw error;
    }
  }

  // Artisan Points
  async getArtisanPoints() {
    try {
      const response = await api.get(`${this.baseURL}/points`);
      return response.data;
    } catch (error) {
      console.error('Error fetching artisan points:', error);
      throw error;
    }
  }

  // RSVP Methods
  async rsvpToEvent(postId) {
    try {
      const response = await api.post(`${this.baseURL}/posts/${postId}/rsvp`);
      return response.data;
    } catch (error) {
      console.error('Error RSVPing to event:', error);
      throw error;
    }
  }

  async cancelRSVP(postId) {
    try {
      const response = await api.delete(`${this.baseURL}/posts/${postId}/rsvp`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling RSVP:', error);
      throw error;
    }
  }

  async getEventRSVPs(postId) {
    try {
      const response = await api.get(`${this.baseURL}/posts/${postId}/rsvps`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event RSVPs:', error);
      throw error;
    }
  }

  // Poll Methods
  async voteOnPoll(postId, optionIndex) {
    try {
      const response = await api.post(`${this.baseURL}/posts/${postId}/poll/vote`, { optionIndex });
      return response.data;
    } catch (error) {
      console.error('Error voting on poll:', error);
      throw error;
    }
  }

  async getPollResults(postId) {
    try {
      const response = await api.get(`${this.baseURL}/posts/${postId}/poll/results`);
      return response.data;
    } catch (error) {
      console.error('Error fetching poll results:', error);
      throw error;
    }
  }
}

export default new CommunityService();
