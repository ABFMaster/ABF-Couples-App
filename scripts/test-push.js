import dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`
const userId = 'fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870'

console.log('POST', url)
console.log('userId:', userId)

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.CRON_SECRET}`,
  },
  body: JSON.stringify({
    userId,
    title: 'Test Push',
    body: 'Did this land?',
    url: '/dashboard',
  }),
})

const data = await res.json()
console.log('status:', res.status)
console.log('response:', JSON.stringify(data, null, 2))
