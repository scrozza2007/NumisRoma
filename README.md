# NumisRoma 🏛️

**NumisRoma** is the ultimate web app for enthusiasts of Roman imperial coins. Built with **React** and **Node.js**, it allows you to explore and catalog ancient coins like a true numismatist. Without registration, you can browse freely, but if you register, you can manage your personal collection with peace of mind.

## 🚀 Key Features

- **Open Catalog**: Freely explore the database of Roman imperial coins and identify the ones that interest you.
- **Collection Management**: If you're registered, add your coins to the database and build your digital collection.
- **Custom Privacy**: Want your collection to be visible to everyone or just yourself? No problem, you can choose!
- **Expandability**: In the future, NumisRoma will include republican and provincial coins to enrich your catalog.

## 🛠️ Technologies Used

- **Frontend**: 
  - React with Next.js
  - Tailwind CSS for styling
  - Cypress for E2E testing
- **Backend**: 
  - Node.js
  - Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm (v9 or higher)
- Docker and Docker Compose (for containerized deployment)
- Git

## 🛠️ Installation

1️⃣ **Clone the repository**  
```bash
git clone https://github.com/scrozza2007/NumisRoma.git
cd NumisRoma
```

2️⃣ **Install dependencies**  
   - **Backend**:  
   ```bash
   cd backend
   npm install
   ```
   - **Frontend**:  
   ```bash
   cd ../frontend
   npm install
   ```

3️⃣ **Start the application**  
   - **Start the backend**:  
   ```bash
   cd backend
   npm start
   ```
   - **Start the frontend**:  
   ```bash
   cd frontend
   npm start
   ```

The app will be available at [http://localhost:3000](http://localhost:3000).

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. Make sure you have Docker and Docker Compose v2 installed (available by default with Docker v20.10+)
2. From the root directory, run:
   ```bash
   docker compose up --build
   ```
   This will build and start both frontend and backend containers.

### Manual Docker Deployment

#### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Build the Docker image:
   ```bash
   docker build -t numisroma-backend .
   ```
3. Run the container:
   ```bash
   docker run -p 4000:4000 numisroma-backend
   ```

#### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Build the Docker image:
   ```bash
   docker build -t numisroma-frontend .
   ```
3. Run the container:
   ```bash
   docker run -p 3000:3000 numisroma-frontend
   ```

The application will be available at [http://localhost:3000](http://localhost:3000).

## 🧪 End-to-End Testing (Cypress)

**How to run tests with Cypress**

   1. Make sure you have installed all dependencies (`npm install`)
   2. Start **both backend and frontend**
   3. From a new terminal window, run:

   ```bash
   cd frontend
   npm run cypress:open
   ```

   4. Choose a browser and click on a test to start it

## 📂 Project Structure

```
numisroma/
├── backend/                # Server
│   ├── src/               # Source code
│   ├── Dockerfile         # Backend container configuration
│   └── package.json       # Backend dependencies
├── frontend/              # React + Next.js application
│   ├── components/        # React components
│   ├── pages/            # Next.js pages
│   ├── public/           # Static assets
│   ├── styles/           # CSS and styling files
│   ├── cypress/          # End-to-end tests
│   ├── Dockerfile        # Frontend container configuration
│   └── package.json      # Frontend dependencies
└── README.md             # This file!
```

## 🔧 Development

### Code Style
- ESLint is configured for code quality
- Follow the existing code style and formatting
- Use meaningful commit messages

### Adding New Features
1. Create a new branch from `main`
2. Implement your changes
3. Add tests if applicable
4. Submit a pull request

## 🤝 How to Contribute

1. Fork the repository and create a new branch.
2. Add your changes and test them.
3. Create a **pull request** for review.

Every suggestion and improvement is welcome!

## 📜 License

All rights reserved. This software may not be used, copied, modified, distributed, sold, or made available to third parties without the explicit permission of the copyright owner.

## 📬 Contact

Have questions or ideas? Contact me on GitHub!

## 🙏 Acknowledgments

- Thanks to all contributors who have helped shape NumisRoma
- Special thanks to the numismatic community for their valuable feedback
