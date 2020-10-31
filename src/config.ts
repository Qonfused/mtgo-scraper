import dotenv from 'dotenv'

dotenv.config()

const config = {
  serviceAccount: process.env.serviceAccount,
  databaseURL: process.env.databaseURL,
  secret: process.env.SESSION_SECRET || 'default secret',
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8080,
}

export default config
