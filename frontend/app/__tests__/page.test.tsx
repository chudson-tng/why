import { render, screen } from '@testing-library/react'
import HomePage from '../page'

describe('HomePage', () => {
  it('should render app title', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { name: /why/i })).toBeInTheDocument()
  })

  it('should render app description', () => {
    render(<HomePage />)
    expect(screen.getByText(/a messaging app with full observability/i)).toBeInTheDocument()
  })

  it('should render sign up link', () => {
    render(<HomePage />)
    const signupLink = screen.getByRole('link', { name: /sign up/i })
    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute('href', '/signup')
  })

  it('should render log in link', () => {
    render(<HomePage />)
    const loginLink = screen.getByRole('link', { name: /log in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('should have proper styling classes', () => {
    const { container } = render(<HomePage />)
    expect(container.firstChild).toHaveClass('min-h-screen')
  })
})
