import { wipeE2eRows } from "./db"

export default async function globalTeardown() {
  await wipeE2eRows()
}
