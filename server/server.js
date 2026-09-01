import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { PDFParse } from "pdf-parse";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


async function extractPDFText(buffer) {
  const parser = new PDFParse({
    data: buffer
  });

  const result = await parser.getText();

  await parser.destroy();

  return result.text;
}


async function extractTransactions(text) {

  const schema = {
    type: "object",
    properties: {
      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: {
              type: "string"
            },
            description: {
              type: "string"
            },
            amount: {
              type: "number"
            },
            type: {
              type: "string",
              enum: ["debit", "credit"]
            },
            category: {
              type: "string",
              enum: [
                "Food",
                "Shopping",
                "Transport",
                "Bills",
                "Entertainment",
                "Healthcare",
                "Education",
                "Rent",
                "Travel",
                "Salary",
                "Transfer",
                "Other"
              ]
            },
            confidence: {
              type: "number"
            }
          },
          required: [
            "date",
            "description",
            "amount",
            "type",
            "category",
            "confidence"
          ]
        }
      }
    },
    required: ["transactions"]
  };


  const prompt = `
You are a financial transaction extraction system.

Extract every transaction from this bank statement.

Rules:

- Do not invent transactions.
- Amount must be numeric.
- Debit means money leaving the account.
- Credit means money entering the account.
- Categorize every transaction.
- Ignore account numbers, balances, headers and other non-transaction information.
- Preserve merchant names.
- confidence must be between 0 and 1.
- Give lower confidence when the category is ambiguous.

BANK STATEMENT:

${text}
`;


  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema
        }
      }
    }
  });


  let raw = response.text.trim();

  // Remove Markdown code fences if Gemini adds them
  raw = raw.replace(/^```json\s*/i, "");
  raw = raw.replace(/^```\s*/i, "");
  raw = raw.replace(/\s*```$/i, "");

  return JSON.parse(raw);

  
}


function calculateHealthScore(transactions) {

  const income = transactions
    .filter(t => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);


  const savings = income - expenses;

  const savingsRate =
    income > 0
      ? (savings / income) * 100
      : 0;


  let savingsScore;

  if (savingsRate >= 30) {
    savingsScore = 30;
  } else if (savingsRate >= 20) {
    savingsScore = 25;
  } else if (savingsRate >= 10) {
    savingsScore = 18;
  } else if (savingsRate >= 0) {
    savingsScore = 10;
  } else {
    savingsScore = 0;
  }


  const discretionaryCategories = [
    "Shopping",
    "Entertainment",
    "Food",
    "Travel"
  ];


  const discretionary = transactions
    .filter(
      t =>
        t.type === "debit" &&
        discretionaryCategories.includes(t.category)
    )
    .reduce((sum, t) => sum + t.amount, 0);


  const discretionaryRate =
    income > 0
      ? discretionary / income
      : 0;


  let spendingScore;

  if (discretionaryRate < 0.2) {
    spendingScore = 25;
  } else if (discretionaryRate < 0.3) {
    spendingScore = 20;
  } else if (discretionaryRate < 0.4) {
    spendingScore = 12;
  } else {
    spendingScore = 5;
  }


  const recurring = detectRecurring(transactions);

  let recurringScore =
    recurring.length <= 2
      ? 10
      : recurring.length <= 4
      ? 7
      : 4;


  const anomalies = detectAnomalies(transactions);

  const anomalyScore =
    anomalies.length === 0
      ? 15
      : anomalies.length <= 2
      ? 10
      : 5;


  const score = Math.round(
    savingsScore +
    spendingScore +
    recurringScore +
    anomalyScore
  );


  const reasons = [
    {
      label: "Savings rate",
      points: savingsScore,
      max: 30,
      positive: savingsRate >= 20
    },
    {
      label: "Discretionary spending",
      points: spendingScore,
      max: 25,
      positive: discretionaryRate < 0.3
    },
    {
      label: "Recurring payments",
      points: recurringScore,
      max: 10,
      positive: recurring.length <= 2
    },
    {
      label: "Transaction patterns",
      points: anomalyScore,
      max: 15,
      positive: anomalies.length <= 2
    }
  ];


  return {
    score,
    income,
    expenses,
    savings,
    savingsRate: Number(savingsRate.toFixed(1)),
    discretionary,
    discretionaryRate: Number(
      (discretionaryRate * 100).toFixed(1)
    ),
    reasons
  };
}


function detectAnomalies(transactions) {

  const expenses = transactions.filter(
    t => t.type === "debit"
  );

  if (expenses.length < 3) {
    return [];
  }


  const amounts = expenses.map(t => t.amount);

  const mean =
    amounts.reduce((a, b) => a + b, 0) /
    amounts.length;


  const variance =
    amounts.reduce(
      (sum, amount) =>
        sum + Math.pow(amount - mean, 2),
      0
    ) / amounts.length;


  const stdDev = Math.sqrt(variance);


  return expenses
    .map(t => ({
      ...t,
      zScore:
        stdDev === 0
          ? 0
          : (t.amount - mean) / stdDev
    }))
    .filter(t => t.zScore > 1.8)
    .sort(
      (a, b) =>
        Math.abs(b.zScore) -
        Math.abs(a.zScore)
    );
}


function detectRecurring(transactions) {

  const groups = {};


  transactions
    .filter(t => t.type === "debit")
    .forEach(t => {

      const key = t.description
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20);


      if (!groups[key]) {
        groups[key] = [];
      }


      groups[key].push(t);
    });


  return Object.values(groups)
    .filter(group => group.length >= 2)
    .map(group => {

      const averageAmount =
        group.reduce(
          (sum, t) => sum + t.amount,
          0
        ) / group.length;


      return {
        merchant: group[0].description,
        occurrences: group.length,
        averageAmount: Math.round(averageAmount),
        annualCost: Math.round(
          averageAmount * 12
        )
      };
    });
}


async function generateInsights(data) {

  const prompt = `
You are FinSight, an AI financial coach.

Analyze this user's financial data.

Income: ₹${data.health.income}
Expenses: ₹${data.health.expenses}
Savings: ₹${data.health.savings}
Savings Rate: ${data.health.savingsRate}%
Financial Health Score: ${data.health.score}/100

Categories:
${JSON.stringify(data.categories)}

Recurring payments:
${JSON.stringify(data.recurring)}

Anomalies:
${JSON.stringify(data.anomalies)}

Give exactly:

1. A one sentence overall assessment.
2. Three important observations.
3. Three practical recommendations.
4. One potential savings opportunity.

Keep everything concise and easy to understand.

Do not provide investment recommendations.
Return ONLY valid JSON.
Do not include explanations.
Do not use markdown.
Do not write "Here are the transactions".
`;


  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });


  return response.text;
}


app.post(
  "/api/analyze",
  upload.single("statement"),
  async (req, res) => {

    try {

      if (!req.file) {
        return res.status(400).json({
          error: "Please upload a PDF statement"
        });
      }


      console.log("Extracting PDF...");

      const text =
        await extractPDFText(req.file.buffer);


      if (!text || text.trim().length < 50) {

        return res.status(400).json({
          error:
            "Could not extract text from this PDF. Scanned PDFs are not supported yet."
        });

      }


      console.log(
        "Extracting transactions..."
      );


      const extracted =
  await extractTransactions(text);

console.log("Extracted Gemini data:");
console.dir(extracted, { depth: null });

const transactions =
  Array.isArray(extracted)
    ? extracted
    : extracted?.transactions;

if (!Array.isArray(transactions)) {

  console.error(
    "Invalid transactions:",
    extracted
  );

  throw new Error(
    "Could not extract transactions from Gemini response."
  );
}

console.log(
  `Successfully extracted ${transactions.length} transactions`
);

const anomalies =
  detectAnomalies(transactions);

const recurring =
  detectRecurring(transactions);


      const categories = {};


      transactions
        .filter(t => t.type === "debit")
        .forEach(t => {

          categories[t.category] =
            (categories[t.category] || 0) +
            t.amount;

        });


      const health =
        calculateHealthScore(
          transactions
        );


      console.log(
        "Generating AI insights..."
      );


      const insights =
        await generateInsights({
          health,
          categories,
          anomalies,
          recurring
        });


      res.json({
        transactions,
        categories,
        anomalies,
        recurring,
        health,
        insights
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        error: "Analysis failed",
        details: error.message
      });

    }
  }
);


app.listen(
  process.env.PORT || 5000,
  () => {
    console.log(
      "FinSight server running on port 5000"
    );
  }
);