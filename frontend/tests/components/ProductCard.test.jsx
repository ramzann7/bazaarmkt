import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../../src/components/ProductCard';
import { toast } from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock the AddToCart component
jest.mock('../../src/components/AddToCart', () => {
  return function MockAddToCart({ onSuccess }) {
    return (
      <button 
        data-testid="add-to-cart-button"
        onClick={() => onSuccess && onSuccess({ name: 'Test Product' }, 1)}
      >
        Add to Cart
      </button>
    );
  };
});

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ProductCard Component', () => {
  const mockProduct = global.testUtils.createMockProduct();

  beforeEach(() => {
    global.testUtils.clearAllMocks();
  });

  it('renders product information correctly', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.description)).toBeInTheDocument();
    expect(screen.getByText(`$${mockProduct.price}`)).toBeInTheDocument();
    expect(screen.getByText(`by ${mockProduct.artisan.artisanName}`)).toBeInTheDocument();
  });

  it('displays product image when available', () => {
    const productWithImage = {
      ...mockProduct,
      image: 'https://example.com/image.jpg'
    };
    
    renderWithRouter(<ProductCard product={productWithImage} />);
    
    const image = screen.getByAltText(mockProduct.name);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', productWithImage.image);
  });

  it('displays placeholder when no image is available', () => {
    const productWithoutImage = {
      ...mockProduct,
      image: null
    };
    
    renderWithRouter(<ProductCard product={productWithoutImage} />);
    
    // Should show placeholder icon
    expect(screen.getByTestId('placeholder-icon')).toBeInTheDocument();
  });

  it('shows "Sold Out" for out of stock products', () => {
    const outOfStockProduct = {
      ...mockProduct,
      productType: 'ready_to_ship',
      stock: 0
    };
    
    renderWithRouter(<ProductCard product={outOfStockProduct} />);
    
    expect(screen.getByText('Sold Out')).toBeInTheDocument();
    expect(screen.queryByText('Add to Cart')).not.toBeInTheDocument();
  });

  it('shows "Sold Out" for made-to-order products with no capacity', () => {
    const noCapacityProduct = {
      ...mockProduct,
      productType: 'made_to_order',
      totalCapacity: 5,
      remainingCapacity: 0
    };
    
    renderWithRouter(<ProductCard product={noCapacityProduct} />);
    
    expect(screen.getByText('Sold Out')).toBeInTheDocument();
  });

  it('shows "Sold Out" for scheduled order products with no availability', () => {
    const noAvailabilityProduct = {
      ...mockProduct,
      productType: 'scheduled_order',
      availableQuantity: 0
    };
    
    renderWithRouter(<ProductCard product={noAvailabilityProduct} />);
    
    expect(screen.getByText('Sold Out')).toBeInTheDocument();
  });

  it('displays product badges correctly', () => {
    const featuredProduct = {
      ...mockProduct,
      isFeatured: true,
      isOrganic: true,
      isGlutenFree: true
    };
    
    renderWithRouter(<ProductCard product={featuredProduct} />);
    
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Organic')).toBeInTheDocument();
    expect(screen.getByText('Gluten-Free')).toBeInTheDocument();
  });

  it('handles product click correctly', () => {
    const mockOnProductClick = jest.fn();
    renderWithRouter(
      <ProductCard 
        product={mockProduct} 
        onProductClick={mockOnProductClick}
      />
    );
    
    const productCard = screen.getByTestId('product-card');
    fireEvent.click(productCard);
    
    expect(mockOnProductClick).toHaveBeenCalledWith(mockProduct);
  });

  it('opens add to cart popup when add to cart is clicked', async () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    
    const addToCartButton = screen.getByText('Add to Cart');
    fireEvent.click(addToCartButton);
    
    await waitFor(() => {
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
      expect(screen.getByTestId('add-to-cart-button')).toBeInTheDocument();
    });
  });

  it('closes add to cart popup when close button is clicked', async () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    
    // Open popup
    const addToCartButton = screen.getByText('Add to Cart');
    fireEvent.click(addToCartButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('add-to-cart-button')).toBeInTheDocument();
    });
    
    // Close popup
    const closeButton = screen.getByTestId('close-popup');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('add-to-cart-button')).not.toBeInTheDocument();
    });
  });

  it('shows success toast when item is added to cart', async () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    
    // Open popup and add to cart
    const addToCartButton = screen.getByText('Add to Cart');
    fireEvent.click(addToCartButton);
    
    await waitFor(() => {
      const addButton = screen.getByTestId('add-to-cart-button');
      fireEvent.click(addButton);
    });
    
    expect(toast.success).toHaveBeenCalledWith(
      'Added 1 piece to cart!'
    );
  });

  it('displays ratings when showRating is true', () => {
    const productWithRating = {
      ...mockProduct,
      artisan: {
        ...mockProduct.artisan,
        rating: { average: 4.5 }
      }
    };
    
    renderWithRouter(
      <ProductCard 
        product={productWithRating} 
        showRating={true}
      />
    );
    
    expect(screen.getByText('(4.5)')).toBeInTheDocument();
  });

  it('does not display ratings when showRating is false', () => {
    const productWithRating = {
      ...mockProduct,
      artisan: {
        ...mockProduct.artisan,
        rating: { average: 4.5 }
      }
    };
    
    renderWithRouter(
      <ProductCard 
        product={productWithRating} 
        showRating={false}
      />
    );
    
    expect(screen.queryByText('(4.5)')).not.toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const customClass = 'custom-product-card';
    renderWithRouter(
      <ProductCard 
        product={mockProduct} 
        className={customClass}
      />
    );
    
    const productCard = screen.getByTestId('product-card');
    expect(productCard).toHaveClass(customClass);
  });
});
