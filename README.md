# SmartMarks

## Overview
SmartMarks is a Chrome extension for intelligent bookmark management. It provides features to organize, categorize, and search through your bookmarks efficiently.

## Features
- Smart categorization of bookmarks
- Advanced search capabilities
- Bookmark suggestions based on browsing patterns
- Synchronization across devices
- Customizable organization

## Architecture
SmartMarks follows clean architecture principles, with clear separation of concerns:
- Core domain logic is independent of frameworks
- Layered design with dependency rules flowing inward
- Integration with Chrome's bookmark API through adapter pattern

## Development
### Prerequisites
- Node.js (v16+)
- npm or yarn

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

3. Development build
```
npm run dev
```

4. Production build
```
npm run build
```

## Testing
SmartMarks follows Test Pyramid approach:
```
npm test          # Run unit tests
npm run test:e2e  # Run end-to-end tests
```

## Security
This extension follows OWASP security guidelines and minimizes required permissions.

## License
MIT
