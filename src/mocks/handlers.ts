import { delay, http, HttpResponse } from 'msw'
import { dashboardMock } from '@/mocks/data/dashboard'

export const handlers = [
  http.get('*/dashboard/summary', async () => {
    await delay(280)
    return HttpResponse.json(dashboardMock)
  }),
]
