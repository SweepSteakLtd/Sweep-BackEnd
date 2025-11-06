# API Versioning Guide

## Overview
The API version is **automatically managed** through `package.json` and is displayed in:
- OpenAPI/Swagger documentation
- Root endpoint (`/`)
- Version endpoint (`/version`)
- Server startup logs

## How It Works
The version is imported directly from `package.json` into `src/index.ts`, ensuring a single source of truth.

**🚀 Automatic Versioning:** A `pre-push` git hook (powered by Husky) automatically bumps the patch version and amends it to your commit before every push.

## Automatic Versioning (Default Behavior)

When you push your changes, the pre-push hook will:

1. **Bump the patch version** (1.0.0 → 1.0.1)
2. **Stage the change** to `package.json`
3. **Amend your last commit** with the version bump
4. **Proceed with the push**

### Standard Git Workflow

```bash
# 1. Make your changes
git add .
git commit -m "feat: add new feature"

# 2. Push (version bumps automatically!)
git push

# The hook will:
# - Bump version: 1.0.0 → 1.0.1
# - Amend commit to include version change
# - Push with the updated version
```

## Manual Version Updates

If you need to bump a **minor** or **major** version, do it manually before committing:

```bash
# Bump minor version (1.0.0 -> 1.1.0)
npm run version:minor

# Bump major version (1.0.0 -> 2.0.0)
npm run version:major
```

Or edit `package.json` directly:

```json
{
  "version": "2.0.0"
}
```

Then commit and push as normal (the pre-push hook will see the version was already changed and skip the auto-bump).

## Checking the Version

### Via API Endpoints

**Root endpoint:**
```bash
curl http://localhost:8080/
# Response: API ROOT: ENV: local + NodeJS: v20.x.x + API Version: 1.0.0
```

**Version endpoint (JSON):**
```bash
curl http://localhost:8080/version
# Response:
# {
#   "version": "1.0.0",
#   "environment": "local",
#   "nodeVersion": "v20.x.x"
# }
```

**Swagger UI:**
Visit `http://localhost:8080/swaggerui` - the version is displayed in the API documentation header.

### Via Console
The version is printed when the server starts:
```
APP LISTENING ON PORT 8080, environment: local
API Version: 1.0.0
Running on Node.js version: v20.x.x
```

## Disabling Automatic Versioning

If you need to push without bumping the version (e.g., for documentation-only changes):

```bash
# Skip the pre-push hook
git push --no-verify
```

**⚠️ Use sparingly:** This bypasses the automatic versioning.

## Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0): Incompatible API changes
- **MINOR** version (0.X.0): Backward-compatible new features
- **PATCH** version (0.0.X): Backward-compatible bug fixes (auto-bumped on push)

## How the Pre-Push Hook Works

The `.husky/pre-push` hook script:

1. Runs `npm version patch --no-git-tag-version` to bump the version
2. Stages `package.json` with `git add package.json`
3. Amends the last commit with `git commit --amend --no-edit --no-verify`
4. Allows the push to proceed with the updated version

This ensures every push increments the version automatically, making it easy to track changes and deployments.
