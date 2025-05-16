const User = require('../../models/User');
const Collection = require('../../models/Collection');
const Follow = require('../../models/Follow');
const { deleteAccount } = require('../authController');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

jest.mock('../../models/User');
jest.mock('../../models/Collection');
jest.mock('../../models/Follow');
jest.mock('bcryptjs');

describe('deleteAccount', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { userId: 'test-user-id' },
      body: { password: 'test-password' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    User.findById = jest.fn();
    User.findByIdAndDelete = jest.fn();
    Collection.deleteMany = jest.fn();
    Follow.deleteMany = jest.fn();
    bcrypt.compare = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 if user is not found', async () => {
    User.findById.mockResolvedValueOnce(null);

    await deleteAccount(req, res);

    expect(User.findById).toHaveBeenCalledWith('test-user-id');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('should return 400 if password is incorrect', async () => {
    User.findById.mockResolvedValueOnce({
      _id: 'test-user-id',
      password: 'hashed-password'
    });
    bcrypt.compare.mockResolvedValueOnce(false);

    await deleteAccount(req, res);

    expect(User.findById).toHaveBeenCalledWith('test-user-id');
    expect(bcrypt.compare).toHaveBeenCalledWith('test-password', 'hashed-password');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ 
      error: 'Password is incorrect',
      field: 'password'
    });
  });

  it('should delete user and associated data if password is correct', async () => {
    User.findById.mockResolvedValueOnce({
      _id: 'test-user-id',
      password: 'hashed-password'
    });
    bcrypt.compare.mockResolvedValueOnce(true);
    User.findByIdAndDelete.mockResolvedValueOnce({});
    Collection.deleteMany.mockResolvedValueOnce({});
    Follow.deleteMany.mockResolvedValueOnce({});

    await deleteAccount(req, res);

    expect(User.findById).toHaveBeenCalledWith('test-user-id');
    expect(bcrypt.compare).toHaveBeenCalledWith('test-password', 'hashed-password');
    expect(Collection.deleteMany).toHaveBeenCalledWith({ user: 'test-user-id' });
    expect(Follow.deleteMany).toHaveBeenCalledWith({ 
      $or: [
        { follower: 'test-user-id' }, 
        { following: 'test-user-id' }
      ] 
    });
    expect(User.findByIdAndDelete).toHaveBeenCalledWith('test-user-id');
    expect(res.json).toHaveBeenCalledWith({ message: 'Account deleted successfully' });
  });

  it('should handle server errors', async () => {
    User.findById.mockRejectedValueOnce(new Error('Database error'));

    await deleteAccount(req, res);

    expect(User.findById).toHaveBeenCalledWith('test-user-id');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
  });
});