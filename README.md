# 🤝 Contract Buddy  
**Built by a Lawyer for Non-Lawyers**

---

## 🌟 Overview  
As an attorney, I’ve seen many friends struggle to understand or negotiate contracts — not because they’re unwilling, but because hiring a lawyer can be too expensive.  
That’s why I created **Contract Buddy**: a **low-cost, efficient, AI-powered assistant** that helps the **average person** understand, revise, and negotiate contracts with confidence.  

While most contract-review tools focus on **enterprises and legal teams**, Contract Buddy is a **B2C (business-to-consumer)** application designed specifically for **everyday people** — freelancers, renters, small business owners, and anyone signing an agreement.  

---

## 🎯 Mission  
**Empower non-lawyers to understand and negotiate contracts.**  
Contract Buddy bridges the gap between full legal review and self-reliance — helping users see *what matters*, *why it matters*, and *how to fix it*.

---

## ⚙️ Key Features  
- 📄 **Contract Upload:** Supports PDF, DOCX, or plain text  
- 🤖 **Document AI Extraction:** Identifies clauses, parties, and key terms automatically  
- 💬 **Plain-Language Explanations:** No legalese — everything explained like a friend would  
- ✍️ **Smart Recommendations:** Suggests edits and shows *why* each change helps you  
- 🧍 **User Role Selection:** Asks if you’re the **drafting** or **adverse** party and tailors advice  
- 🧠 **AI Clause Rewrites:** Uses GPT-4o to suggest fairer, clearer language  
- 🧾 **Snowflake Data Layer:** Provides industry reference standards for fairness and consistency  

---

## 🧠 How It Works  
1. **Upload your contract** in PDF, DOCX, or text format.  
2. **Document AI** extracts structured data — parties, dates, clauses, amounts.  
3. **System identifies the party**.  
4. **GPT-4o** analyzes each clause and generates:  
   - Plain-language summaries  
   - Suggested improvements  
   - Explanations of why changes help you  
5. **Snowflake** stores and benchmarks data to ensure consistent, high-quality insights.  

---

## 🛠️ Tech Stack  

| Layer | Technology | Purpose |
|-------|-------------|----------|
| **Frontend** | Replit / HTML / JavaScript | User interface for uploads and user interaction |
| **Backend** | Python (Flask) | API and processing logic |
| **Data Layer** | **Snowflake** | Stores structured contract data and industry reference standards |
| **AI Extraction** | **Document AI** | Extracts structured information from uploaded contracts |
| **Intelligent Analysis** | **GPT-4o** | Provides contextual reasoning and generates improved clause language |
| **Storage** | Snowflake / Local File System | Persists user data and analysis results |
| **Deployment** | Replit Cloud / Render | Application hosting and delivery |

---

## 🚀 Development Story  
I built around **50% of Contract Buddy** a few months ago using **Replit**.  
At this hackathon, I completed the project — improving reliability, reducing errors, and integrating **Snowflake** to manage data and contract standards.  

Contract Buddy will be featured in the **Startup Track** of the hackathon.  

---

## 💡 Example Output  
```
📝 Summary:
This is a service agreement outlining payment, responsibilities, and confidentiality.

🔍 Recommended Change:
Clause 5 – Termination
→ Suggest: Add a right for either party to terminate with 14 days' notice.
💬 Why: Creates flexibility and balances risk between both sides.

✅ In plain English:
Add this so you can walk away if the other side stops performing.
```

---

## 🎯 Target Market  
- Everyday consumers signing leases, service or freelance contracts  
- Small business owners or creators negotiating agreements  
- Anyone seeking affordable, easy-to-understand legal insights  

**Value Proposition:**  
Contract Buddy empowers users to understand and negotiate contracts without expensive attorney fees — offering the clarity and confidence they need to protect themselves.  

---

## 🧰 Getting Started  

### Prerequisites  
- Python 3.10+  
- Snowflake account and credentials  
- Google Cloud Document AI credentials  
- OpenAI API key (for GPT-4o)  

### Installation  
```bash
git clone https://github.com/rmannan6/contract-buddy.git
cd contract-buddy
pip install -r requirements.txt
```

### Run the App  
```bash
python app.py
```

Then open your browser and visit:  
**http://localhost:5000**

---

## 🔒 Disclaimer  
Contract Buddy provides **educational information only** and does **not constitute legal advice**.  
Users should consult a qualified attorney for specific legal issues.

---

## 🤝 Contributing  
Pull requests and feature ideas are welcome!  
Please fork the repo, create a feature branch, and submit a PR.

---

## 🏆 Hackathon & Credits  
Developed by **Rosanna Mannan**  
📍 **Startup Track Participant**  
🧑‍⚖️ Built by a **lawyer for non-lawyers** using Replit, Snowflake, Document AI, and GPT-4o.  

📧 [rmannan@alumni.scu.edu]  
🌐 [https://contract-buddy.replit.app/]
