# Hero's Path - GitHub Workflow

This document outlines the GitHub workflow and best practices for the Hero's Path project. It serves as guidance for both human developers and AI agents working on the codebase.

## Branch Strategy

### Main Branches

- **`main`**: Production-ready code. Always stable and deployable.
- **`develop`**: Integration branch for features. Stable but may contain features not ready for production.

### Feature Branches

All development should occur in feature branches following this naming convention:

```
feature/descriptive-feature-name
```

Examples:
- `feature/user-authentication`
- `feature/map-navigation`
- `feature/ping-animation`

### Bug Fix Branches

For bug fixes, use:

```
fix/descriptive-bug-name
```

Examples:
- `fix/login-crash`
- `fix/map-rendering-issue`
- `fix/ping-credit-calculation`

### Refactoring Branches

For code refactoring without changing functionality:

```
refactor/descriptive-name
```

Examples:
- `refactor/journey-service`
- `refactor/theme-system`

### Documentation Branches

For documentation-only changes:

```
docs/descriptive-name
```

Examples:
- `docs/api-documentation`
- `docs/setup-guide`

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```
feat(auth): add email verification

Add email verification step after registration to ensure valid email addresses.

Closes #123
```

```
fix(map): resolve marker positioning issue

Fixed incorrect positioning of markers on the map when zooming in/out.

Fixes #456
```

## Pull Request Process

1. **Create a Pull Request (PR)** from your feature branch to the appropriate target branch (usually `develop`)
2. **Fill out the PR template** with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if applicable)
3. **Request reviews** from appropriate team members
4. **Address review comments** and make necessary changes
5. **Merge** once approved and CI passes

## Branch Hygiene

### Keep Branches Updated

```bash
# Update your branch with latest from develop
git checkout develop
git pull
git checkout feature/your-feature
git merge develop
```

### Clean Up After Merging

```bash
# Delete local branch after merging
git branch -d feature/your-feature

# Delete remote branch after merging
git push origin --delete feature/your-feature
```

## CI/CD Integration

- All PRs trigger automated tests
- Merges to `develop` trigger development builds
- Merges to `main` trigger production builds

## Common Workflows

### Starting a New Feature

```bash
# Start from latest develop
git checkout develop
git pull

# Create a new feature branch
git checkout -b feature/new-feature

# Make changes, commit, and push
git add .
git commit -m "feat(scope): description"
git push -u origin feature/new-feature
```

### Fixing a Bug

```bash
# Start from latest develop
git checkout develop
git pull

# Create a bug fix branch
git checkout -b fix/bug-description

# Make changes, commit, and push
git add .
git commit -m "fix(scope): description"
git push -u origin fix/bug-description
```

## Best Practices for AI Agents

When working with AI agents on this repository:

1. **Always specify the branch** when asking an agent to make changes
2. **Verify changes** before committing to the repository
3. **Keep PRs focused** on a single feature or fix
4. **Use conventional commit messages** for clarity
5. **Reference issues** in commits and PRs
6. **Clean up branches** after merging