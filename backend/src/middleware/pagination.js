const paginationMiddleware = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Add pagination to request object
  req.pagination = {
    page,
    limit,
    skip
  };
  
  next();
};

const paginatedResponse = (data, total, pagination) => {
  return {
    data,
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(total / pagination.limit),
      totalItems: total,
      itemsPerPage: pagination.limit,
      hasNextPage: pagination.page < Math.ceil(total / pagination.limit),
      hasPrevPage: pagination.page > 1
    }
  };
};

module.exports = { paginationMiddleware, paginatedResponse };
