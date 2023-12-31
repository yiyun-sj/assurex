import moment from 'moment'
import 'mysql2'
import { ResultSetHeader, createConnection } from 'mysql2/promise'
import { NextApiRequest, NextApiResponse } from 'next'
interface ReqData {
  email: string
  date: string
  name: string
  principal: number
  base: number
  interest: number
  installments: number
}

interface ResData {
  id: number
  email: string
  name: string
  date: string
  principal: number
  interest: number
}

async function dbQuery({
  email,
  name,
  date,
  principal,
  base,
  interest,
  installments,
}: ReqData) {
  const connection = await createConnection(process.env.DATABASE_URL)
  const [hdr] = await connection.query(
    'INSERT INTO `plans` (email, name, date, principal, interest) VALUES ?',
    [[[email, name, moment(date).toDate(), principal, interest]]]
  )
  let values = []
  for (let i = 0; i < installments; i++) {
    values.push([
      (hdr as ResultSetHeader).insertId,
      email,
      moment(date).add(i, 'M').format('YYYY-MM-DD'),
      base,
      base,
      0,
    ])
  }
  await connection.query(
    'INSERT INTO `invoices` (pid, email, due, amnt_due, total, fulfilled) VALUES ?',
    [values]
  )
  connection.end()
  return {
    id: (hdr as ResultSetHeader).insertId,
    email,
    name,
    date: moment(date).format('YYYY-MM-DD'),
    principal,
    interest,
  }
}

function isToday(date: Date) {
  const today = new Date()
  return (
    date.getDate() == today.getDate() &&
    date.getMonth() == today.getMonth() &&
    date.getFullYear() == today.getFullYear()
  )
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResData | string>
) {
  const { method, body } = req
  const { date } = body as ReqData
  if (!isToday(moment(date).toDate())) {
    res.status(400).end(`Date ${date} has expired`)
    return
  }
  switch (method) {
    case 'OPTIONS':
      res.status(200).send('ok')
      break
    case 'POST':
      dbQuery(body).then((data) => {
        res.status(200).json(data)
      })
      break
    default:
      res.setHeader('Allow', ['POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
      break
  }
}
