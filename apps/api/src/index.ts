import { app } from './app.js'
import { cloudReady, env, loadedEnvFilePath, openaiStatus } from './env.js'

app.listen(env.port, () => {
  const openai = openaiStatus()
  console.log(`JyutTranslate API on http://localhost:${env.port}`)
  console.log(
    `Model: configured=${openai.configured} hasApiKey=${openai.hasApiKey} hasBaseUrl=${openai.hasBaseUrl} model=${openai.model} demo=${!openai.configured}`,
  )
  console.log(`Env file: ${loadedEnvFilePath()}`)
  console.log(`Cloud ready: ${cloudReady()} (openMode=${env.openMode})`)
})
