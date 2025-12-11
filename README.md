# NutriLens

Transform your diet with AI-powered food analysis, personalized tracking, and intelligent meal planning. Upload photos for instant calorie estimation and nutritional insights.

## Features

- 🍎 **AI-Powered Food Recognition** - Upload photos to instantly identify foods and estimate calories
- 💬 **AI Nutritionist Chat** - Get personalized nutrition advice and meal recommendations
- 📊 **Calorie Tracking** - Track your daily meals and monitor nutritional goals
- 📈 **Progress Reports** - Visualize your nutrition trends and progress over time
- 🔐 **Secure Authentication** - User accounts with email verification and Google Sign-In
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Radix UI** components
- **React Router** for navigation
- **Zustand** for state management
- **React Query** for data fetching
- **Recharts** for data visualization

### Backend
- **Flask** (Python) REST API
- **MySQL** database
- **OpenRouter API** for AI chat and vision capabilities

### Testing
- **Vitest** for unit testing
- **Playwright** for end-to-end testing
- **React Testing Library** for component testing

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- MySQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YDahdah/NutriLens.git
cd NutriLens
```

2. Install frontend dependencies:
```bash
npm install
```

3. Set up backend:
```bash
cd flask_backend
pip install -r requirements.txt
```

4. Configure environment variables:
   - Create a `.env` file in `flask_backend/` with:
     - Database credentials
     - `CHAT_API_KEY` for OpenRouter API
     - `SECRET_KEY` for Flask sessions

5. Set up database:
```bash
python setup_database.py
```

6. Start the development servers:
   - Frontend: `npm run dev`
   - Backend: `python app.py`

## Project Structure

```
NutriLens/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── services/          # API service layers
│   ├── contexts/          # React contexts
│   └── utils/             # Utility functions
├── flask_backend/          # Backend Flask application
│   ├── routes/            # API route handlers
│   ├── utils/             # Backend utilities
│   └── tests/             # Backend tests
└── e2e/                   # End-to-end tests
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

## Citations

### APIs and Services

- **OpenRouter API** - Used for AI-powered chat and vision analysis
  - Website: https://openrouter.ai/
  - Documentation: https://openrouter.ai/docs

### Frontend Libraries

- **React** - UI library
  - Website: https://react.dev/
  - License: MIT

- **Vite** - Build tool and dev server
  - Website: https://vitejs.dev/
  - License: MIT

- **Tailwind CSS** - Utility-first CSS framework
  - Website: https://tailwindcss.com/
  - License: MIT

- **Radix UI** - Unstyled, accessible component primitives
  - Website: https://www.radix-ui.com/
  - License: MIT

- **React Router** - Declarative routing for React
  - Website: https://reactrouter.com/
  - License: MIT

- **Zustand** - Lightweight state management
  - Website: https://zustand-demo.pmnd.rs/
  - License: MIT

- **TanStack Query (React Query)** - Data fetching and caching
  - Website: https://tanstack.com/query
  - License: MIT

- **Recharts** - Composable charting library
  - Website: https://recharts.org/
  - License: MIT

- **Lucide React** - Icon library
  - Website: https://lucide.dev/
  - License: ISC

- **React Markdown** - Markdown renderer for React
  - Website: https://remarkjs.github.io/react-markdown/
  - License: MIT

### Backend Libraries

- **Flask** - Web framework for Python
  - Website: https://flask.palletsprojects.com/
  - License: BSD-3-Clause

- **MySQL** - Relational database management system
  - Website: https://www.mysql.com/
  - License: GPL

### Testing Libraries

- **Vitest** - Fast unit test framework
  - Website: https://vitest.dev/
  - License: MIT

- **Playwright** - End-to-end testing framework
  - Website: https://playwright.dev/
  - License: Apache-2.0

- **React Testing Library** - Simple and complete testing utilities
  - Website: https://testing-library.com/react
  - License: MIT

### Development Tools

- **TypeScript** - Typed superset of JavaScript
  - Website: https://www.typescriptlang.org/
  - License: Apache-2.0

- **ESLint** - JavaScript linter
  - Website: https://eslint.org/
  - License: MIT

## License

This project is private and proprietary.

## Contributing

This is a private project. Contributions are not currently accepted.

## Contact

For questions or support, please contact the project maintainer.

