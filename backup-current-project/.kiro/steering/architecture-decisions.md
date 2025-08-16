# Architecture Decisions

## Decision Log

This document tracks key architectural decisions made during MVP development. Each decision includes context, options considered, and rationale.

---

### ADR-001: Clean Build vs Refactoring Approach
**Date**: August 2025  
**Status**: Accepted  

**Context**: Existing codebase has 525+ lines of duplicate code, 4 different Firebase patterns, inconsistent error handling.

**Options Considered**:
1. Refactor existing codebase (11 PRs over 3 weeks)
2. Clean build from scratch

**Decision**: Clean build approach

**Rationale**: 
- Faster development (1-2 weeks vs 3 weeks)
- Lower risk (no complex rollback procedures)
- Better architecture from day 1
- No legacy technical debt

---

### ADR-002: Google Cloud → Firebase Setup Order
**Date**: August 2025  
**Status**: Accepted  

**Context**: Firebase projects created independently can have linking issues with Google Cloud services.

**Decision**: Create Google Cloud project first, then add Firebase to existing project

**Rationale**:
- Prevents linking issues between Firebase and Google APIs
- Ensures proper billing and quota management
- OAuth configurations work correctly
- All services in same project for easier management

---

### ADR-003: Expo SDK Throughout
**Date**: August 2025  
**Status**: Accepted  

**Context**: Choice between manual React Native integrations vs Expo SDK abstractions.

**Decision**: Use Expo SDK for all possible functionality (AuthSession, Location, Maps, SecureStore, TaskManager)

**Rationale**:
- Simplified development and fewer complex integrations
- More reliable implementations with better testing
- Faster development velocity
- Better documentation and community support

---

### ADR-004: Single Theme File for MVP
**Date**: August 2025  
**Status**: Accepted  

**Context**: Whether to create separate theme files (colors.js, typography.js, spacing.js) or single file.

**Decision**: Single `theme.js` file for MVP

**Rationale**:
- Simpler for MVP scope - can split later if needed
- Faster development and easier maintenance
- Avoids over-engineering for current requirements
- Clear upgrade path when complexity increases

---

### ADR-005: Progressive Documentation Strategy
**Date**: August 2025  
**Status**: Accepted  

**Context**: Existing steering docs are outdated and potentially confusing.

**Decision**: Archive existing docs, build documentation progressively as patterns emerge

**Rationale**:
- Avoid outdated information confusing agents
- Focus on what's actually needed vs theoretical completeness
- Build documentation based on real patterns discovered
- Prevent documentation debt accumulation

---

### ADR-006: Google Places API (New)
**Date**: August 2025  
**Status**: Accepted  

**Context**: Choice between legacy Google Places API vs new Google Places API.

**Decision**: Use Google Places API (New) with searchNearby endpoint

**Rationale**:
- Better performance and enhanced place data
- More efficient data retrieval with field masks
- Cost optimization features
- Future-proof as legacy API will be deprecated

---

### ADR-007: Stack Navigation First
**Date**: August 2025  
**Status**: Accepted  

**Context**: Whether to implement drawer navigation immediately or start simpler.

**Decision**: Start with stack navigation, upgrade to drawer if needed

**Rationale**:
- Don't build complexity until we know we need it
- Simpler to implement and test initially
- Clear upgrade path when requirements become clearer
- Follows "simple first" principle

---

## Decision Template

For future decisions, use this template:

```markdown
### ADR-XXX: Decision Title
**Date**: [Date]  
**Status**: [Proposed/Accepted/Deprecated/Superseded]  

**Context**: [What is the issue that we're seeing that is motivating this decision or change?]

**Options Considered**:
1. Option 1 description
2. Option 2 description
3. Option 3 description

**Decision**: [What is the change that we're proposing or have agreed to implement?]

**Rationale**: 
- Reason 1
- Reason 2
- Reason 3

**Consequences**: [What becomes easier or more difficult to do and any risks introduced by this change?]
```

## Review Process

- Architecture decisions should be documented when they impact multiple components
- Decisions should be reviewed during major milestones (end of each phase)
- Deprecated decisions should be marked but not removed (for historical context)
- New agents should review this document before making architectural changes