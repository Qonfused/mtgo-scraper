import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const window = new JSDOM('').window
const { sanitize } = createDOMPurify(window)

export default sanitize
