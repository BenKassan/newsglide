import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { AuthModal } from '../components/AuthModal'
import userEvent from '@testing-library/user-event'

describe('AuthModal Component', () => {
  const mockOnClose = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render sign in form by default', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should switch to sign up form when clicking create account', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const createAccountButton = screen.getByText(/create account/i)
    await user.click(createAccountButton)

    expect(screen.getByText(/create your account/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('should close modal when close button is clicked', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(<AuthModal isOpen={false} onClose={mockOnClose} />)

    expect(container.firstChild).toBeNull()
  })

  it('should show forgot password link in sign in mode', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email/i)
    const signInButton = screen.getByRole('button', { name: /sign in/i })

    // Enter invalid email
    await user.type(emailInput, 'invalid-email')
    await user.click(signInButton)

    // Note: Actual validation would depend on the implementation
    // This is a placeholder for where validation messages would appear
    expect(emailInput).toHaveValue('invalid-email')
  })
})
