const CommunityService = require('../../../services/CommunityService');

// Mock database
const mockDb = {
  collection: jest.fn(() => ({
    find: jest.fn(() => ({
      toArray: jest.fn(),
      count: jest.fn()
    })),
    findOne: jest.fn(),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(() => ({
      toArray: jest.fn()
    })),
    distinct: jest.fn()
  }))
};

describe('CommunityService', () => {
  let service;

  beforeEach(() => {
    service = new CommunityService(mockDb);
    jest.clearAllMocks();
  });

  describe('getPosts', () => {
    it('should get posts with default parameters', async () => {
      const mockPosts = [
        { _id: '1', title: 'Post 1', type: 'story' },
        { _id: '2', title: 'Post 2', type: 'recipe' }
      ];
      const mockCollection = {
        aggregate: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue(mockPosts)
        })),
        countDocuments: jest.fn().mockResolvedValue(2)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.getPosts({});

      expect(mockDb.collection).toHaveBeenCalledWith('community_posts');
      expect(result.posts).toBe(mockPosts);
      expect(result.count).toBe(2);
    });

    it('should filter posts by type', async () => {
      const mockPosts = [{ _id: '1', title: 'Story Post', type: 'story' }];
      const mockCollection = {
        aggregate: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue(mockPosts)
        })),
        countDocuments: jest.fn().mockResolvedValue(1)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      await service.getPosts({ type: 'story' });

      expect(mockCollection.aggregate).toHaveBeenCalled();
    });

    it('should apply limit and offset', async () => {
      const mockCollection = {
        aggregate: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue([])
        })),
        countDocuments: jest.fn().mockResolvedValue(0)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      await service.getPosts({ limit: 10, offset: 20 });

      expect(mockCollection.aggregate).toHaveBeenCalled();
    });
  });

  describe('createPost', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content',
        type: 'story',
        author: '507f1f77bcf86cd799439011'
      };
      const mockResult = { insertedId: '507f1f77bcf86cd799439012' };
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue(mockResult)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.createPost(postData);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          ...postData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          likes: 0,
          comments: 0,
          views: 0
        })
      );
      expect(result).toEqual({
        _id: mockResult.insertedId,
        ...postData
      });
    });
  });

  describe('likePost', () => {
    it('should like a post', async () => {
      const mockPost = { _id: '507f1f77bcf86cd799439011', likes: 0 };
      const mockResult = { matchedCount: 1 };
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockPost),
        updateOne: jest.fn().mockResolvedValue(mockResult)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.likePost('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        {
          $inc: { likes: 1 },
          $addToSet: { likedBy: expect.any(Object) },
          $set: { updatedAt: expect.any(Date) }
        }
      );
      expect(result.success).toBe(true);
    });

    it('should handle post not found', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.likePost('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Post not found');
    });
  });

  describe('getComments', () => {
    it('should get comments for a post', async () => {
      const mockComments = [
        { _id: '1', content: 'Comment 1', postId: '507f1f77bcf86cd799439011' },
        { _id: '2', content: 'Comment 2', postId: '507f1f77bcf86cd799439011' }
      ];
      const mockCollection = {
        aggregate: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue(mockComments)
        }))
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.getComments('507f1f77bcf86cd799439011');

      expect(mockDb.collection).toHaveBeenCalledWith('community_comments');
      expect(mockCollection.aggregate).toHaveBeenCalled();
      expect(result).toBe(mockComments);
    });
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      const commentData = {
        content: 'Test comment',
        postId: '507f1f77bcf86cd799439011',
        author: '507f1f77bcf86cd799439012'
      };
      const mockResult = { insertedId: '507f1f77bcf86cd799439013' };
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue(mockResult)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.createComment('507f1f77bcf86cd799439011', 'Test comment', '507f1f77bcf86cd799439012');

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Test comment',
          postId: expect.any(Object),
          author: expect.any(Object),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      );
      expect(result).toEqual({
        _id: mockResult.insertedId,
        content: 'Test comment',
        postId: expect.any(Object),
        author: expect.any(Object)
      });
    });
  });

  describe('getEngagementLeaderboard', () => {
    it('should get engagement leaderboard', async () => {
      const mockLeaderboard = [
        { _id: 'user1', totalLikes: 100, totalComments: 50, totalPosts: 10 },
        { _id: 'user2', totalLikes: 80, totalComments: 30, totalPosts: 8 }
      ];
      const mockCollection = {
        aggregate: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue(mockLeaderboard)
        }))
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.getEngagementLeaderboard();

      expect(mockDb.collection).toHaveBeenCalledWith('artisans');
      expect(mockCollection.aggregate).toHaveBeenCalled();
      expect(result).toBe(mockLeaderboard);
    });
  });

  describe('getCommunityStats', () => {
    it('should get community statistics', async () => {
      const mockStats = {
        totalPosts: 100,
        totalComments: 500,
        totalLikes: 1000,
        activeUsers: 50
      };
      
      // Mock multiple collection calls
      const mockCollection = {
        countDocuments: jest.fn(),
        distinct: jest.fn().mockResolvedValue(['user1', 'user2', 'user3'])
      };
      mockDb.collection.mockReturnValue(mockCollection);
      
      // Mock different return values for different calls
      mockCollection.countDocuments
        .mockResolvedValueOnce(100) // totalPosts
        .mockResolvedValueOnce(500) // totalComments
        .mockResolvedValueOnce(1000); // totalLikes

      const result = await service.getCommunityStats();

      expect(mockDb.collection).toHaveBeenCalledWith('community_posts');
      expect(mockDb.collection).toHaveBeenCalledWith('community_comments');
      expect(result).toEqual(expect.objectContaining({
        totalPosts: 100,
        totalComments: 500,
        totalLikes: 1000,
        activeUsers: 3
      }));
    });
  });
});
