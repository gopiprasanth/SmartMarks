# SmartMarks

## Overview
SmartMarks is a Chrome extension for intelligent bookmark management. It provides features to organize, categorize, and search through your bookmarks efficiently.

## Features
- Smart categorization of bookmarks (v1 rule-based + optional v2 LLM-assisted)
- Advanced search capabilities
- Bookmark suggestions based on browsing patterns
- Synchronization across devices
- Customizable organization

## Current Status (As of May 2025)
### Available Features:
- Basic extension with bookmark event detection (listening for bookmark creation)
- Bookmark data collection and parsing functionality
- Analysis of bookmark folder structures
- Basic UI feedback in the popup interface
- Basic suggestion algorithm with keyword matching
- Folder suggestion modal when saving the current page
- Intelligent folder creation and naming from page domain/title
- User preference learning from accepted folder suggestions
- Expanded options page settings for smart suggestion behavior
- Categorization V2 with optional LLM providers (OpenAI, Claude, Gemini, OpenAI-compatible local/remote models like Llama via Ollama)

### Coming Soon:
- ML/NLP integration for improved suggestion accuracy

## Architecture
SmartMarks follows a modular architecture with clear separation of concerns:

### Core Components
- **Background Service**: Runs persistently to handle bookmark events and extension lifecycle
- **Bookmark Services**: Core domain logic for bookmark analysis and suggestions
- **Chrome API Adapters**: Isolates browser-specific functionality
- **Logging System**: Structured logging with configurable levels

### Architectural Principles
- **Separation of Concerns**: Each module has a single responsibility
- **Clean Code**: Following SOLID principles for maintainable code
- **Dependency Injection**: Services are loosely coupled for testability
- **Event-Driven Design**: Utilizing Chrome's event system for real-time responses

### Directory Structure
```
src/
  ├── background/         # Background service and initialization
  │   └── services/       # Background-specific services
  └── common/             # Shared functionality
      ├── services/       # Core business logic services
      └── utils/          # Utility functions and helper classes
```

### Data Flow
1. Chrome events trigger bookmark handlers
2. Services process bookmark data and extract meaningful information
3. Suggestion algorithms identify relevant folders
4. UI components present recommendations and options to users


### How the Smart Algorithm Works
When SmartMarks evaluates where to save a new bookmark, it runs a lightweight scoring pipeline:

1. **Keyword Extraction**
   - Extracts keywords from bookmark title and URL.
   - Normalizes to lowercase and removes punctuation.
   - Drops short/common stop-words (e.g., `http`, `www`, `the`).

2. **Folder Candidate Scoring**
   - Each existing folder gets a relevance score.
   - Folder keyword matches are weighted highest.
   - Folder path/domain similarity adds extra score (e.g., docs URL matching a “Docs” folder).

3. **Personalization Boost**
   - If users repeatedly choose a folder from suggestions, SmartMarks stores that preference.
   - Future suggestions receive a small boost for those preferred folders.

4. **Top-N Suggestions**
   - Folders are sorted by score and top matches are returned to the popup UI.
   - The user can choose a suggested folder, save to default location, or create a new intelligent folder.

5. **Intelligent Folder Creation (Fallback)**
   - When needed, SmartMarks proposes/creates a folder name from domain/title patterns
     (example: `docs.python.org` → **Docs Resources**).
   - The bookmark can then be saved directly into the newly created folder.

### Algorithm V2 (Optional LLM-Assisted Categorization)
SmartMarks now supports an optional V2 flow that preserves V1 as the default behavior.

1. **Configuration Gate**
   - `categorizationSettings.categorizationVersion` defaults to `v1`.
   - V2 activates only when `categorizationVersion = v2` and `llm.enabled = true`.

2. **Provider Abstraction Layer**
   - A provider-neutral `LLMCategorizer` delegates to provider clients:
     - OpenAI (`/chat/completions`)
     - Anthropic Claude (`/messages`)
     - Gemini (`:generateContent`)
     - OpenAI-compatible endpoints for local/remote/self-hosted models (e.g., Ollama/Llama).

3. **LLM Prompting**
   - SmartMarks sends bookmark title + URL + candidate folders (id/title/path/keywords).
   - The model is asked for strict JSON suggestions with confidence scores.

4. **Safe Fallback**
   - If model/API output is invalid or empty, SmartMarks automatically falls back to V1 heuristic ranking.

5. **Bring Your Own Model / Key**
   - Users can provide API key, model name, and optional base URL in Options.
   - OpenAI-compatible mode supports local and remote hosted models.

> **Default remains V1** for deterministic performance and zero external dependency.
> **V2 is opt-in** for semantic categorization improvements when users want LLM assistance.

### Technical Stack
- **TypeScript**: For type-safe development
- **Chrome Extension APIs**: For browser integration
- **Webpack**: For bundling and optimization
- **Jest**: For comprehensive testing
- **Playwright**: For end-to-end testing

## Development
### Prerequisites
- Node.js (v16+)
- npm or yarn
- Google Chrome or Chromium-based browser

### Setup
1. Clone the repository
```
git clone https://github.com/yourusername/SmartMarks.git
cd SmartMarks
```

2. Install dependencies
```
npm install
```

### Building the Extension

#### Development Build
```
npm run dev
```
This starts webpack in watch mode, which will automatically rebuild when files change.

#### Production Build
```
npm run build
```
This creates an optimized production build with minified assets in the `dist` folder.

### Project Structure
- `src/background`: Background scripts for the extension
- `src/common`: Shared utilities and services
- `styles`: CSS files for the extension UI
- `tests`: Test files organized by type (unit, integration, e2e)

### Loading the Extension in Chrome
1. Build the extension using one of the commands above
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the `dist` directory from your project
5. The extension should now appear in your browser toolbar

### Environment Configuration
The extension supports different environments:
- Create `.env.development` or `.env.production` files to set environment-specific variables
- Reference webpack.config.js for environment variable usage

## Testing
SmartMarks follows the Test Pyramid approach with comprehensive testing at all levels:

### Running Tests

#### All Tests
```
npm test
```

#### Unit Tests
```
npm run test:unit
```
Unit tests verify individual components and functions in isolation using Jest.

#### Integration Tests
```
npm run test:integration
```
Integration tests verify that components work correctly together.

#### End-to-End Tests
```
npm run test:e2e
```
E2E tests use Playwright to verify the extension works correctly in a browser environment.

### Test Coverage
Generate and view code coverage reports:
```
npm run test:coverage
```
This creates a detailed coverage report in the `coverage` directory. Open `coverage/lcov-report/index.html` in your browser to view the report.

### Debugging Tests
1. For unit/integration tests:
   ```
   npm run test:debug
   ```
   This runs tests with the Node.js debugger enabled.

2. For E2E tests:
   ```
   npm run test:e2e:debug
   ```
   This runs E2E tests with the Playwright debugger enabled.

## Security
This extension follows OWASP security guidelines and minimizes required permissions.

## License
MIT
