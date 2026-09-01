import { useMemo, useState } from "react";
import {
  Upload,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Repeat,
  Search,
  ShieldCheck
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from "recharts";

import "./App.css";


const demoData = {
  health: {
    income: 85000,
    expenses: 51719,
    savings: 33281,
    savingsRate: 39.2,
    discretionary: 28219,
    discretionaryRate: 33.2,
    score: 78,

    reasons: [
      {
        label: "Savings rate",
        points: 30,
        max: 30,
        positive: true
      },
      {
        label: "Discretionary spending",
        points: 12,
        max: 25,
        positive: false
      },
      {
        label: "Recurring payments",
        points: 7,
        max: 10,
        positive: true
      },
      {
        label: "Transaction patterns",
        points: 10,
        max: 15,
        positive: true
      }
    ]
  },

  categories: {
    Shopping: 18500,
    Food: 8450,
    Rent: 22000,
    Transport: 1900,
    Bills: 3200,
    Entertainment: 649
  },

  recurring: [
    {
      merchant: "Netflix",
      occurrences: 3,
      averageAmount: 649,
      annualCost: 7788
    },
    {
      merchant: "Spotify",
      occurrences: 3,
      averageAmount: 119,
      annualCost: 1428
    }
  ],

  anomalies: [
    {
      date: "30/08/2026",
      description: "Large Purchase",
      amount: 18500,
      category: "Shopping",
      zScore: 4.2
    }
  ],

  insights:
    "Your financial position is healthy, with a strong 39.2% savings rate.\n\n1. Shopping is your largest discretionary expense.\n2. You have recurring subscriptions costing approximately ₹768/month.\n3. One unusually large ₹18,500 transaction was detected.\n\nRecommendations:\n• Set a monthly shopping budget.\n• Review recurring subscriptions.\n• Maintain your current savings rate.\n\nPotential savings opportunity: reducing shopping expenditure by 20% could save approximately ₹3,700/month."
};


function App() {

  const [file, setFile] =
    useState(null);

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [whatIf, setWhatIf] =
    useState(20);

  const transactions = data?.transactions || [];

const income = transactions
  .filter((t) => t.type === "credit")
  .reduce((sum, t) => sum + Number(t.amount || 0), 0);

const expenses = transactions
  .filter((t) => t.type === "debit")
  .reduce((sum, t) => sum + Number(t.amount || 0), 0);

const savings = income - expenses;

const savingsRate =
  income > 0 ? Math.round((savings / income) * 100) : 0;


  async function analyzeStatement() {

    if (!file) return;

    setLoading(true);

    const formData =
      new FormData();

    formData.append(
      "statement",
      file
    );


    try {

      const response =
        await fetch(
          "http://localhost:5000/api/analyze",
          {
            method: "POST",
            body: formData
          }
        );


      const result =
        await response.json();


      if (!response.ok) {
        throw new Error(
          result.error
        );
      }


      setData(result);

    } catch (error) {

      alert(error.message);

    } finally {

      setLoading(false);

    }
  }


  function loadDemo() {

    setData(demoData);

  }


  function reset() {

    setData(null);
    setFile(null);
    setSearch("");
    setCategory("All");

  }


  const chartData = useMemo(() => {

    if (!data) return [];

    return Object.entries(
      data.categories
    ).map(
      ([name, value]) => ({
        name,
        value: Math.round(value)
      })
    );

  }, [data]);


  const filteredTransactions =
    useMemo(() => {

      if (!data) return [];

      return data.transactions?.filter(
        transaction => {

          const matchesSearch =
            transaction.description
              .toLowerCase()
              .includes(
                search.toLowerCase()
              );

          const matchesCategory =
            category === "All" ||
            transaction.category ===
              category;

          return (
            matchesSearch &&
            matchesCategory
          );

        }
      ) || [];

    }, [
      data,
      search,
      category
    ]);


  const simulatedSavings =
    data
      ? data.health.discretionary *
        (whatIf / 100)
      : 0;


  const simulatedScore =
    data
      ? Math.min(
          100,
          Math.round(
            data.health.score +
              whatIf / 5
          )
        )
      : 0;


  return (

    <div className="app">

      <header className="navbar">

        <div className="logo">
          <Wallet size={27} />
          <span>FinSight</span>
        </div>

        <div className="nav-right">
          <ShieldCheck size={17} />
          Privacy-first analysis
        </div>

      </header>


      {!data && (

        <section className="landing">

          <div className="hero">

            <div className="badge">
              <Sparkles size={16} />
              AI-Powered Financial Intelligence
            </div>

            <h1>
              Your bank statement
              <br />
              <span>knows your story.</span>
            </h1>

            <p>
              FinSight turns complex financial
              data into clear, actionable insights.
            </p>

          </div>


          <div className="upload-card">

            <Upload size={42} />

            <h2>
              Analyze your statement
            </h2>

            <p>
              Upload a text-based PDF
              bank statement
            </p>


            <input
              type="file"
              accept=".pdf"
              onChange={e =>
                setFile(
                  e.target.files[0]
                )
              }
            />


            {file && (
              <div className="selected-file">
                {file.name}
              </div>
            )}


            <button
              className="primary-button"
              onClick={
                analyzeStatement
              }
              disabled={
                !file || loading
              }
            >

              {loading
                ? "Analyzing..."
                : "Analyze Statement"}

            </button>


            <div className="divider">
              <span>OR</span>
            </div>


            <button
              className="demo-button"
              onClick={loadDemo}
            >
              Try Demo Data
            </button>

          </div>


          <div className="feature-row">

            <div>
              <Sparkles />
              <strong>AI Categorization</strong>
              <span>
                Automatically understand transactions
              </span>
            </div>

            <div>
              <AlertTriangle />
              <strong>Smart Detection</strong>
              <span>
                Find unusual spending patterns
              </span>
            </div>

            <div>
              <TrendingUp />
              <strong>Financial Health</strong>
              <span>
                One explainable score
              </span>
            </div>

          </div>

        </section>

      )}


      {data && (

        <main className="dashboard">

          <div className="dashboard-title">

            <div>
              <h1>
                Financial Overview
              </h1>

              <p>
                Your financial health at a glance
              </p>
            </div>


            <button
              className="secondary-button"
              onClick={reset}
            >
              <RefreshCw size={17} />
              New Analysis
            </button>

          </div>


          {/* TOP CARDS */}

          <section className="stats">

            <div className="stat-card">

              <div className="stat-icon income-icon">
                <TrendingUp />
              </div>

              <span>Income</span>

              <h2>
                ₹{data?.health?.income?.toLocaleString("en-IN") || 0}
              </h2>

            </div>


            <div className="stat-card">

              <div className="stat-icon expense-icon">
                <TrendingDown />
              </div>

              <span>Expenses</span>

              <h2>
                ₹{data.health.expenses.toLocaleString()}
              </h2>

            </div>


            <div className="stat-card">

              <div className="stat-icon">
                <Wallet />
              </div>

              <span>Savings</span>

              <h2>
                ₹{data?.health?.savings || 0}
              </h2>

              <small>
                {data.health.savingsRate}%
                savings rate
              </small>

            </div>


            <div className="stat-card score-stat">

              <span>
                Financial Health
              </span>

              <div className="score">

                <strong>
                  {data.health.score}
                </strong>

                <span>/100</span>

              </div>

              <small>
                {data.health.score >= 70
                  ? "Good financial health"
                  : "Needs attention"}
              </small>

            </div>

          </section>


          {/* CHARTS */}

          <section className="two-column">

            <div className="panel">

              <div className="panel-title">

                <div>
                  <h2>
                    Spending Breakdown
                  </h2>

                  <p>
                    Where your money is going
                  </p>
                </div>

              </div>


              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <PieChart>

                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={105}
                    innerRadius={55}
                    paddingAngle={3}
                    label
                  >

                    {chartData.map(
                      (_, index) => (
                        <Cell
                          key={index}
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip />

                </PieChart>

              </ResponsiveContainer>

            </div>


            {/* HEALTH */}

            <div className="panel">

              <h2>
                Financial Health
              </h2>

              <p className="panel-subtitle">
                Why your score is {data.health.score}/100
              </p>


              <div className="health-score">

                <div className="score-circle">

                  <strong>
                    {data.health.score}
                  </strong>

                  <span>
                    /100
                  </span>

                </div>

                <div>

                  <h3>
                    {data.health.score >= 70
                      ? "Good"
                      : data.health.score >= 50
                      ? "Fair"
                      : "Needs Attention"}
                  </h3>

                  <p>
                    Your score is based on measurable
                    financial indicators.
                  </p>

                </div>

              </div>


              <div className="score-reasons">

                {data.health.reasons.map(
                  (reason, index) => (

                    <div
                      className="reason"
                      key={index}
                    >

                      <span>
                        {reason.positive
                          ? "✓"
                          : "⚠"}
                      </span>

                      <div>

                        <strong>
                          {reason.label}
                        </strong>

                        <div className="progress">

                          <div
                            style={{
                              width:
                                `${(reason.points /
                                  reason.max) *
                                  100}%`
                            }}
                          />

                        </div>

                      </div>

                      <b>
                        {reason.points}/
                        {reason.max}
                      </b>

                    </div>

                  )
                )}

              </div>

            </div>

          </section>


          {/* AI COACH */}

          <section className="panel coach">

            <div className="coach-header">

              <div className="ai-icon">
                <Sparkles />
              </div>

              <div>
                <h2>
                  FinSight AI Coach
                </h2>

                <p>
                  Personalized insights from your transactions
                </p>
              </div>

            </div>


            <div className="insights">

              {data.insights}

            </div>

          </section>


          {/* ANOMALIES + RECURRING */}

          <section className="two-column">

            <div className="panel">

              <h2>
                <AlertTriangle size={21} />
                Unusual Transactions
              </h2>

              <p className="panel-subtitle">
                Transactions that differ from your normal pattern
              </p>


              {data.anomalies.length === 0 ? (

                <div className="empty">
                  ✓ No unusual transactions detected
                </div>

              ) : (

                data.anomalies.map(
                  (item, index) => (

                    <div
                      className="alert-item"
                      key={index}
                    >

                      <div className="alert-icon">
                        ⚠
                      </div>

                      <div>

                        <strong>
                          {item.description}
                        </strong>

                        <p>
                          {item.date} ·{" "}
                          {item.category}
                        </p>

                        <small>
                          {item.zScore.toFixed(1)}×
                          above normal spending pattern
                        </small>

                      </div>

                      <b>
                        ₹{item.amount.toLocaleString()}
                      </b>

                    </div>

                  )
                )

              )}

            </div>


            <div className="panel">

              <h2>
                <Repeat size={21} />
                Recurring Payments
              </h2>

              <p className="panel-subtitle">
                Subscriptions and repeated charges
              </p>


              {data.recurring.map(
                (item, index) => (

                  <div
                    className="subscription"
                    key={index}
                  >

                    <div>

                      <strong>
                        {item.merchant}
                      </strong>

                      <p>
                        {item.occurrences}
                        {" "}occurrences
                      </p>

                    </div>

                    <div className="subscription-cost">

                      <strong>
                        ₹{item.averageAmount}
                        /month
                      </strong>

                      <span>
                        ₹{item.annualCost.toLocaleString()}
                        /year
                      </span>

                    </div>

                  </div>

                )
              )}

            </div>

          </section>


          {/* WHAT IF */}

          <section className="panel simulator">

            <div className="simulator-header">

              <div>

                <div className="badge">
                  Financial Simulator
                </div>

                <h2>
                  What if you reduced discretionary spending?
                </h2>

                <p>
                  See how a small change could affect your savings.
                </p>

              </div>

            </div>


            <div className="slider-area">

              <div className="slider-label">

                <span>
                  Reduce discretionary spending
                </span>

                <strong>
                  {whatIf}%
                </strong>

              </div>

              <input
                type="range"
                min="0"
                max="50"
                value={whatIf}
                onChange={e =>
                  setWhatIf(
                    Number(e.target.value)
                  )
                }
              />

            </div>


            <div className="simulation-results">

              <div>
                <span>
                  Potential monthly savings
                </span>

                <strong>
                  +₹{Math.round(
                    simulatedSavings
                  ).toLocaleString()}
                </strong>
              </div>

              <div>
                <span>
                  Potential annual savings
                </span>

                <strong>
                  +₹{Math.round(
                    simulatedSavings * 12
                  ).toLocaleString()}
                </strong>
              </div>

              <div>
                <span>
                  Projected health score
                </span>

                <strong>
                  {simulatedScore}/100
                </strong>
              </div>

            </div>

          </section>


          {/* TRANSACTIONS */}

          {data.transactions && (

            <section className="panel">

              <div className="transaction-header">

                <div>

                  <h2>
                    Transactions
                  </h2>

                  <p className="panel-subtitle">
                    {filteredTransactions.length}
                    {" "}transactions
                  </p>

                </div>


                <div className="filters">

                  <div className="search">

                    <Search size={17} />

                    <input
                      placeholder="Search..."
                      value={search}
                      onChange={e =>
                        setSearch(
                          e.target.value
                        )
                      }
                    />

                  </div>


                  <select
                    value={category}
                    onChange={e =>
                      setCategory(
                        e.target.value
                      )
                    }
                  >

                    <option>
                      All
                    </option>

                    {[
                      ...new Set(
                        data.transactions.map(
                          t => t.category
                        )
                      )
                    ].map(cat => (
                      <option
                        key={cat}
                      >
                        {cat}
                      </option>
                    ))}

                  </select>

                </div>

              </div>


              <div className="transactions">

                {filteredTransactions.map(
                  (transaction, index) => (

                    <div
                      className="transaction"
                      key={index}
                    >

                      <div>

                        <strong>
                          {transaction.description}
                        </strong>

                        <p>
                          {transaction.date}
                          {" · "}
                          {transaction.category}
                        </p>

                      </div>


                      <strong
                        className={
                          transaction.type ===
                          "credit"
                            ? "income"
                            : "expense"
                        }
                      >

                        {transaction.type ===
                        "credit"
                          ? "+"
                          : "-"}
                        ₹
                        {transaction.amount.toLocaleString()}

                      </strong>

                    </div>

                  )
                )}

              </div>

            </section>

          )}

        </main>

      )}

    </div>
  );
}

export default App;