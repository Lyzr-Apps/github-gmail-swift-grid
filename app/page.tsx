'use client'

import { useState } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { FiGithub, FiStar, FiGitCommit, FiMail, FiLoader, FiCheck, FiAlertCircle, FiChevronDown, FiChevronUp, FiClock, FiUser, FiRefreshCw } from 'react-icons/fi'

// Agent IDs
const MANAGER_AGENT_ID = '698dad3c9bedf36d52f84667'
const GITHUB_DATA_AGENT_ID = '698dad212dc7772e4cc0755e'
const EMAIL_COMPOSER_AGENT_ID = '698dad2e75b236a82be3cfbc'

// TypeScript interfaces from response schemas
interface Commit {
  message: string
  author: string
  timestamp: string
}

interface Repository {
  name: string
  description: string
  language: string
  stars: number
  lastUpdated: string
  commits: Commit[]
}

interface ManagerResponse {
  repositories: Repository[]
  commits: Commit[]
  emailStatus: string
}

interface EmailResponse {
  status: string
  recipient: string
  message: string
}

// Helper function to format relative time
function formatRelativeTime(timestamp: string): string {
  if (!timestamp) return 'Unknown'
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  } catch {
    return timestamp
  }
}

// Helper function to truncate commit messages
function truncateMessage(message: string, maxLength: number = 80): string {
  if (!message) return 'No message'
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength) + '...'
}

// Repository Card Component
function RepositoryCard({ repo }: { repo: Repository }) {
  const [expanded, setExpanded] = useState(false)
  const commits = Array.isArray(repo?.commits) ? repo.commits.slice(0, 5) : []

  return (
    <div className="bg-card border border-border rounded-lg p-5 hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-accent/10">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiGithub className="text-accent w-5 h-5 flex-shrink-0" />
          <h3 className="font-semibold text-foreground font-mono">{repo?.name ?? 'Unnamed Repository'}</h3>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <FiStar className="w-4 h-4" />
          <span className="text-sm font-mono">{repo?.stars ?? 0}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {repo?.description ?? 'No description available'}
      </p>

      <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
        {repo?.language && (
          <span className="px-2 py-1 bg-accent/10 text-accent rounded-md font-mono">
            {repo.language}
          </span>
        )}
        {repo?.lastUpdated && (
          <span className="flex items-center gap-1">
            <FiClock className="w-3 h-3" />
            {formatRelativeTime(repo.lastUpdated)}
          </span>
        )}
      </div>

      {commits.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <span className="flex items-center gap-2">
              <FiGitCommit className="w-4 h-4" />
              Recent Commits ({commits.length})
            </span>
            {expanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="space-y-2 mt-3">
              {commits.map((commit, idx) => (
                <div key={idx} className="bg-secondary/50 rounded p-2 border border-border/50">
                  <p className="text-xs text-foreground font-mono mb-1">
                    {truncateMessage(commit?.message ?? 'No message')}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FiUser className="w-3 h-3" />
                      {commit?.author ?? 'Unknown'}
                    </span>
                    <span>{formatRelativeTime(commit?.timestamp ?? '')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Main Home Component
export default function Home() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [useSampleData, setUseSampleData] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected' | 'checking'>('unknown')
  const [statusMessage, setStatusMessage] = useState<string>('')

  // Check GitHub connection status
  const checkConnectionStatus = async () => {
    setConnectionStatus('checking')
    setStatusMessage('')
    setActiveAgent(GITHUB_DATA_AGENT_ID)

    try {
      const result = await callAIAgent(
        'Check if my GitHub account is connected and return the connection status',
        GITHUB_DATA_AGENT_ID
      )

      if (result.success) {
        // If we get a successful response, GitHub is connected
        setConnectionStatus('connected')
        setStatusMessage('GitHub account is connected and ready')
      } else {
        // If there's an error, likely not connected
        const errorMsg = result.error || ''
        if (errorMsg.toLowerCase().includes('not connected') ||
            errorMsg.toLowerCase().includes('authentication') ||
            errorMsg.toLowerCase().includes('oauth')) {
          setConnectionStatus('disconnected')
          setStatusMessage('GitHub account is not connected. Please connect your account.')
        } else {
          setConnectionStatus('disconnected')
          setStatusMessage(errorMsg || 'Unable to verify connection status')
        }
      }
    } catch (err) {
      setConnectionStatus('disconnected')
      setStatusMessage('Error checking connection status')
    } finally {
      setActiveAgent(null)
    }
  }

  // Sample data for demonstration
  const sampleRepositories: Repository[] = [
    {
      name: 'awesome-nextjs-app',
      description: 'A modern Next.js application with TypeScript, Tailwind CSS, and AI integration',
      language: 'TypeScript',
      stars: 142,
      lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      commits: [
        {
          message: 'feat: Add GitHub integration with OAuth support',
          author: 'johndoe',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
          message: 'fix: Resolve email sending issue in production',
          author: 'johndoe',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          message: 'docs: Update README with deployment instructions',
          author: 'janedoe',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
        }
      ]
    },
    {
      name: 'react-dashboard',
      description: 'Interactive analytics dashboard built with React and D3.js',
      language: 'JavaScript',
      stars: 89,
      lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      commits: [
        {
          message: 'refactor: Improve chart rendering performance',
          author: 'alexsmith',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          message: 'feat: Add real-time data streaming support',
          author: 'alexsmith',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    },
    {
      name: 'python-ml-toolkit',
      description: 'Machine learning utilities and pre-trained models for common tasks',
      language: 'Python',
      stars: 256,
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      commits: [
        {
          message: 'feat: Add sentiment analysis model',
          author: 'mlexpert',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        },
        {
          message: 'test: Add comprehensive unit tests for NLP module',
          author: 'mlexpert',
          timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
        },
        {
          message: 'chore: Update dependencies to latest versions',
          author: 'dependabot',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    },
    {
      name: 'api-gateway',
      description: 'Scalable microservices gateway with rate limiting and authentication',
      language: 'Go',
      stars: 321,
      lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      commits: [
        {
          message: 'perf: Optimize request routing algorithm',
          author: 'backend-dev',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          message: 'security: Implement JWT token validation',
          author: 'backend-dev',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    },
    {
      name: 'mobile-chat-app',
      description: 'Cross-platform messaging app with end-to-end encryption',
      language: 'Dart',
      stars: 178,
      lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      commits: [
        {
          message: 'feat: Add voice message support',
          author: 'mobile-team',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          message: 'fix: Resolve notification delivery on iOS',
          author: 'mobile-team',
          timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    }
  ]

  // Fetch repositories from manager agent
  const fetchRepositories = async () => {
    if (useSampleData) {
      setRepositories(sampleRepositories)
      return
    }

    setLoading(true)
    setError(null)
    setActiveAgent(GITHUB_DATA_AGENT_ID)

    try {
      // Call GitHub Data Agent directly to test
      const result = await callAIAgent(
        'Fetch my GitHub repositories with their commit history',
        GITHUB_DATA_AGENT_ID
      )

      console.log('Full agent response:', result)
      console.log('Response data:', result?.response)
      console.log('Response result:', result?.response?.result)

      if (result.success) {
        const data = result?.response?.result
        console.log('Parsed data:', data)
        console.log('Repositories array:', data?.repositories)

        const repos = Array.isArray(data?.repositories) ? data.repositories : []
        setRepositories(repos)

        if (repos.length === 0) {
          setError('No repositories found. Please ensure your GitHub account is connected.')
        }
      } else {
        console.error('Agent call failed:', result.error)
        setError(result.error || 'Failed to fetch repositories')
      }
    } catch (err) {
      console.error('Exception during fetch:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
      setActiveAgent(null)
    }
  }

  // Share via email
  const shareViaEmail = async () => {
    if (!recipientEmail) {
      setEmailError('Please enter a recipient email address')
      return
    }

    if (!recipientEmail.includes('@') || !recipientEmail.includes('.')) {
      setEmailError('Please enter a valid email address')
      return
    }

    if (repositories.length === 0 && !useSampleData) {
      setEmailError('Please fetch repositories first before sharing')
      return
    }

    setEmailLoading(true)
    setEmailError(null)
    setEmailSuccess(null)
    setActiveAgent(MANAGER_AGENT_ID)

    try {
      const result = await callAIAgent(
        `Send an email to ${recipientEmail} with a summary of my GitHub repositories and recent commits`,
        MANAGER_AGENT_ID
      )

      if (result.success) {
        const data = result?.response?.result as EmailResponse | undefined
        const status = data?.status ?? ''
        const message = data?.message ?? ''

        if (status.toLowerCase().includes('success') || status.toLowerCase().includes('sent')) {
          setEmailSuccess(message || `Email successfully sent to ${recipientEmail}`)
          setRecipientEmail('')
        } else {
          setEmailError(message || 'Failed to send email')
        }
      } else {
        setEmailError(result.error || 'Failed to send email')
      }
    } catch (err) {
      setEmailError('An unexpected error occurred')
    } finally {
      setEmailLoading(false)
      setActiveAgent(null)
    }
  }

  const displayedRepos = useSampleData ? sampleRepositories : repositories

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiGithub className="w-8 h-8 text-accent" />
              <div>
                <h1 className="text-xl font-bold text-foreground font-sans">
                  GitHub Repository & Commit Tracker
                </h1>
                <p className="text-sm text-muted-foreground">
                  Track your repositories and share via email
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Connection Status Button */}
              <button
                onClick={checkConnectionStatus}
                disabled={connectionStatus === 'checking'}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  connectionStatus === 'connected'
                    ? 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20'
                    : connectionStatus === 'disconnected'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                    : 'border-border bg-secondary text-muted-foreground hover:bg-secondary/80'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {connectionStatus === 'checking' ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : connectionStatus === 'connected' ? (
                  <>
                    <FiCheck className="w-4 h-4" />
                    Connected
                  </>
                ) : connectionStatus === 'disconnected' ? (
                  <>
                    <FiAlertCircle className="w-4 h-4" />
                    Disconnected
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="w-4 h-4" />
                    Check Status
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sample Data</span>
                <button
                  onClick={() => {
                    setUseSampleData(!useSampleData)
                    if (!useSampleData) {
                      setRepositories([])
                      setError(null)
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useSampleData ? 'bg-accent' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useSampleData ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status Message */}
        {statusMessage && (
          <div className={`mb-6 rounded-lg p-4 flex items-start gap-3 ${
            connectionStatus === 'connected'
              ? 'bg-accent/10 border border-accent/20'
              : 'bg-destructive/10 border border-destructive/20'
          }`}>
            {connectionStatus === 'connected' ? (
              <FiCheck className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            ) : (
              <FiAlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                connectionStatus === 'connected' ? 'text-accent' : 'text-destructive'
              }`}>
                {connectionStatus === 'connected' ? 'Connected' : 'Connection Issue'}
              </p>
              <p className={`text-sm mt-1 ${
                connectionStatus === 'connected' ? 'text-accent/80' : 'text-destructive/80'
              }`}>
                {statusMessage}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section - Repositories */}
          <div className="lg:col-span-2 space-y-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Repositories {displayedRepos.length > 0 && `(${displayedRepos.length})`}
              </h2>
              <button
                onClick={fetchRepositories}
                disabled={loading || useSampleData}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {loading ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <FiGithub className="w-4 h-4" />
                    Fetch Repositories
                  </>
                )}
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && displayedRepos.length === 0 && !error && (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <FiGithub className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Repositories Yet
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {useSampleData
                    ? 'Turn off sample data and fetch your real repositories'
                    : 'Click "Fetch Repositories" to load your GitHub repositories and commits'
                  }
                </p>
              </div>
            )}

            {/* Repository Grid */}
            {displayedRepos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedRepos.map((repo, idx) => (
                  <RepositoryCard key={idx} repo={repo} />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar - Email Share */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <FiMail className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold text-foreground">Share via Email</h3>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Send a summary of your repositories and recent commits to any email address
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => {
                      setRecipientEmail(e.target.value)
                      setEmailError(null)
                      setEmailSuccess(null)
                    }}
                    placeholder="colleague@example.com"
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>

                <button
                  onClick={shareViaEmail}
                  disabled={emailLoading || (!useSampleData && displayedRepos.length === 0)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  {emailLoading ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiMail className="w-4 h-4" />
                      Share via Email
                    </>
                  )}
                </button>

                {/* Email Success */}
                {emailSuccess && (
                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 flex items-start gap-3">
                    <FiCheck className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-accent">Success</p>
                      <p className="text-sm text-accent/80 mt-1">{emailSuccess}</p>
                    </div>
                  </div>
                )}

                {/* Email Error */}
                {emailError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80 mt-1">{emailError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Agent Status Section */}
        <div className="mt-8 bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Agent Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Manager Agent */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              activeAgent === MANAGER_AGENT_ID
                ? 'border-accent bg-accent/5'
                : 'border-border bg-secondary/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                activeAgent === MANAGER_AGENT_ID ? 'bg-accent animate-pulse' : 'bg-muted-foreground'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">GitHub Email Coordinator</p>
                <p className="text-xs text-muted-foreground">Manager Agent</p>
              </div>
            </div>

            {/* GitHub Data Agent */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">GitHub Data Agent</p>
                <p className="text-xs text-muted-foreground">Repository Fetcher</p>
              </div>
            </div>

            {/* Email Composer Agent */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Email Composer Agent</p>
                <p className="text-xs text-muted-foreground">Email Sender</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
