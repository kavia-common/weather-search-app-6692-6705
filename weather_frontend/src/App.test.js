import { render, screen } from '@testing-library/react';
import App from './App';

test('renders weather search title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /weather search/i })).toBeInTheDocument();
});
