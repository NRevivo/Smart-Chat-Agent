# Review Summarizer - AI-Powered Review Analysis Platform

A full-stack web application that leverages AI to summarize and analyze customer product reviews. Built with modern web technologies, this project demonstrates proficiency in frontend development, backend architecture, database design, and API integration.

## 🚀 Features

- **AI-Powered Review Summarization**: Uses OpenAI's GPT-4o-mini to generate concise summaries of product reviews
- **Real-time Chat Interface**: Interactive chatbot for asking questions about products and reviews
- **Responsive UI**: Modern, user-friendly interface built with React and Tailwind CSS
- **Database Management**: MySQL database with Prisma ORM for efficient data handling
- **Type-Safe Development**: Full TypeScript implementation across frontend and backend
- **Monorepo Architecture**: Scalable project structure with separate client and server packages

## 🤖 Smart Chat Agent

The project includes a sophisticated AI agent capable of handling various types of user requests through intelligent routing and specialized tools:

- **Intent Classification**: Automatically routes user messages to the most appropriate handler:
   - 🌤️ **Weather**: Fetches real-time weather data using OpenWeatherMap API
   - 🧮 **Math**: Performs safety-checked mathematical calculations
   - 💱 **Exchange**: Provides currency exchange rates (ILS)
   - 💬 **General Chat**: Handles conversational queries with full context awareness

- **Context Retention**:
   - Remembers conversation history across messages
   - Persists history to disk (`history.json`)
   - Supports context injection for coherent multi-turn conversations
   - Smart context management with `/reset` command support

- **Tool Integration**:
   - **Weather Tool**: Integration with external weather APIs
   - **Math Tool**: Secure expression evaluation using `mathjs`
   - **Exchange Tool**: Currency rate lookup service

## 🛠 Tech Stack

### Frontend

- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Axios** - HTTP client
- **React Hook Form** - Form state management
- **React Markdown** - Markdown rendering

### Backend

- **Bun** - Fast JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM for database management
- **OpenAI API** - AI-powered review summarization
- **Zod** - Schema validation
- **mathjs** - Secure mathematical evaluation

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Lint-staged** - Pre-commit linting
- **Concurrently** - Run multiple processes simultaneously

## 📦 Project Structure

```
my-app/
├── packages/
│   ├── client/              # React frontend
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── lib/         # Utility functions
│   │   │   └── App.tsx      # Main app component
│   │   └── vite.config.ts
│   └── server/              # Express backend
│       ├── routes.ts        # API routes
│       ├── services/        # Business logic
│       ├── repositories/    # Data access layer
│       ├── controllers/     # Request handlers
│       ├── prisma/
│       │   └── schema.prisma
│       └── prisma.config.ts
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.com) - JavaScript runtime
- Node.js compatible environment
- MySQL database
- OpenAI API key
- OpenWeatherMap API key (for weather features)

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd my-app
```

2. Install dependencies

```bash
bun install
```

3. Set up environment variables
   Create a `.env` file in the root directory:

```env
DATABASE_URL=mysql://user:password@localhost:3306/review_summarizer
OPENAI_API_KEY=your_openai_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

4. Set up the database

```bash
cd packages/server
bunx prisma migrate dev
bunx prisma generate
```

### Running the Application

Run both frontend and backend simultaneously:

```bash
npm run dev
```

Or run individually:

```bash
# Frontend (http://localhost:5173)
npm run dev --prefix packages/client

# Backend (http://localhost:3000)
npm run dev --prefix packages/server
```

## 📱 Usage

1. **View Products & Reviews**: Browse products and their associated customer reviews
2. **Summarize Reviews**: Get AI-generated summaries of product reviews
3. **Chat Interface**: Interactive chat capable of verifying weather, calculating math, checking currency rates, and general conversation with context retention.

## 🔄 API Endpoints

- `GET /api/hello` - Health check
- `GET /api/products/:id/reviews` - Fetch reviews for a product
- `POST /api/chat` - Send message to AI chatbot for review analysis

## 🎯 Key Learnings & Implementation Highlights

- **Monorepo Setup**: Organized project structure with shared dependencies
- **Type Safety**: Full TypeScript implementation ensures code reliability
- **API Integration**: Seamless OpenAI API integration for intelligent summarization
- **Database Optimization**: Prisma v7 configuration with custom datasource management
- **Component Architecture**: Reusable React components with shadcn/ui
- **Error Handling**: Comprehensive error handling across frontend and backend
- **Development Workflow**: Automated formatting and linting with Prettier and ESLint

## 📝 Code Quality

- All code formatted with Prettier
- Linted with ESLint
- Pre-commit hooks with Husky and lint-staged
- Type-safe development with TypeScript

## 🔐 Security

- Environment variables for sensitive configuration
- Input validation with Zod
- Type-safe database queries with Prisma

## 📚 Learning Resources

This project demonstrates proficiency in:

- Full-stack web development
- Modern React patterns and hooks
- TypeScript best practices
- Database design and ORM usage
- REST API development
- AI/LLM integration
- DevOps and deployment considerations

## 📄 License

This project is open source and available under the MIT License.

---

Built with ❤️ as part of an AI Agent course project
