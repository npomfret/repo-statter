import { handleCLI } from './cli/handler.js'

const args = process.argv.slice(2)
handleCLI(args).catch(error => {
  console.error('Error:', error.message)
  process.exit(1)
})