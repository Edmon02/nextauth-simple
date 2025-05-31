# Publishing Guide for nextauth-simple

This guide walks you through the process of publishing new versions of the nextauth-simple library to npm.

## Prerequisites

1. Make sure you're logged in to npm:
```bash
npm whoami
```
If not logged in, run:
```bash
npm login
```

## Publishing Process

### 1. Before Making Changes

1. Switch to the library directory:
```bash
cd packages/nextauth-simple
```

2. Make sure you're on the main branch and it's up to date:
```bash
git checkout main
git pull origin main
```

### 2. Making Changes

1. Create a new branch for your changes:
```bash
git checkout -b feature/your-feature-name
```

2. Make your code changes
3. Update tests if necessary
4. Run tests to make sure everything works:
```bash
npm test
```

### 3. Pre-publish Checklist

1. Update documentation if needed:
   - README.md
   - Code comments
   - Example usage

2. Make sure all files are building correctly:
```bash
npm run build
```

3. Run tests again to verify everything:
```bash
npm test
```

### 4. Version Update

Depending on the type of changes, run ONE of these commands:

- For bug fixes (0.1.0 -> 0.1.1):
```bash
npm version patch
```

- For new features (0.1.0 -> 0.2.0):
```bash
npm version minor
```

- For breaking changes (0.1.0 -> 1.0.0):
```bash
npm version major
```

These commands will:
- Update the version in package.json
- Create a git tag
- Create a commit with the version change

### 5. Publishing

1. Do a dry run first to check what will be published:
```bash
npm publish --dry-run
```

2. If everything looks good, publish for real:
```bash
npm publish
```

### 6. Post-publish Steps

1. Push your changes and tags to GitHub:
```bash
git push origin feature/your-feature-name
git push origin --tags
```

2. Create a pull request on GitHub

3. After merge, update main branch:
```bash
git checkout main
git pull origin main
```

### 7. Verify Publication

1. Check that your package is available:
```bash
npm view nextauth-simple
```

2. Verify the new version is listed under versions

## Version Guidelines

- PATCH (0.0.X): Bug fixes and minor changes
  - Bug fixes
  - Documentation updates
  - Non-breaking internal improvements

- MINOR (0.X.0): New features
  - New features that don't break existing functionality
  - Adding new optional parameters
  - Performance improvements

- MAJOR (X.0.0): Breaking changes
  - API changes that break backward compatibility
  - Removing features or parameters
  - Major architecture changes

## Common Issues

### Package Not Publishing
1. Check you're logged in: `npm whoami`
2. Verify package.json is valid
3. Make sure tests are passing
4. Check npm registry status: https://status.npmjs.org/

### Version Conflict
If npm says the version already exists:
1. Check current version: `npm view nextauth-simple version`
2. Make sure you've updated the version number
3. Check git tags: `git tag`

## Testing Published Version

To test the published version in a new project:

```bash
# Create a test project
mkdir test-nextauth
cd test-nextauth
bun init -y

# Install the published package
bun add nextauth-simple

# Verify it works in your test project
