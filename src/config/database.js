import "dotenv/config";

const database = {
  development: {
    use_env_variable: "POSTGRES_URL",
    dialect: "postgres",
  },
  test: {
    use_env_variable: "POSTGRES_URL",
    dialect: "postgres",
  },
  production: {
    use_env_variable: "POSTGRES_URL",
    dialect: "postgres",
  },
};

export default database;
