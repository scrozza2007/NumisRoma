import { render, screen } from '@testing-library/react';
import CoinCard from '../../components/coin/CoinCard';

describe('CoinCard', () => {
  const mockCoin = {
    _id: '123',
    name: 'Test Coin',
    authority: {
      emperor: 'Augustus'
    },
    description: {
      date_range: '27 BC - 14 AD',
      material: 'Gold',
      denomination: 'Aureus'
    },
    obverse: {
      image: '/test-image.jpg'
    }
  };

  it('renders coin information correctly', () => {
    render(<CoinCard coin={mockCoin} />);
    
    // Check if coin information is displayed
    expect(screen.getByText('Test Coin')).toBeInTheDocument();
    expect(screen.getByText(/Augustus/)).toBeInTheDocument();
    expect(screen.getByText(/27 BC - 14 AD/)).toBeInTheDocument();
    expect(screen.getByText(/Gold/)).toBeInTheDocument();
    
    // Check alt text of image
    expect(screen.getByAltText('Moneta: Test Coin - Dritto')).toBeInTheDocument();
    
    // Check if "Dettagli" link is present
    expect(screen.getByText('Dettagli')).toBeInTheDocument();
  });

  it('uses placeholder image when no image is provided', () => {
    const coinWithoutImage = { ...mockCoin, obverse: {} };
    render(<CoinCard coin={coinWithoutImage} />);
    
    const img = screen.getByAltText('Moneta: Test Coin - Dritto');
    expect(img).toHaveAttribute('src', '/placeholder-coin.png');
  });
}); 