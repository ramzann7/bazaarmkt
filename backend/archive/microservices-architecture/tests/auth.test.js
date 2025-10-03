const request = require('supertest');

describe('Authentication API', () => {
  let app;
  
  beforeAll(async () => {
    // Set test environment variables
    global.testUtils.setTestEnvironment();
    
    // Import app after setting environment
    app = require('../server-vercel');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@bazaarmkt.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should not register user with existing email', async () => {
      const userData = {
        email: 'existing@bazaarmkt.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      };

      // Create user first
      await global.testUtils.createTestUser({ email: userData.email });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await global.testUtils.createTestUser({
        email: 'login@bazaarmkt.com',
        password: 'password123'
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'login@bazaarmkt.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should not login with invalid credentials', async () => {
      const loginData = {
        email: 'login@bazaarmkt.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const user = await global.testUtils.createTestUser();
      const token = global.testUtils.generateToken(user._id);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.email).toBe(user.email);
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('message');
    });
  });
});
