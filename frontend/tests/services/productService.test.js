import * as productService from '../../src/services/productService';

describe('Product Service', () => {
  beforeEach(() => {
    global.testUtils.clearAllMocks();
  });

  describe('getMyProducts', () => {
    it('should fetch user products successfully', async () => {
      const mockProducts = [
        global.testUtils.createMockProduct({ name: 'Product 1' }),
        global.testUtils.createMockProduct({ name: 'Product 2' })
      ];

      global.testUtils.mockApiResponse(mockProducts);

      const result = await productService.getMyProducts();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/my-products',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
      expect(result).toEqual(mockProducts);
    });

    it('should handle API errors', async () => {
      global.testUtils.mockApiError('Failed to fetch products');

      await expect(productService.getMyProducts()).rejects.toThrow('Failed to fetch products');
    });
  });

  describe('createProduct', () => {
    it('should create a new product successfully', async () => {
      const productData = {
        name: 'New Product',
        description: 'New Description',
        price: 20.99,
        category: 'food_beverages',
        subcategory: 'baked_goods',
        productType: 'ready_to_ship',
        stock: 15
      };

      const mockCreatedProduct = {
        _id: 'new-product-id',
        ...productData
      };

      global.testUtils.mockApiResponse(mockCreatedProduct, 201);

      const result = await productService.createProduct(productData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/products',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining(productData.name)
        })
      );
      expect(result).toEqual(mockCreatedProduct);
    });

    it('should create a made-to-order product with capacity period', async () => {
      const productData = {
        name: 'Custom Product',
        description: 'Custom Description',
        price: 30.99,
        category: 'food_beverages',
        subcategory: 'baked_goods',
        productType: 'made_to_order',
        totalCapacity: 10,
        capacityPeriod: 'weekly',
        leadTime: 5,
        leadTimeUnit: 'days',
        maxOrderQuantity: 3
      };

      const mockCreatedProduct = {
        _id: 'custom-product-id',
        ...productData
      };

      global.testUtils.mockApiResponse(mockCreatedProduct, 201);

      const result = await productService.createProduct(productData);

      expect(result).toEqual(mockCreatedProduct);
      expect(result.capacityPeriod).toBe('weekly');
    });

    it('should handle creation errors', async () => {
      const productData = { name: 'Invalid Product' };
      global.testUtils.mockApiError('Validation failed', 400);

      await expect(productService.createProduct(productData)).rejects.toThrow('Validation failed');
    });
  });

  describe('updateProduct', () => {
    it('should update a product successfully', async () => {
      const productId = 'test-product-id';
      const updateData = {
        name: 'Updated Product',
        price: 25.99,
        capacityPeriod: 'monthly'
      };

      const mockUpdatedProduct = {
        _id: productId,
        ...updateData
      };

      global.testUtils.mockApiResponse(mockUpdatedProduct);

      const result = await productService.updateProduct(productId, updateData);

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:4000/api/products/${productId}`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining(updateData.name)
        })
      );
      expect(result).toEqual(mockUpdatedProduct);
    });

    it('should handle update errors', async () => {
      const productId = 'test-product-id';
      const updateData = { name: 'Updated Product' };
      global.testUtils.mockApiError('Product not found', 404);

      await expect(productService.updateProduct(productId, updateData)).rejects.toThrow('Product not found');
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product successfully', async () => {
      const productId = 'test-product-id';
      const mockResponse = { message: 'Product deleted successfully' };

      global.testUtils.mockApiResponse(mockResponse);

      const result = await productService.deleteProduct(productId);

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:4000/api/products/${productId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle deletion errors', async () => {
      const productId = 'test-product-id';
      global.testUtils.mockApiError('Product not found', 404);

      await expect(productService.deleteProduct(productId)).rejects.toThrow('Product not found');
    });
  });

  describe('updateInventory', () => {
    it('should update product inventory successfully', async () => {
      const productId = 'test-product-id';
      const inventoryData = {
        stock: 20,
        totalCapacity: 25,
        remainingCapacity: 22
      };

      const mockResponse = { message: 'Inventory updated successfully' };

      global.testUtils.mockApiResponse(mockResponse);

      const result = await productService.updateInventory(productId, inventoryData);

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:4000/api/products/${productId}/inventory`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"stock":20')
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle inventory update errors', async () => {
      const productId = 'test-product-id';
      const inventoryData = { stock: -5 }; // Invalid data
      global.testUtils.mockApiError('Invalid inventory data', 400);

      await expect(productService.updateInventory(productId, inventoryData)).rejects.toThrow('Invalid inventory data');
    });
  });

  describe('getAllProducts', () => {
    it('should fetch all products successfully', async () => {
      const mockProducts = [
        global.testUtils.createMockProduct({ name: 'Product 1' }),
        global.testUtils.createMockProduct({ name: 'Product 2' })
      ];

      global.testUtils.mockApiResponse(mockProducts);

      const result = await productService.getAllProducts();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/products',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual(mockProducts);
    });

    it('should handle fetch errors', async () => {
      global.testUtils.mockApiError('Failed to fetch products');

      await expect(productService.getAllProducts()).rejects.toThrow('Failed to fetch products');
    });
  });
});
