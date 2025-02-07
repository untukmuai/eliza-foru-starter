import logger from "../utils/logger.js";
const database = require("../utils/database");
const { generateRecommendations } = require("../services/openaiService");
const {
  calculateROI,
  forecastRevenue,
  optimizeBudget,
} = require("../utils/financialUtils");

class UnderstandMoneyAgent {
  constructor() {
    this.financialData = {
      revenue: 0,
      expenses: 0,
      growthRate: 0.05,
      budget: 0,
    };
  }

  async analyzeFinancialHealth() {
    logger.info("Analyzing financial health...");
    const roi = calculateROI(
      this.financialData.revenue,
      this.financialData.expenses
    );
    const forecastedRevenue = forecastRevenue(
      this.financialData.revenue,
      this.financialData.growthRate,
      12
    );

    logger.info(`Current ROI: ${roi.toFixed(2)}%`);
    logger.info(
      `Forecasted Revenue in 12 Months: $${forecastedRevenue.toFixed(2)}`
    );

    database.insertFinancialData(
      this.financialData.revenue,
      this.financialData.expenses,
      this.financialData.growthRate,
      this.financialData.budget
    );

    return { roi, forecastedRevenue };
  }

  async generateMonetizationStrategy() {
    logger.info("Generating monetization strategy...");

    const prompt = `
      I am an AI agent responsible for optimizing income and monetization strategies.
      Current financial data:
      - Revenue: $${this.financialData.revenue}
      - Expenses: $${this.financialData.expenses}
      - Growth Rate: ${this.financialData.growthRate * 100}%

      Provide actionable recommendations to improve monetization and financial literacy.
    `;

    try {
      const strategy = await generateRecommendations(prompt);
      logger.info(`Monetization Strategy: ${strategy}`);
      return strategy;
    } catch (error) {
      logger.error("Failed to generate monetization strategy:", error.message);
      throw error;
    }
  }

  updateFinancialData(revenue, expenses, budget) {
    this.financialData.revenue = revenue;
    this.financialData.expenses = expenses;
    this.financialData.budget = budget;
    logger.info("Updated financial data:", this.financialData);
  }

  optimizeBudget() {
    const optimizedBudget = optimizeBudget(
      this.financialData.budget,
      this.financialData.expenses
    );
    logger.info(`Optimized Budget: $${optimizedBudget}`);
    return optimizedBudget;
  }
}

export default UnderstandMoneyAgent;
