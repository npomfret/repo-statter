# Architecture Documentation

This directory contains architectural documentation for repo-statter, including both the considered V1 refactoring approach and the chosen V2 complete rewrite approach.

## Documents

### [V1 Refactoring Plan](./v1-refactoring-plan.md)
**Status: Considered but not implemented**

This document outlines a comprehensive 6-week plan to refactor the existing V1 codebase from a "unified pipeline" architecture to a properly layered Model-View-Controller (MVC) architecture. This approach would have:

- Incrementally refactored the existing codebase
- Maintained backward compatibility
- Separated concerns into Model, View, and Controller layers
- Improved testability and maintainability

**Why it wasn't chosen**: After careful consideration and user feedback, it became clear that the existing system had fundamental issues:
- The tests didn't reflect reality
- The in-browser code was too fragile
- The system broke frequently
- Memory issues with large repositories were architectural, not just implementation bugs

### [V2 Architecture Overview](./v2-overview.md)
**Status: Current approach**

This document describes the architecture for repo-statter V2, a complete rewrite that addresses all the fundamental issues with V1:

- **Streaming architecture**: Handle repositories of any size without memory issues
- **Server-side rendering**: Move away from fragile browser code
- **Component isolation**: Every feature can be tested in isolation
- **Modern tooling**: Monorepo structure, strict TypeScript, comprehensive testing

The V2 implementation is broken down into 6 phases, with detailed documentation in [`../tasks/v2-implementation/`](../tasks/v2-implementation/).

## Decision Rationale

The decision to build V2 from scratch rather than refactoring V1 was based on:

1. **Fundamental architectural issues**: V1's memory problems and fragility were deeply rooted in the architecture
2. **Test reliability**: V1's tests gave false confidence - they passed but the system still broke in production
3. **Browser code fragility**: Client-side chart generation was unreliable across different environments
4. **Maintenance burden**: Incremental refactoring would have taken 6 weeks with uncertain results

Building V2 from scratch allows us to:
- Apply all lessons learned from V1
- Use modern best practices from the start
- Ensure reliability and performance at every level
- Create a maintainable codebase for the future

## Related Documentation

- [V2 Implementation Plan](../tasks/v2-implementation/) - Detailed phase-by-phase implementation guide
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - High-level architecture concepts
- [Migration Guide](../tasks/v2-implementation/v2-phase-6-testing-strategy-release.md#68-migration-guide) - For users moving from V1 to V2