# ToPhD: Your AI-Powered PhD Application Co-Pilot

> Transform your PhD application journey from overwhelming to organized with AI-powered planning, progress tracking, and secure data protection.

**🎓 Personal Project Notice:** ToPhD is a personal open-source project created by an undergraduate student to help future PhD applicants manage their application journey. This is a free tool designed by an undergrad, for undergrads planning graduate school.

---

## 🎯 Why Choose ToPhD?

PhD applications are complex, time-sensitive, and emotionally draining. ToPhD simplifies this journey by providing:

- **🔍 Automated Research** - Program deadlines and requirements discovery
- **🧭 Personalized Planning** - AI-generated roadmaps tailored to your goals  
- **📈 Progress Tracking** - Interactive milestones and achievement monitoring
- **🔒 Privacy Protection** - End-to-end encryption for your sensitive data
- **💬 Well-being Support** - Journaling and reflection tools for mental health

---

## ✨ Key Features

### 🚀 Smart Planning & Tracking
- **AI-Powered Goal Planning**: Input goals like "Apply to Stanford CS PhD for Fall 2027" and receive complete, researched roadmaps
- **Interactive Milestones**: Break down your journey into actionable, trackable tasks
- **Calendar Integration**: Sync deadlines with Google Calendar
- **Dynamic Resource Hub**: Auto-curated links and articles for your specific goals

### 🧠 AI Companion & Insights
- **Customizable Personality**: Choose between encouraging, inspirational, or tough-love AI companions
- **Long-Term Memory**: Hierarchical summaries (day → week → month → year) help your AI remember your journey
- **Progress Insights**: AI-generated reflections on achievements, patterns, and habits

### 📝 Secure Reflection Tools
- **Encrypted Journaling**: Daily reflection with mood tracking and tag search
- **Letters to Future Self**: Write and time-lock letters to track evolving motivations
- **Authenticity Protection**: 7-day cooling-off period prevents hasty edits to journal entries

### 📊 Unified Dashboard
All your goals, reflections, milestones, and insights beautifully organized in one clean interface.

---

## 🔒 Privacy & Security First

ToPhD prioritizes your data security and autonomy:

| Feature | Description |
|---------|-------------|
| **End-to-End Encryption** | Data encrypted on your device before reaching servers |
| **Zero-Knowledge Hosting** | Even hosted version cannot read your data |
| **You Own Your Keys** | Only you can decrypt your data |
| **Full Data Control** | Export or delete your data anytime |
| **Secure Authentication** | Google OAuth 2.0 via NextAuth.js |
| **No Tracking** | Zero third-party trackers or invasive analytics |

> ⚠️ **AI & Calendar Features Note**: To enable AI responses and calendar syncing, select user data (e.g., goals, deadlines) is decrypted on your device and sent to our server, where it's briefly processed before being passed to external services (e.g., Claude Sonnet, Google Calendar). Plaintext data is immediately discarded after processing—nothing is stored—but this step technically breaks full zero-knowledge. See our Privacy Policy for details.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (React 19) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | PostgreSQL + Prisma ORM |
| **Authentication** | NextAuth.js |
| **AI Research** | Perplexity API |
| **AI Planning** | Amazon Bedrock (Claude Sonnet 4) |
| **Deployment** | Vercel-ready |

---

## 🚀 Getting Started

### 🌐 Hosted Version (Recommended)

**Try ToPhD instantly** (link will be available upon launch)

✅ **Benefits:**
- Zero setup required
- Always up-to-date
- Privacy-first architecture
- Fully encrypted (even on servers)
- Completely free to use

*This is a personal open-source project provided free to help undergraduates planning graduate school.*

### 🏠 Self-Hosting

Perfect for developers who want full control over their data and deployment.

---

## 📋 Self-Hosting Setup

### Prerequisites

Before you begin, ensure you have:
- Node.js v18 or higher
- PostgreSQL database
- API keys for:
  - Google OAuth (for authentication)
  - Perplexity (for research features)
  - Amazon Bedrock (for AI planning)

### Step 1: Clone & Install

```bash
git clone https://github.com/your-username/tophd.git
cd tophd
npm install
```

### Step 2: Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secure-nextauth-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Services
PERPLEXITY_API_KEY="your-perplexity-api-key"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
AWS_REGION="us-east-1"
```

### Step 3: Database Setup

```bash
npx prisma generate
npx prisma db push
```

### Step 4: Launch Development Server

```bash
npm run dev
```

Your local ToPhD instance will be available at: **http://localhost:3000**

---

## 🔄 AI Provider Configuration

ToPhD uses Amazon Bedrock + Claude Sonnet 4 by default. To use a different AI provider:

1. Edit `src/features/goals/api/bedrock.ts`
2. Replace API calls with your preferred LLM (OpenAI, Gemini, etc.)
3. Update `.env.local` with the relevant API keys

*Pull requests for additional provider support are welcome!*

---

## 🤝 Contributing

This is a personal open-source project with thoughtful review cycles. Your contributions and patience are appreciated!

### Contribution Priorities

| Type | Priority | Notes |
|------|----------|-------|
| 🔐 **Security fixes** | High | Reviewed quickly |
| 🐛 **Bug fixes** | Medium | Community-driven |
| ✨ **Small features** | Medium | Consider use cases |
| 🏗️ **Major features** | Low | Please discuss first |

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/YourFeature`
3. **Write** clear commits with tests when possible
4. **Push** your changes: `git push origin feature/YourFeature`
5. **Open** a Pull Request with detailed description

### Before Contributing

- 🔒 Report security issues privately to heming@cs.washington.edu
- 💬 Discuss major changes in GitHub Issues first
- 🐛 Include clear reproduction steps for bugs
- ✨ Justify feature requests with real use cases

---

## 📄 License

ToPhD is licensed under the **Business Source License 1.1 (BSL)**.

**Quick Summary:**
- ✅ **Free** for personal, educational, and development use
- ❌ **Commercial hosting** restrictions apply for 4 years
- 🕒 **Converts to MIT** license after 4 years
- ✅ **Source code** available for transparency and contribution

See the LICENSE file in this repository for complete terms.

---

## 💬 Support & Community

- **🐛 Bug Reports & Feature Requests**: GitHub Issues
- **💡 Ideas & Questions**: GitHub Discussions  
- **📧 Contact**: heming@cs.washington.edu
- **🔒 Security Issues**: heming@cs.washington.edu (private)

---

## 📊 Project Status

**Current Status:** Personal Open-Source Project  
**Maintenance:** Best effort by individual developer  
**Support:** Community-driven via GitHub Issues  
**Cost:** Completely free to use

---

<div align="center">

## Ready to Transform Your PhD Journey?

*A personal open-source project built with ❤️ by an undergrad, for undergrads planning graduate school*

**Free • Open source • Privacy-first**

</div>