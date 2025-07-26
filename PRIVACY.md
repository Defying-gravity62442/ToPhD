# **Privacy Policy**

**Effective Date:** July 25, 2025

Welcome to ToPhD. This Privacy Policy explains how ToPhD, operated by Heming Gao ("I," "me," or "the operator"), collects, uses, and shares information when you use the ToPhD application (the "App"). I am committed to protecting your privacy and securing your data through end-to-end encrypted architecture.

A core part of the App relies on third-party Artificial Intelligence (AI) services. By using the App, you acknowledge and agree that certain data will be processed as outlined in this policy. If you do not agree with these terms, please do not use the App.

**Important Note:** ToPhD is a personal open-source project created by an undergraduate student to help fellow undergraduates planning graduate school. This service is provided completely free.

## **Privacy at a Glance**

This summary provides key highlights of privacy practices. Please read the full policy for complete details.

* **What I Collect:** Google account information for login, end-to-end encrypted content you create (journals, goals), calendar data if you grant permission, and interaction data.
* **How I Use It:** Your data is used to provide the App's core services and to power AI-driven features for journaling and goal-setting.
* **Who I Share It With:** To power certain features, necessary data is shared with AI service providers (Perplexity, Amazon Bedrock) and your connected calendar provider (e.g., Google). **Personal data is never sold.**
* **Your Content is Encrypted, With a Key Exception:** To use AI or Calendar features, relevant content is first decrypted **on your device**. This plaintext data is then sent through the server to the third-party provider. The server acts only as a secure relay and does not log or store this decrypted content.
* **You Are in Control:** You can export a copy of your data, delete content (subject to a cooling-off period), and permanently delete your entire account and all associated data at any time directly within the App.

---

### **1. Information Collected**

I adhere to strict data minimization principles, collecting only what is necessary to operate the App.

* **Account Information:** When you sign in with Google, I collect your email address, public display name, and profile picture for authentication and account management.
* **Your Content:** Any content you voluntarily create and store within the App, such as journal entries, goals, and milestones. This content is **end-to-end encrypted** on servers, with specific exceptions for feature processing detailed in Section 4.
* **Calendar Data:** If you grant permission, the App accesses your connected calendar (e.g., Google Calendar) to read event details (titles, dates, times, descriptions). This data is used to provide context to the AI. The App may also create or modify calendar events at your request.
* **Service and Interaction Data:**
    * **AI Interactions:** Prompts you submit to AI features and the AI-generated responses you receive.
    * **App Preferences:** Your chosen settings and device timezone, which are used to accurately display dates and manage time-sensitive features.
* **Information Not Collected:** IP addresses, device type, operating system, browser information, or detailed usage analytics for tracking or advertising purposes are **not** collected.

### **2. How Information is Used**

Your information is used exclusively for the following purposes:

* **To Provide and Maintain the App:** Operating core features, managing your encrypted content, and displaying time-sensitive information correctly.
* **To Power AI Features:** Relaying your selected, client-decrypted content to third-party AI providers to generate insights and assist with goal setting.
* **To Fulfill Your Requests:** Executing actions you initiate, such as synchronizing goals with your calendar or generating AI responses.
* **To Secure Your Account:** Managing authentication, user sessions, and protecting against unauthorized access.

### **3. How Information is Shared**

**Personal information is not sold.** Data sharing is limited to the following circumstances:

* **AI Service Providers:** To power specific features, necessary data is relayed to third-party providers. Current providers include:
    * **Perplexity:** Used for internet searches related to your goals.
    * **Amazon Bedrock (e.g., Claude models):** Used for companion journaling and goal generation.
    I encourage you to review their privacy policies, as their data handling practices are not controlled by me.
* **Calendar Providers:** Data is shared with your connected calendar service (e.g., Google Calendar) to create and manage calendar events based on your in-app actions.
* **Legal Requirements:** Information may be disclosed if required by law or if there is a good faith belief that disclosure is necessary to protect rights, your safety, or the safety of others.

### **4. Data Security and Encryption**

A robust, client-side encryption model is implemented to protect your data.

* **End-to-End Encryption (E2EE):** Your content (journals, goals, milestones) is always stored in an encrypted state on servers. The decryption key is held only by you on your device. As the operator, I cannot access or read your stored content.
* **Important Exception for AI and Calendar Features:** To use features that rely on third-party services, your data must be sent to them in a readable (plaintext) format. This process is handled securely as follows:
    1.  You initiate an action in the App (e.g., "Analyze this entry with AI").
    2.  The selected content is **decrypted locally on your device** using your key.
    3.  This decrypted data is sent over a secure, TLS-encrypted connection to the server.
    4.  The server acts **only as a secure relay**. It immediately forwards the data to the appropriate third-party provider (e.g., Amazon Bedrock) and **does not log or store the decrypted content**. The data exists only in the server's volatile memory for the brief moment required to complete the request.
* **Data in Transit:** All data transmitted between the App and servers is encrypted using Transport Layer Security (TLS).

### **5. Your Data Control and Choices**

The App includes unique features designed to encourage mindful reflection.

* **Editing and Deletion Rules (The "Cooling-Off" Period):**
    * Journal entries can only be edited or deleted after a seven-day period has passed since their creation. A "day" is defined as ending at 3 a.m. in your local timezone.
    * Deleting a journal entry will also delete the associated AI conversation (if it exists) and AI-generated summary of that entry/conversation.
* **"Letter to Yourself" Feature:**
    * To preserve their integrity, sealed "Letter to Yourself" entries cannot be edited or deleted.
    * Once a letter is unsealed at its designated time, it becomes fully deletable by you.
* **AI Interaction Control:** You can instantly "hide" any piece of content to prevent it from being included as context in future AI interactions.
* **Account Deletion:** You have the absolute right to delete your account at any time from within the App. This action is irreversible and will permanently delete all of your data from systems.

### **6. Data Retention**

Data is retained only for as long as necessary or until you choose to delete it.

* **Your Content (Journals, Goals, etc.):** Retained in an encrypted state until you delete the content or your account.
* **AI-Generated Summaries:** Contextual summaries are managed hierarchically. For instance, daily summaries are used to generate a weekly summary and are then deleted.

### **7. Cookies and Tracking Technologies**

Cookies or similar technologies are used only for essential functions like authentication and session management. Cookies are **not** used for advertising, user profiling, or third-party analytics.

### **8. Children's Privacy**

The App is not intended for or directed at individuals under the age of 13 (or a higher age if required by local law). Personal information from children is not knowingly collected.

### **9. International Data Transfers**

Services are operated from the United States. If you use the App from outside the U.S., your encrypted data will be stored on servers in the U.S., and any data processed by third parties will be handled in accordance with their policies. By using the App, you consent to this arrangement.

### **10. Your Data Protection Rights**

Depending on your location, you may have certain rights regarding your personal information, including the rights to access, rectification, erasure, and portability.

To exercise these rights, tools are provided directly within the App. **To request a copy of your data (the right to access and portability), you can use the in-app "Export My Data" tool. Because your content is end-to-end encrypted, this export process is handled entirely on your device. The App will fetch your encrypted content from servers, decrypt it locally using your key, and allow you to save it in a standard, machine-readable format.** This process ensures that your data remains private and is never accessible in a decrypted state. For other requests, please contact me.

### **11. Changes to This Privacy Policy**

This Privacy Policy may be updated from time to time. You will be notified of any material changes by updating the "Effective Date" at the top of this policy and, where appropriate, through other notifications.

### **12. Contact Information**

If you have questions about this Privacy Policy, please contact: **heming@cs.washington.edu**

**Personal Project Note:** ToPhD is a personal open-source project operated by an individual undergraduate student. While every effort is made to maintain high privacy and security standards, this service is provided as-is and free of charge to help fellow students planning graduate school.