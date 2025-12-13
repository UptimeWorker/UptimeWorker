# Contributing to UptimeWorker

Thank you for your interest in contributing to UptimeWorker! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)

### Suggesting Features

Feature requests are welcome! Please:
- Check existing issues first to avoid duplicates
- Provide clear use cases and examples
- Explain why this feature would be useful

### Pull Requests

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes**:
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed
3. **Test your changes**:
   ```bash
   npm install
   npm run dev
   npm run build
   ```
4. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Reference related issues (e.g., "Fix #123")
5. **Push to your fork** and create a pull request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/uptimeworker.git
cd uptimeworker

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Create your monitors configuration
cp monitors.json.example monitors.json
# Edit monitors.json with your test services

# Start development server
npm run dev

# Run tests (when available)
npm test

# Build for production
npm run build
```

### Code Style

- TypeScript for all source files
- React 19 with functional components and hooks
- Tailwind CSS for styling
- Follow existing patterns in the codebase

### Commit Messages

Use clear, descriptive commit messages:
- `feat: Add new monitoring feature`
- `fix: Resolve timeline rendering issue`
- `docs: Update installation guide`
- `refactor: Simplify status calculation logic`

### Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

### License

By contributing, you agree that your contributions will be licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.

## Questions?

Feel free to open an issue for any questions or concerns.

Thank you for contributing! 🚀
