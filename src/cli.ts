import { handleCLI } from './cli/handler.js'
import { isRepoStatError, formatError } from './utils/errors.js'

const args = process.argv.slice(2)
handleCLI(args).catch(error => {
  if (isRepoStatError(error)) {
    console.error('Error:', error.message)
    if (error.code) {
      console.error('Error code:', error.code)
    }
  } else {
    console.error('Unexpected error:', formatError(error))
  }
  process.exit(1)
})