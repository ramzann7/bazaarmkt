const request = require('supertest');
const app = require('../../../server-refactored');

// Mock the service layer
jest.mock('../../../services', () => ({
  createCommunityService: jest.fn(() => Promise.resolve({
    getPosts: jest.fn(),
    createPost: jest.fn(),
    likePost: jest.fn(),
    getComments: jest.fn(),
    createComment: jest.fn(),
    getEngagementLeaderboard: jest.fn(),
    getCommunityStats: jest.fn()
  }))
}));

describe('Community Routes Integration Tests', () => {
  let mockService;

  beforeEach(() => {
    const { createCommunityService } = require('../../../services');
    mockService = {
      getPosts: jest.fn(),
      createPost: jest.fn(),
      likePost: jest.fn(),
      getComments: jest.fn(),
      createComment: jest.fn(),
      getEngagementLeaderboard: jest.fn(),
      getCommunityStats: jest.fn()
    };
    createCommunityService.mockResolvedValue(mockService);
    jest.clearAllMocks();
  });

  describe('GET /api/community/posts', () => {
    it('should get posts successfully', async () => {
      const mockPosts = [
        { _id: '1', title: 'Post 1', type: 'story' },
        { _id: '2', title: 'Post 2', type: 'recipe' }
      ];
      mockService.getPosts.mockResolvedValue({
        posts: mockPosts,
        count: 2
      });

      const response = await request(app)
        .get('/api/community/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPosts);
      expect(response.body.count).toBe(2);
      expect(mockService.getPosts).toHaveBeenCalledWith({
        type: undefined,
        category: undefined,
        limit: 20,
        offset: 0,
        populate: []
      });
    });

    it('should get posts with query parameters', async () => {
      const mockPosts = [{ _id: '1', title: 'Story Post', type: 'story' }];
      mockService.getPosts.mockResolvedValue({
        posts: mockPosts,
        count: 1
      });

      const response = await request(app)
        .get('/api/community/posts?type=story&limit=10&offset=5')
        .expect(200);

      expect(mockService.getPosts).toHaveBeenCalledWith({
        type: 'story',
        category: undefined,
        limit: 10,
        offset: 5,
        populate: []
      });
    });

    it('should handle service errors', async () => {
      mockService.getPosts.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/community/posts')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
    });
  });

  describe('POST /api/community/posts', () => {
    it('should create a post successfully', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content',
        type: 'story'
      };
      const mockCreatedPost = {
        _id: '507f1f77bcf86cd799439011',
        ...postData,
        author: '507f1f77bcf86cd799439012'
      };
      mockService.createPost.mockResolvedValue(mockCreatedPost);

      const response = await request(app)
        .post('/api/community/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCreatedPost);
      expect(mockService.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          ...postData,
          author: expect.any(String)
        })
      );
    });

    it('should require authentication', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content',
        type: 'story'
      };

      await request(app)
        .post('/api/community/posts')
        .send(postData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidPostData = {
        content: 'Test content'
        // missing title and type
      };

      const response = await request(app)
        .post('/api/community/posts')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidPostData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/community/posts/:id/like', () => {
    it('should like a post successfully', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';
      mockService.likePost.mockResolvedValue({
        success: true,
        message: 'Post liked successfully'
      });

      const response = await request(app)
        .post(`/api/community/posts/${postId}/like`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockService.likePost).toHaveBeenCalledWith(postId, userId);
    });

    it('should handle post not found', async () => {
      const postId = '507f1f77bcf86cd799439011';
      mockService.likePost.mockResolvedValue({
        success: false,
        message: 'Post not found'
      });

      const response = await request(app)
        .post(`/api/community/posts/${postId}/like`)
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('GET /api/community/posts/:id/comments', () => {
    it('should get comments for a post', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const mockComments = [
        { _id: '1', content: 'Comment 1', postId },
        { _id: '2', content: 'Comment 2', postId }
      ];
      mockService.getComments.mockResolvedValue(mockComments);

      const response = await request(app)
        .get(`/api/community/posts/${postId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockComments);
      expect(mockService.getComments).toHaveBeenCalledWith(postId);
    });
  });

  describe('POST /api/community/posts/:id/comments', () => {
    it('should create a comment successfully', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const commentData = {
        content: 'Test comment'
      };
      const mockCreatedComment = {
        _id: '507f1f77bcf86cd799439013',
        ...commentData,
        postId,
        author: '507f1f77bcf86cd799439012'
      };
      mockService.createComment.mockResolvedValue(mockCreatedComment);

      const response = await request(app)
        .post(`/api/community/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid-token')
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCreatedComment);
      expect(mockService.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          ...commentData,
          postId,
          author: expect.any(String)
        })
      );
    });
  });

  describe('GET /api/community/leaderboard', () => {
    it('should get engagement leaderboard', async () => {
      const mockLeaderboard = [
        { _id: 'user1', totalLikes: 100, totalComments: 50 },
        { _id: 'user2', totalLikes: 80, totalComments: 30 }
      ];
      mockService.getEngagementLeaderboard.mockResolvedValue(mockLeaderboard);

      const response = await request(app)
        .get('/api/community/leaderboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockLeaderboard);
      expect(mockService.getEngagementLeaderboard).toHaveBeenCalled();
    });
  });

  describe('GET /api/community/stats', () => {
    it('should get community statistics', async () => {
      const mockStats = {
        totalPosts: 100,
        totalComments: 500,
        totalLikes: 1000,
        activeUsers: 50
      };
      mockService.getCommunityStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/community/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(mockService.getCommunityStats).toHaveBeenCalled();
    });
  });
});
