import logger from "../utils/logger.js";
const database = require("../utils/database");
const { calculateROI, optimizeBudget } = require("../utils/financialUtils");

class SustainExpensesAgent {
  constructor() {
    this.operationalCosts = {
      serverCosts: 0,
      cloudProcessing: 0,
      aiInference: 0,
    };
    this.incomeStreams = [];
  }

  addIncomeStream(name, amount) {
    this.incomeStreams.push({ name, amount });
    logger.info(`Added income stream: ${name} ($${amount})`);
  }

  calculateTotalIncome() {
    const totalIncome = this.incomeStreams.reduce((sum, stream) => sum + stream.amount, 0);
    logger.info(`Total Income: $${totalIncome}`);
    return totalIncome;
  }

  calculateOperationalCosts() {
    const totalCosts =
      this.operationalCosts.serverCosts +
      this.operationalCosts.cloudProcessing +
      this.operationalCosts.aiInference;
    logger.info(`Total Operational Costs: $${totalCosts}`);
    return totalCosts;
  }

  evaluateSustainability() {
    const totalIncome = this.calculateTotalIncome();
    const totalCosts = this.calculateOperationalCosts();
    const sustainability = totalIncome >= totalCosts ? "Sustainable" : "Not Sustainable";

    logger.info(`Sustainability Evaluation: ${sustainability}`);
    return sustainability;
  }

  optimizeExpenses() {
    const optimizedServerCosts = optimizeBudget(this.operationalCosts.serverCosts, 0.1 * this.operationalCosts.serverCosts);
    const optimizedCloudProcessing = optimizeBudget(this.operationalCosts.cloudProcessing, 0.1 * this.operationalCosts.cloudProcessing);

    this.operationalCosts.serverCosts = optimizedServerCosts;
    this.operationalCosts.cloudProcessing = optimizedCloudProcessing;

    logger.info("Optimized Operational Costs:", this.operationalCosts);

    database.insertOperationalCosts(
      this.operationalCosts.serverCosts,
      this.operationalCosts.cloudProcessing,
      this.operationalCosts.aiInference
    );

    return this.operationalCosts;
  }
}

export default SustainExpensesAgent;