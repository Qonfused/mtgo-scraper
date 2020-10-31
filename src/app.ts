import * as admin from 'firebase-admin'
import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import config from './config'
import routes from './routes'

const app = express()

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(config.serviceAccount || '{}')),
  databaseURL: config.databaseURL,
})

app.use(morgan('short'))
app.use(cors())
app.use(express.json())
app.use(helmet())
app.use(routes)

export default app
