# Development Workflow and GitHub Standards

## GitHub Workflow for Agents

### Before Starting Any Task

```bash
# 1. Always start from clean main branch
git checkout main
git pull origin main

# 2. Create feature branch with descriptive name
git checkout -b feature/task-X-brief-description
# Examples:
# - feature/task-4-google-oauth-auth
# - feature/task-6-expo-maps-integration
# - feature/task-8-places-api-discovery

# 3. Verify clean starting state
git status  # Should be clean
npm test   # Should pass (once tests are set up)
npm run lint # Should pass (once linting is set up)
```

### During Development

```bash
# 4. Commit frequently with descriptive messages
git add .
git commit -m "feat(auth): implement Google OAuth service

- Add AuthService with signInWithGoogle method
- Integrate Expo AuthSession for OAuth flow
- Add comprehensive unit tests with 95% coverage
- Handle authentication errors with ErrorHandler

Refs: Task 4.1"

# 5. Push regularly to backup work
git push -u origin feature/task-X-brief-description
```

### Commit Message Standards

```
type(scope): brief description

- Detailed change 1
- Detailed change 2
- Any breaking changes noted

Refs: Task X.Y
Closes: #issue-number (if applicable)
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`  
**Scopes**: `auth`, `map`, `journey`, `places`, `ui`, `nav`, `test`, `config`

### Before Completing Task

```bash
# 6. Self-review checklist
npm test           # All tests pass
npm run lint       # No linting errors  
npm run build      # Build succeeds (once build is set up)

# 7. Validate task completion
# Check all sub-task checkboxes are completed
# Verify acceptance criteria are met
# Test the feature works end-to-end

# 8. Create PR with proper description
# Use PR template (will be created in Task 2.1)
# Reference the task number and requirements
# Include testing performed and screenshots if UI changes
```

### PR Review Process

**PR Must Include**:
- [ ] Clear description of changes
- [ ] Reference to task number and requirements
- [ ] Testing performed (unit, integration, manual)
- [ ] Screenshots for UI changes
- [ ] Performance impact assessment
- [ ] Documentation updates (if patterns changed)

**Automatic Checks** (set up in Task 2.2):
- [ ] All tests pass
- [ ] Linting passes
- [ ] Test coverage >85%
- [ ] Build succeeds

### Branch Protection Rules

**Main Branch Protection**:
- Require PR reviews
- Require status checks to pass
- Require branches to be up to date
- No direct pushes to main

**Feature Branch Naming**:
- `feature/task-X-description` for new features
- `fix/task-X-description` for bug fixes
- `docs/task-X-description` for documentation only

### Quality Gates

**Before Each Task**:
- [ ] Previous task fully complete and tested
- [ ] All tests passing
- [ ] No linting errors
- [ ] Clean git status

**During Task Development**:
- [ ] Write tests as you build features
- [ ] Commit frequently with clear messages
- [ ] Push regularly to backup work
- [ ] Follow established patterns

**Before Task Completion**:
- [ ] All sub-tasks completed
- [ ] All acceptance criteria met
- [ ] Tests written and passing
- [ ] Code reviewed (self-review minimum)
- [ ] Documentation updated if needed

## Code Quality Standards

### File Organization
```
src/
├── components/ui/          # Reusable UI components
├── components/map/         # Map-specific components  
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── navigation/            # Navigation configuration
├── screens/               # Screen components
├── services/              # Business logic and API calls
├── styles/                # Theme and styling
├── utils/                 # Utility functions
└── test/                  # Test utilities and mocks
```

### Naming Conventions
- **Files**: PascalCase for components (`AuthService.js`), camelCase for utilities (`apiMonitor.js`)
- **Components**: PascalCase (`SignInScreen`, `MapView`)
- **Functions**: camelCase (`signInWithGoogle`, `getCurrentLocation`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `LOCATION_TASK_NAME`)

### Code Style
- Use functional components with hooks
- Prefer destructuring for props and state
- Use async/await for asynchronous operations
- Include JSDoc comments for complex functions
- Use consistent error handling patterns
- Implement proper loading states

### Testing Requirements
- **Unit Tests**: All services, utilities, and hooks
- **Component Tests**: All UI components with proper mocking
- **Integration Tests**: Complete user flows
- **Coverage**: >85% minimum, >95% preferred

### Performance Standards
- Components use React.memo when appropriate
- Expensive operations use useMemo/useCallback
- Proper cleanup in useEffect hooks
- Optimize re-renders and API calls

## Documentation Update Triggers

### Automatic Updates (Built into Tasks)
- **Task 6.5**: Update architecture decisions after map integration
- **Task 10.4**: Document navigation patterns established  
- **Task 12.1**: Consolidate development patterns into steering docs

### PR Review Checklist
- [ ] Does this introduce new patterns that should be documented?
- [ ] Do existing docs need updates based on this change?
- [ ] Are there any outdated docs that should be archived?

### Documentation Standards
- Keep docs focused and actionable
- Update existing docs rather than creating new ones
- Archive unused docs monthly
- Each doc must have clear purpose and audience
- Limit steering docs to 5 files maximum for MVP

## Emergency Procedures

### Rollback Process
```bash
# If task breaks something critical
git checkout main
git revert <commit-hash>
git push origin main

# Verify stability
npm test
npm start  # Verify app launches
```

### Hotfix Process
```bash
# For critical production issues
git checkout main
git checkout -b hotfix/critical-issue-description
# Make minimal fix
git commit -m "hotfix: critical issue description"
# Create PR with expedited review
```

This workflow ensures quality, consistency, and maintainability throughout the MVP development process.