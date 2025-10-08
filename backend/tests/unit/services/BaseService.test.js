const BaseService = require('../../../services/BaseService');

// Mock database
const mockDb = {
  collection: jest.fn(() => ({
    findOne: jest.fn(),
    find: jest.fn(() => ({
      toArray: jest.fn()
    })),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(() => ({
      toArray: jest.fn()
    }))
  }))
};

describe('BaseService', () => {
  let service;

  beforeEach(() => {
    service = new BaseService(mockDb);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with database', () => {
      expect(service.db).toBe(mockDb);
    });
  });

  describe('isValidObjectId', () => {
    it('should validate valid ObjectId', () => {
      const result = service.isValidObjectId('507f1f77bcf86cd799439011');
      expect(result).toBe(true);
    });

    it('should reject invalid ObjectId', () => {
      const result = service.isValidObjectId('invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('findById', () => {
    it('should find document by id', async () => {
      const mockDoc = { _id: '507f1f77bcf86cd799439011', name: 'Test' };
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockDoc)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.findById('users', '507f1f77bcf86cd799439011');

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: expect.any(Object)
      });
      expect(result).toBe(mockDoc);
    });
  });

  describe('find', () => {
    it('should find documents with query', async () => {
      const mockDocs = [{ _id: '1', name: 'Test1' }, { _id: '2', name: 'Test2' }];
      const mockCollection = {
        find: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue(mockDocs)
        }))
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.find('users', { active: true });

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.find).toHaveBeenCalledWith({ active: true }, {});
      expect(result).toBe(mockDocs);
    });
  });

  describe('create', () => {
    it('should create document with timestamps', async () => {
      const mockDoc = { name: 'Test User', email: 'test@example.com' };
      const mockResult = { insertedId: '507f1f77bcf86cd799439011' };
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue(mockResult)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.create('users', mockDoc);

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        ...mockDoc,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateById', () => {
    it('should update document by id', async () => {
      const mockResult = { matchedCount: 1 };
      const mockCollection = {
        updateOne: jest.fn().mockResolvedValue(mockResult)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const updateData = { name: 'Updated Name' };
      const result = await service.updateById('users', '507f1f77bcf86cd799439011', updateData);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        { $set: { ...updateData, updatedAt: expect.any(Date) } }
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteById', () => {
    it('should delete document by id', async () => {
      const mockResult = { deletedCount: 1 };
      const mockCollection = {
        deleteOne: jest.fn().mockResolvedValue(mockResult)
      };
      mockDb.collection.mockReturnValue(mockCollection);

      const result = await service.deleteById('users', '507f1f77bcf86cd799439011');

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({
        _id: expect.any(Object)
      });
      expect(result).toEqual(mockResult);
    });
  });
});
