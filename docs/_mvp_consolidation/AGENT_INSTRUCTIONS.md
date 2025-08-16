# Agent Instructions: Hero's Path MVP Refactor Execution

## Overview

You are tasked with executing a comprehensive MVP-first refactor of the Hero's Path React Native application. This document provides complete instructions for using the extensive documentation bundle that has been prepared for you.

**Your Role**: Implementation Agent  
**Mission**: Execute the refactor plan systematically while maintaining application functionality  
**Resources**: Complete documentation bundle in `docs/_mvp_consolidation/`  
**Timeline**: 3 weeks (15 working days)  
**Success Criteria**: 80% reduction in duplicate code, consistent patterns, MVP-ready architecture

---

## 🚀 Getting Started

### Step 1: Familiarize Yourself with the Bundle

1. **Read the Main README First**
   ```bash
   # Start here - comprehensive overview
   cat docs/_mvp_consolidation/README.md
   ```

2. **Review the Manifest**
   ```bash
   # Understand what's available
   cat docs/_mvp_consolidation/00_MANIFEST.yaml
   ```

3. **Check Current Status**
   ```bash
   # See what's complete and ready
   cat docs/_mvp_consolidation/STATUS.md
   ```

### Step 2: Understand the Current Codebase

1. **Repository Snapshot Analysis**
   ```bash
   # Review the complete codebase structure
   cat docs/_mvp_consolidation/inputs/repo_snapshot.json
   ```

2. **Symbol Inventory**
   ```bash
   # Understand all classes, functions, and exports
   cat docs/_mvp_consolidation/inventory/symbol_index.json
   ```

3. **Dependency Analysis**
   ```bash
   # Visual dependency understanding
   # Open in VS Code or Mermaid viewer:
   code docs/_mvp_consolidation/inventory/dep_graph.mmd
   ```

### Step 3: Analyze What Needs to Be Done

1. **Duplication Report**
   ```bash
   # Critical reading - this drives your work
   cat docs/_mvp_consolidation/duplication/duplicates_report.md
   ```

2. **Duplication Groups**
   ```bash
   # Machine-readable consolidation targets
   cat docs/_mvp_consolidation/duplication/duplicates_groups.json
   ```

3. **Code Examples**
   ```bash
   # See exact patterns to eliminate
   cat docs/_mvp_consolidation/duplication/near_duplicate_examples/firebase_crud_patterns.js
   cat docs/_mvp_consolidation/duplication/near_duplicate_examples/loading_state_patterns.js
   ```

---

## 📋 Your Execution Plan

### Follow the Detailed Plan

**Primary Resource**: `docs/_mvp_consolidation/refactor_plan/plan.md`

This plan contains:
- 11 ordered PRs over 3 weeks
- Detailed implementation steps for each PR
- Success criteria for each change
- Rollback procedures if things go wrong
- Risk assessment and mitigation

### Phase Overview

**Week 1 - Foundation Consolidation**:
- PR #1: Create BaseFirebaseService (eliminates 200+ duplicate lines)
- PR #2: Migrate JourneyService 
- PR #3: Migrate other services
- PR #4: Standardize loading states

**Week 2 - UI Standardization**:
- PR #5-8: Modal and theming consolidation

**Week 3 - Final Cleanup**:
- PR #9-11: Performance optimization and documentation

---

## 🎯 Key Resources by Task

### When Creating BaseFirebaseService (PR #1)

**Primary References**:
1. `duplication/duplicates_groups.json` - Group ID: "firebase_crud_operations"
2. `duplication/near_duplicate_examples/firebase_crud_patterns.js` - Exact code patterns
3. `architecture/contracts/types.ts` - FirebaseServiceInterface definition
4. `inventory/http_endpoints.json` - Firebase API patterns

**Implementation Strategy**:
```bash
# Study these patterns first
grep -r "addDoc\|setDoc\|getDoc\|updateDoc" services/
# Then implement BaseFirebaseService following the contract
```

### When Standardizing Loading States (PR #4)

**Primary References**:
1. `duplication/near_duplicate_examples/loading_state_patterns.js` - Current patterns
2. `architecture/contracts/types.ts` - AsyncOperationHook interface
3. `inventory/symbol_index.json` - All hooks with loading states

**Find All Loading Patterns**:
```bash
grep -r "useState.*loading\|setLoading\|isLoading" hooks/ contexts/
```

### When Working on UI Standardization (PRs #5-8)

**Primary References**:
1. `inputs/specs_collected/UI_STANDARDIZATION_GUIDE.md` - Detailed UI analysis
2. `spec/mvp.yaml` - UI requirements and principles
3. `architecture/contracts/types.ts` - Component interface definitions

**Current UI Issues to Fix**:
```bash
# Find hardcoded colors
grep -r "backgroundColor.*#\|color.*#" components/
# Find Alert.alert usage
grep -r "Alert\.alert" .
```

### When Understanding MVP Scope

**Primary Reference**: `spec/mvp.yaml`

This contains:
- **Included in MVP**: Journey tracking, place discovery, basic auth
- **Excluded from MVP**: Social features, gamification, advanced customization
- **User journey flow**: 7-step core workflow
- **Success metrics**: Specific performance targets

### When Working with Architecture

**Primary References**:
1. `architecture/module_map.md` - Target architecture overview
2. `architecture/contracts/types.ts` - All interface definitions
3. `architecture/contracts/events.md` - Event system patterns
4. `inventory/dep_graph.mmd` - Current dependency visualization

---

## 🔧 How to Use Each Documentation Section

### Inventory Section (`inventory/`)

**When to Use**: Understanding current codebase structure

- **symbol_index.json**: Find all exports, classes, functions
- **http_endpoints.json**: Understand API integrations and costs
- **events_catalog.json**: Understand data flow and state changes
- **dep_graph.mmd**: Visual dependency understanding
- **package_matrix.csv**: Dependency analysis and security risks

**Example Usage**:
```bash
# Find all services that extend something
jq '.symbol_categories.services[] | select(.key_methods)' docs/_mvp_consolidation/inventory/symbol_index.json

# Understand Firebase operations
jq '.firebase_endpoints' docs/_mvp_consolidation/inventory/http_endpoints.json
```

### Duplication Section (`duplication/`)

**When to Use**: Before starting any consolidation work

- **duplicates_report.md**: Human-readable analysis and strategy
- **duplicates_groups.json**: Machine-readable targets with priority
- **near_duplicate_examples/**: Exact code patterns to eliminate

**Example Usage**:
```bash
# See highest priority duplications
jq '.duplicate_groups[] | select(.priority == "high")' docs/_mvp_consolidation/duplication/duplicates_groups.json

# Get estimated lines saved
jq '.duplicate_groups[].estimated_lines_duplicated' docs/_mvp_consolidation/duplication/duplicates_groups.json | paste -sd+ | bc
```

### Architecture Section (`architecture/`)

**When to Use**: Implementing new patterns and interfaces

- **module_map.md**: Understand target structure and dependencies
- **contracts/types.ts**: TypeScript interfaces for all new code
- **contracts/http_openapi.yaml**: API integration specifications
- **contracts/events.md**: Event system implementation

**Example Usage**:
```bash
# Find interface for service you're working on
grep -A 20 "JourneyServiceInterface" docs/_mvp_consolidation/architecture/contracts/types.ts

# Understand event patterns
grep -A 10 "Journey.*Event" docs/_mvp_consolidation/architecture/contracts/events.md
```

---

## ⚡ Quick Reference Commands

### Assessment Commands
```bash
# Count current duplicate patterns
find . -name "*.js" -exec grep -l "addDoc\|setDoc\|getDoc" {} \; | wc -l

# Find all loading state patterns
grep -r "useState.*loading" --include="*.js" . | wc -l

# Find hardcoded styles
grep -r "backgroundColor.*#" --include="*.js" components/ | wc -l

# Check test coverage
npm test -- --coverage
```

### Progress Tracking
```bash
# Lines of code in services (should decrease)
find services/ -name "*.js" -exec wc -l {} \; | awk '{sum+=$1} END {print sum}'

# Number of unique Firebase patterns (should become 1)
grep -rho "import.*firebase" services/ | sort | uniq | wc -l

# Loading state patterns (should decrease)
grep -r "useState.*loading\|setLoading" hooks/ contexts/ | wc -l
```

### Quality Checks
```bash
# Run linting
npm run lint

# Check for remaining Alert.alert
grep -r "Alert\.alert" --include="*.js" .

# Verify no hardcoded colors in components
grep -r "#[0-9a-fA-F]\{6\}" components/ || echo "No hardcoded colors found"
```

---

## 🚨 Critical Success Factors

### Before Starting Each PR

1. **Read the Specific PR Instructions**
   - Each PR in `refactor_plan/plan.md` has detailed steps
   - Follow implementation steps exactly
   - Check dependencies are met

2. **Understand the Success Criteria**
   - Each PR lists specific checkboxes to complete
   - Validate against these before submitting

3. **Review the Interface Contracts**
   - Check `architecture/contracts/types.ts` for required interfaces
   - Implement according to the defined contracts

### During Implementation

1. **Follow the Code Examples**
   - Use `duplication/near_duplicate_examples/` as reference
   - Implement consolidated versions as shown

2. **Maintain Test Coverage**
   - Target: >85% coverage
   - Write tests for new base classes and utilities
   - Ensure existing tests continue passing

3. **Check Performance Impact**
   - Monitor app startup time
   - Check memory usage
   - Validate user interaction responsiveness

### Before Submitting Each PR

1. **Validate Success Criteria**
   ```bash
   # Example for PR #1 (BaseFirebaseService)
   # ✅ BaseFirebaseService passes all CRUD operation tests
   npm test -- BaseFirebaseService
   
   # ✅ All tests pass with >95% coverage
   npm test -- --coverage
   
   # ✅ No existing code modified yet - safe rollback
   git status # should only show new files
   ```

2. **Run Quality Checks**
   ```bash
   npm run lint          # No linting errors
   npm test             # All tests pass
   npm run build        # Build succeeds
   ```

3. **Manual Testing**
   - Test the specific feature area affected
   - Verify no regression in user experience
   - Check error handling works correctly

---

## 📊 Progress Tracking

### Key Metrics to Monitor

Track these metrics as you progress:

```bash
# Duplicate code lines (target: <50 from ~525)
echo "Current duplicate patterns:"
grep -r "addDoc\|setDoc\|getDoc" services/ | wc -l
grep -r "useState.*loading" hooks/ contexts/ | wc -l
grep -r "Alert\.alert" . | wc -l

# Test coverage (target: >85%)
npm test -- --coverage | grep "All files"

# Bundle size (should not increase significantly)
npm run build && du -sh dist/ || du -sh .expo/
```

### Weekly Checkpoints

**End of Week 1**:
- [ ] BaseFirebaseService created and tested
- [ ] At least 2 services migrated successfully
- [ ] Loading state patterns standardized
- [ ] No functionality regressions

**End of Week 2**:
- [ ] Modal implementations standardized
- [ ] Alert.alert usage eliminated
- [ ] Theme integration consistent
- [ ] UI/UX maintained or improved

**End of Week 3**:
- [ ] All duplicate patterns eliminated
- [ ] Performance targets achieved
- [ ] Documentation updated
- [ ] Full test coverage achieved

---

## 🆘 When Things Go Wrong

### Rollback Procedures

Each PR has specific rollback instructions in `refactor_plan/plan.md`. Generally:

1. **Git Revert**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Verify Stability**
   ```bash
   npm test
   npm start # Verify app launches
   ```

3. **Document Issues**
   - What went wrong
   - Why the rollback was needed
   - Plan for next attempt

### Getting Help

If you encounter issues:

1. **Check the Documentation**
   - Relevant section in the consolidation bundle
   - Code examples and patterns
   - Interface contracts

2. **Analyze the Problem**
   - Is it a logic error in your implementation?
   - Is it a missing dependency or interface?
   - Is it a test failure or integration issue?

3. **Use the Resources**
   - `inventory/symbol_index.json` - Find existing implementations
   - `duplication/near_duplicate_examples/` - See working patterns
   - `architecture/contracts/types.ts` - Check interface requirements

---

## 🎯 Final Success Validation

When you complete all PRs, validate success:

### Code Quality Metrics
```bash
# Duplicate lines eliminated (target: <50)
echo "Remaining duplicates:"
grep -r "addDoc\|setDoc\|getDoc" services/ | wc -l  # Should be 1 (BaseFirebaseService)
grep -r "useState.*loading" hooks/ contexts/ | wc -l  # Should be <5
grep -r "Alert\.alert" . | wc -l  # Should be 0

# Test coverage achieved (target: >85%)
npm test -- --coverage

# No linting errors
npm run lint
```

### Performance Validation
```bash
# App performance maintained
npm run build
# Check bundle size is reasonable

# Manual testing of core flows
# 1. User can sign in
# 2. User can start/stop journey tracking
# 3. User can discover and save places
# 4. User can view past journeys
```

### MVP Readiness
- [ ] All MVP features work correctly
- [ ] Error handling is consistent
- [ ] Loading states are uniform
- [ ] UI is consistently themed
- [ ] Performance targets achieved

---

## 📝 Remember

1. **This is an MVP refactor** - Focus on core journey tracking and discovery features
2. **Quality over speed** - Better to do fewer PRs well than rush and break things  
3. **Test everything** - The documentation provides the foundation, but you must validate
4. **Use the resources** - This bundle contains everything you need to succeed
5. **Document as you go** - Update any patterns or issues you discover

**You have all the tools for success. Follow the plan, use the resources, and execute systematically.**

Good luck! 🚀
