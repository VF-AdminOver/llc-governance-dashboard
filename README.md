# 🏠 LLC Governance Dashboard

A comprehensive member-managed governance and finance hub for multi-adult families and LLCs. Features voting portal, dividend tracking, document vault, and fair cost sharing with unit-based calculations.

## 🌟 Core Features

### **🔐 Authentication & Role-Based Access**
- **User Registration/Login**: Secure password hashing with bcrypt
- **Roles**: Admin (full access), Member (standard), Youth (read-only)
- **Session Management**: Persistent sessions with role-based permissions
- **Household Assignment**: Users linked to specific households

### **🗳️ Voting Portal**
- **Proposal Creation**: Title, description, multiple choice options
- **Quorum Enforcement**: Configurable percentage (e.g., 50%)
- **Approval Thresholds**: 51% for transfers, 75% for dissolution
- **Auditable Vote Log**: Who voted what, with timestamps
- **Real-time Results**: Live vote counting and status updates

### **💰 Dividend Tracker**
- **Member Profiles**: Ownership percentage, contribution history
- **Distribution Records**: Per-member dividend breakdowns
- **Reinvestment Tracking**: Revested vs. distributed amounts
- **Automatic Calculations**: Based on ownership and contributions
- **Historical Ledger**: Complete dividend history

### **📄 Document Vault**
- **Secure Storage**: Upload/download governance documents
- **Core Documents**: Operating Agreement, Voting Guide, Dividend Policy
- **Version Control**: Track document changes over time
- **Access Control**: Role-based document permissions
- **File Types**: Support for PDF, DOCX, and other formats

### **🏢 Household Finance Management**
- **Fair Cost Sharing**: Unit-based method with adult/child units
- **Income Caps**: Maximum percentage of income for contributions
- **Care Work Compensation**: Credit or stipend models
- **Emergency Funds**: Target-based planning
- **Expense Tracking**: Category-based expense logging

### **📊 Governance & Decision Making**
- **Monthly Councils**: Structured meeting agendas
- **Decision Tracking**: Log all governance decisions
- **Large Purchase Policy**: Threshold-based approvals
- **Audit Trails**: Complete history of all actions

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- npm package manager
- SQLite (automatically handled)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/VF-AdminOver/family-llc-final.git
   cd family-llc-final
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

4. **Access the app**
   - Desktop: Electron window opens automatically
   - Web: Navigate to `http://localhost:3000`

### User Setup
1. **Register**: Create admin account first
2. **Create Household**: Set up your LLC/family structure
3. **Add Members**: Register all members with roles
4. **Configure Rules**: Set quorum, thresholds, dividend policies

### Available Scripts
```bash
npm run start      # Start backend server only
npm run electron   # Start Electron app only
npm run dev        # Start both concurrently
```

### Docker Deployment
The app includes Docker support for easy containerized deployment.

#### Using Docker Compose (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop the container
docker-compose down
```

#### Using Docker Directly
```bash
# Build the image
docker build -t family-llc-dashboard .

# Run the container
docker run -p 3000:3000 -v $(pwd)/data:/app/data family-llc-dashboard
```

### macOS Standalone App
The app can be built into a native macOS application using Electron Builder.

#### Building the App
```bash
npm run dist
```
This creates `.dmg` and `.zip` files in the `dist/` folder.

#### Installing the App
1. Download the appropriate `.dmg` file from the [Releases](https://github.com/VF-AdminOver/family-llc-final/releases) page
2. Open the `.dmg` file
3. Drag the app to your Applications folder

#### Troubleshooting: "File is damaged" Error
The built app is not code-signed (requires Apple Developer Program membership). To run it:

**macOS 13 (Ventura) and later:**
1. Go to System Settings > Privacy & Security
2. Scroll down and click "Open Anyway" next to the blocked app
3. Confirm you want to open the app

**Alternative:**
```bash
# Right-click the app and select "Open"
# In the dialog, click "Open" again
```

For production use, the app would need proper code signing through Apple's Developer Program.

The Docker setup includes:
- Node.js 18 Alpine image
- Persistent SQLite database storage
- Automatic restart on failure
- Production environment configuration

## 📖 Usage Guide

### **Authentication**
- Register new users with username, password, and role
- Login to access the dashboard
- Roles determine feature access

### **Household Management**
- Create or join households
- Add members with ownership percentages
- Configure governance rules (quorum, thresholds)

### **Voting System**
- Create proposals with multiple options
- Members vote on active proposals
- Automatic quorum and threshold enforcement
- View voting history and results

### **Dividend Management**
- Track member ownership and contributions
- Create dividend distributions
- Monitor reinvestment history
- Generate reports

### **Document Management**
- Upload governance documents
- Organize by category
- Access control based on roles
- Download documents securely

### **Finance Features**
- Unit-based cost sharing calculations
- Expense tracking and categorization
- Care work compensation
- Emergency fund planning

## 🔧 API Reference

### Authentication Endpoints
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user info

### Household Endpoints
- `GET /api/households` - Get user's households
- `POST /api/households` - Create household (admin)
- `GET /api/households/:id` - Get household details
- `POST /api/households/:id/members` - Add member (admin)

### Voting Endpoints
- `GET /api/proposals` - Get proposals
- `POST /api/proposals` - Create proposal
- `GET /api/proposals/:id` - Get proposal details
- `POST /api/proposals/:id/vote` - Cast vote

### Dividend Endpoints
- `GET /api/dividends` - Get dividends
- `POST /api/dividends` - Create dividend (admin)

### Document Endpoints
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document (admin)
- `GET /api/documents/:id/download` - Download document

### Finance Endpoints
- `GET /api/households/:id/expenses` - Get expenses
- `POST /api/households/:id/expenses` - Add expense
- `GET /api/households/:id/calculate` - Calculate unit costs

## 📋 Onboarding Process

### 1. Household Basics
- **Name**: Your household identifier
- **Currency**: Primary currency for all calculations
- **Adults**: 3-5 adult members with names and net incomes
- **Children**: Count and unit weight for cost sharing

### 2. Financial Settings
- **Income Cap**: Maximum percentage of income for Core (5%-60%)
- **Care Model**: Choose between credit or stipend approach
- **Care Rate**: Hourly compensation for care work
- **Vision Allocation**: Percentage for long-term goals (0%-50%)

### 3. Emergency & Sinking Funds
- **Emergency Months**: Target months of Core expenses
- **Sinking Funds**: JSON array of annual targets and accounts

### 4. Governance
- **Quorum Requirements**: For routine and major decisions
- **Purchase Thresholds**: Automatic approval levels

## 💰 How the Unit Method Works

### Basic Calculation
```
totalUnits = numberAdults × 1.0 + totalChildUnits
unitCost = coreTotal / totalUnits
prelimShare[i] = unitCost × (1.0 + assignedChildUnits[i])
```

### Income Caps
```
capAmount[i] = capPercent × netIncome[i]
finalShare[i] = MIN(prelimShare[i], capAmount[i])
```

### Rebalancing
When caps create imbalances, the system automatically rebalances across uncapped adults proportionally until the difference from Core total is within $0.01.

### Example
- **3 adults, 4 children** with childUnitWeight = 0.6
- **Total units**: 3 + (4 × 0.6) = 5.4
- **Core total**: $6,000
- **Unit cost**: $6,000 ÷ 5.4 = $1,111.11
- **Each adult gets**: 1.0 + 1.2 = 2.2 units
- **Preliminary share**: $1,111.11 × 2.2 = $2,444.44

## 🔄 Monthly Workflow

### 1. **Period Setup**
- Set Core total for the month
- Assign child units (must balance to zero)
- Set optional overrides

### 2. **Calculation**
- Run unit method with caps and rebalancing
- Apply care ledger (credits or stipends)
- Plan vision and buffer allocations

### 3. **Review & Adjust**
- Review all calculations and warnings
- Adjust parameters if needed
- Validate child unit assignments

### 4. **Close Month**
- Lock period to prevent changes
- Generate council agenda
- Export all documents and data

## 📊 Care Ledger Models

### Credit Model
- Care work hours × hourly rate = credit amount
- Credit reduces next month's Core contribution
- Example: 10 hours × $20/hour = $200 credit

### Stipend Model
- Care work hours × hourly rate = stipend payment
- Stipend paid from Core budget
- Increases next month's Core total

## 🎯 Vision & Buffers

### Emergency Fund
- Target: `emergencyMonths × monthlyCore`
- Status tracking: building, maintaining, fully funded
- Priority: Highest

### Sinking Funds
- **Priority 1**: Emergency-related (medical, deductibles)
- **Priority 2**: Home and vehicle maintenance
- **Priority 3**: Other goals and expenses

### Monthly Transfers
- Calculated as `annualTarget ÷ 12`
- Automatic prioritization
- Balance checking against vision allocation

## 🏛️ Governance System

### Council Meetings
- **Duration**: 60 minutes monthly
- **Agenda**: 7 structured sections
- **Minutes**: Template with action items
- **Calendar**: ICS file for scheduling

### Decision Making
- **Routine**: Simple majority with routine quorum
- **Major**: Higher quorum requirements
- **Large Purchases**: Threshold-based approval
- **Unanimous**: Required for high-value items

### Voting Members
- All listed adults are voting members
- Quorum requirements are configurable
- Decision logging with timestamps

## 📁 Data Export

### Available Formats
- **Charter Document**: DOCX with styling
- **Calculator Sheet**: Excel with formulas
- **Council Calendar**: ICS file
- **CSV Files**: Decisions, amendments, minutes
- **JSON Export**: Complete household data

### Export Timing
- **Onboarding**: Initial charter and calculator
- **Monthly Close**: All period documents
- **On Demand**: Current household configuration

## 🔧 Technical Architecture

### Backend
- **Node.js/Express**: RESTful API server
- **SQLite Database**: Persistent data storage
- **bcrypt**: Secure password hashing
- **express-session**: Session management
- **CORS**: Cross-origin support

### Frontend
- **HTML/CSS/JavaScript**: Bootstrap responsive UI
- **Electron**: Cross-platform desktop app
- **Fetch API**: Client-server communication
- **Real-time Updates**: Dynamic content loading

### Database Schema
- **users**: Authentication and roles
- **households**: Family/LLC configurations
- **members**: Household members with ownership
- **proposals**: Voting proposals and options
- **votes**: Auditable voting records
- **dividends**: Distribution records
- **dividend_distributions**: Per-member breakdowns
- **documents**: Secure file storage
- **expenses**: Financial tracking

### Security Features
- Password hashing with bcrypt
- Role-based access control
- Session-based authentication
- Input validation and sanitization
- File upload security

## 🧪 Testing the System

### Test Case
The system includes a built-in test case:
- **3 adults** with incomes [$4,500, $3,200, $2,800]
- **4 children** with childUnitWeight = 0.6
- **Core total**: $6,000
- **Cap percent**: 30%

### Expected Results
- **Total units**: 5.4
- **Unit cost**: $1,111.11
- **Preliminary shares**: $2,444.44 each
- **Cap amounts**: [$1,350, $960, $840]
- **Result**: All adults capped, deficit warning

## 🚨 Error Handling

### Validation Errors
- Input validation with clear error messages
- Child unit balance checking
- Income and percentage range validation
- Required field enforcement

### Calculation Warnings
- **Deficit after caps**: When income caps prevent reaching Core total
- **Rebalancing limits**: Maximum iteration warnings
- **Vision allocation**: Insufficient funds for sinking funds

### Recovery Options
- Adjust Core total or reclassify items
- Temporarily increase cap percentage
- Set manual overrides
- Revise sinking fund targets

## 🔒 Security & Privacy

### Data Protection
- Input sanitization and validation
- No external data transmission
- Local storage only (development)
- Secure headers with Helmet

### Access Control
- **Admin**: Full household management
- **Adult**: Income, care, voting access
- **ReadOnly**: Reports and documents only

## 🚀 Production Deployment

### Environment Variables
```bash
PORT=3000
NODE_ENV=production
```

### Database Integration
Replace in-memory storage with:
- PostgreSQL for relational data
- Redis for caching
- File storage for documents

### Security Enhancements
- HTTPS enforcement
- Rate limiting
- Authentication system
- Audit logging

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/family-llc-final.git`
3. Install dependencies: `npm install`
4. Start development: `npm run dev`

### Code Standards
- ES6+ JavaScript with modules
- Consistent error handling
- RESTful API design
- SQLite for data persistence
- Role-based security

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

### Common Issues
- **Login fails**: Check username/password, ensure user is registered
- **Permission denied**: Verify your role has access to the feature
- **Voting not working**: Ensure proposal has quorum settings
- **File upload fails**: Check file size and format restrictions

### Getting Help
- Check browser console for errors
- Verify API responses in Network tab
- Ensure database is properly initialized
- Check server logs for backend errors

## 🎯 Governance Rules

### Quorum Requirements
- **Routine decisions**: 50% of members
- **Major decisions**: 75% supermajority
- **Share transfers**: 51% approval
- **Dissolution**: 75% supermajority

### Dividend Distribution
- Based on ownership percentages
- Reinvestment tracking
- Historical ledger maintenance

### Document Management
- Operating Agreement
- Voting System Guide
- Dividend Distribution Policy
- Youth Onboarding Plan

---

**Built with ❤️ for families and LLCs seeking transparent governance and fair financial management.**
