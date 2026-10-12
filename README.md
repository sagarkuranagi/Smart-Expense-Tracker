# Smart Expense Tracker (MERN)

A responsive personal finance tracker built with React + Vite, Express, Node.js, and MongoDB/Mongoose. Includes dashboard summaries, transaction CRUD, search/filtering, and a demo mode when MongoDB is not configured.

 Project Objectives

Simplify income and expense tracking.

Provide a clear overview of personal finances.

Organize transactions by category, type, and date.

Visualize financial activity through charts and summaries.

Support exporting transaction records for personal reporting.

Provide a responsive and user-friendly experience.

✨ Key Features

1. User Authentication

Login and account registration interface.

Form-based authentication.

Protected access to personal financial information, where configured by the backend.

2. Financial Dashboard

Displays total balance, total income, and total expenses.

Presents financial information through summary cards.

Includes cash-flow visualization and quick financial insights.

Displays recent transaction activity.

3. Transaction Management

Add income and expense records.

Enter transaction title, amount, category, date, and optional notes.

Search transactions.

Filter transactions by type and category.

Edit and delete existing transactions.

4. Reports and CSV Export

Select a reporting period.

Review financial records for the selected period.

Export transaction data to a CSV file.

Use exported data for personal records or spreadsheet analysis.

5. Receipt Scanner

Select a receipt image from the device.

Extract available transaction information using browser-based OCR.

Review extracted details before recording the transaction.

Reduce manual data entry when receipt text is readable.

6. Responsive User Interface

Clean layout with a consistent visual design.

Sidebar navigation for key application sections.

Reusable React components.

Responsive styling for different screen sizes.

📸 Application Screenshots
<img width="1915" height="913" alt="image" src="https://github.com/user-attachments/assets/1de689c2-3cf2-4833-93a2-22a0a8c734d0" />
1. Login Page
The login page provides a welcoming entry point to the application. It features a split-screen layout with product branding and introductory text alongside the sign-in form.

Users can enter their email address and password or navigate to the account creation page. The interface uses a clear visual hierarchy, accessible form labels, and a prominent sign-in button.

<img width="1897" height="912" alt="image" src="https://github.com/user-attachments/assets/05fd7dda-e8b5-4baa-b608-cfac1010f113" />

2. Dashboard Overview

The dashboard provides a consolidated view of the user's financial activity. It displays total balance, total income, and total expenses in separate summary cards.
The page also includes reporting controls, cash-flow visualization, quick financial insights, and a recent transactions section. The Add Transaction button provides a direct way to record new financial activity.

This overview helps users understand their current financial position without having to inspect each transaction individually.

<img width="1901" height="913" alt="image" src="https://github.com/user-attachments/assets/3eaa7f57-5157-44e0-85f6-ac88374027ed" />

3. Add Transaction Form

The Add Transaction form allows users to record financial activity by selecting either Expense or Income.

The form contains fields for:

Transaction title.

Amount in Indian rupees (₹).

Category.

Transaction date.

Optional notes.

The receipt-scanning option can help extract information from a receipt image. Users can review the details and submit the form to record the transaction.

This feature supports consistent transaction entry and helps organize financial records.

<img width="1897" height="907" alt="image" src="https://github.com/user-attachments/assets/6f1c143b-3114-4cbf-bf20-39544d104e84" />
4. Transaction Management

The transaction management section displays financial records in a structured table. Each record includes the transaction title, category, date, amount, and transaction type.

Users can search for transactions, filter records by type or category, and use the available edit and delete actions to manage their entries.

Income and expenses use different visual indicators, making the transaction history easier to scan and understand.

<img width="1520" height="287" alt="image" src="https://github.com/user-attachments/assets/7b812e97-4fc6-42df-b280-b7d611195384" />

5. Reports and CSV Export

The Reports and Export section allows users to select a reporting period and download transaction information as a CSV file.

CSV files can be opened in spreadsheet applications such as Microsoft Excel or Google Sheets. This makes it easier to review financial records, maintain personal documentation, or perform additional analysis.

The export controls provide a convenient way to work with financial data outside the application.

<img width="1900" height="911" alt="image" src="https://github.com/user-attachments/assets/1610bf3d-3651-4ae6-8675-2fc1ec7f5fbf" />

6. Receipt Scanner

The receipt scanner is integrated into the transaction entry workflow. Users can select a receipt image and use browser-based OCR to extract readable text, such as merchant information, amounts, and dates when available.

Extracted information should be reviewed and corrected before saving because image quality, formatting, and receipt layouts can affect OCR accuracy.

The goal is to reduce repetitive data entry while keeping the user in control of the final transaction details.


🛠️ Technology Stack

Frontend

React.js

JavaScript

HTML5

CSS3

Vite

Axios

Recharts

Lucide React icons

Backend

Node.js

Express.js

RESTful APIs

Database

MongoDB

Mongoose

Tools and Development

Git

GitHub

Visual Studio Code

Postman

🏗️ Application Architecture

The application follows a client-server architecture.

React frontend: Renders the interface, handles user interactions, and displays financial information.

API communication: Axios sends HTTP requests from the frontend to the backend.

Express backend: Handles incoming requests, validation, authentication routes, transaction operations, and dashboard data.

Database layer: Mongoose models define data structures and interact with MongoDB when database persistence is configured.

Reporting and visualization: Transaction data is used to present financial summaries, charts, and downloadable reports.
