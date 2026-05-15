import { wipeE2eRows } from "./db"

export default async function globalSetup() {
  await wipeE2eRows()
}
