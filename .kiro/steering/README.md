# Hero's Path - Steering Documents

This directory contains steering documents that provide essential context about the Hero's Path application for both AI assistants and human developers.

## Available Documents

### 1. New Agent Onboarding (`onboarding.md`) 🚨 START HERE
- **CRITICAL**: Project clean slate status
- Quick start guide for new agents
- Implementation approach and priorities
- Common mistakes to avoid
- First steps checklist

### 2. Product Overview (`product.md`)
- Product description and purpose
- Core features and prioritization
- Target users and value proposition
- Current development status (clean slate)

### 3. Technical Overview (`tech.md`)
- Tech stack and dependencies
- Environment configuration
- Development workflow
- Current implementation status
- Files preserved vs. files to create

### 4. Project Structure (`structure.md`)
- Directory organization (current vs. needed)
- Architecture patterns
- Implementation priority order
- Key files and their roles
- Naming conventions and code style

### 5. Clean Slate Summary (`clean-slate-summary.md`)
- What was preserved vs. removed
- Updated documentation summary
- Implementation roadmap
- Verification steps
- Key points for new agents

### 6. GitHub Workflow (`github.md`)
- Branch strategy and naming conventions
- Commit message guidelines
- Pull request process
- CI/CD integration
- Best practices for AI agents

## Automated Maintenance

These documents are automatically maintained through agent hooks that:
1. Update them when specs are completed
2. Check for updates when tasks are marked complete
3. Perform quarterly comprehensive reviews

For details on the automation, see `.kiro/hooks/README.md`.

## Manual Updates

When making manual updates to these documents:
1. Maintain the existing format and structure
2. Be concise and focus on high-level information
3. Add version information and update the changelog section
4. Ensure consistency across all steering documents

## Version History

- v1.0.0 (July 2025): Initial steering documents created